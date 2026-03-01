"""
Profile Extractor — collects transcripts during conversation, compiles once at end.

The BidiOutput collects transcripts only (NO live API calls).
After the voice session ends, ``run_final_compilation`` makes ONE single
API call to extract the full patient record from the transcript.

This avoids burning API rate limits during conversation.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import TYPE_CHECKING

import boto3
from botocore.exceptions import ClientError

from strands.experimental.bidi.types.events import (
    BidiOutputEvent,
    BidiTranscriptStreamEvent,
)
from strands.experimental.bidi.types.io import BidiOutput

if TYPE_CHECKING:
    from strands.experimental.bidi.agent.agent import BidiAgent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model fallback chain — try fastest first, fall back through the list
# ---------------------------------------------------------------------------

MODEL_CHAIN = [
    os.getenv("EXTRACTION_MODEL_ID", "mistral.mistral-small-2402-v1:0"),
    "mistral.ministral-3-8b-instruct",
    "mistral.ministral-3-3b-instruct",
    "mistral.magistral-small-2509",
    "mistral.mistral-large-3-675b-instruct",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "us.amazon.nova-lite-v1:0",
    "amazon.nova-micro-v1:0",
]

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# ---------------------------------------------------------------------------
# Compilation prompt — compact, returns full patient record
# ---------------------------------------------------------------------------

COMPILATION_PROMPT = """\
Extract ALL patient data from this triage conversation into a JSON object.

Return ONLY this JSON structure (no markdown, no explanation):
{"identity":{"fullName":"","dateOfBirth":"","sex":""},"clinical":{"chiefComplaint":"","symptomAssessment":{"onset":"","provocation":"","quality":"","region":"","severity":0,"timing":""},"medicalHistory":[],"currentMedications":[],"allergies":[],"redFlags":[],"suggestedCcmu":"2","ccmuReasoning":""}}

Rules:
- Fill all fields. Use "" for unknown strings, [] for unknown arrays, 0 for unknown severity.
- severity: number 0-10.
- "none"/"no" → empty array.
- redFlags: concerning symptoms (chest pain radiating, severe headache, breathing difficulty). [] if none.
- suggestedCcmu: 5=death risk, 4=life-threatening, P=psych, 3=unstable, 2=stable needs decision, 1=stable.
- JSON only. No markdown fences."""


# ---------------------------------------------------------------------------
# Direct boto3 converse — with retry + model fallback
# ---------------------------------------------------------------------------

_bedrock_client = None


def _get_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=AWS_REGION,
        )
    return _bedrock_client


def _converse(model_id: str, system_prompt: str, user_message: str) -> str | None:
    """Single converse() call. Returns text or None on failure."""
    client = _get_client()
    t0 = time.time()
    response = client.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_message}]}],
        inferenceConfig={"temperature": 0.1, "maxTokens": 1024},
    )
    elapsed = time.time() - t0
    logger.info("converse() OK in %.1fs (model=%s)", elapsed, model_id)

    output = response.get("output", {})
    message = output.get("message", {})
    content = message.get("content", [])
    if content and "text" in content[0]:
        return content[0]["text"]
    return None


def _converse_with_fallback(system_prompt: str, user_message: str) -> str | None:
    """Try models in the fallback chain until one works."""
    for model_id in MODEL_CHAIN:
        try:
            return _converse(model_id, system_prompt, user_message)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            logger.warning("Model %s failed (%s), trying next...", model_id, code)
            if code not in ("ThrottlingException", "ResourceNotFoundException", "ValidationException"):
                raise  # unexpected error — don't swallow
        except Exception as exc:
            logger.warning("Model %s failed (%s), trying next...", model_id, type(exc).__name__)
    logger.error("ALL models in fallback chain failed!")
    return None


def _parse_json(raw: str | None) -> dict | None:
    """Parse JSON from model output, handling markdown fences."""
    if not raw:
        return None
    text = raw.strip()
    if "```" in text:
        text = text.split("```json")[-1].split("```")[0].strip()
    if text.startswith("```"):
        text = text.lstrip("`").strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("JSON parse failed: %s — raw: %s", exc, text[:200])
        return None


# ---------------------------------------------------------------------------
# Public: final compilation — ONE call after conversation ends
# ---------------------------------------------------------------------------


def run_final_compilation(transcript_text: str) -> dict | None:
    """Process the FULL transcript in a single API call.

    Tries models in the fallback chain until one responds.
    Returns a dict with 'identity' and 'clinical' keys.
    """
    logger.info("Final compilation: starting (chain: %s)", MODEL_CHAIN[0])
    t0 = time.time()
    raw = _converse_with_fallback(
        COMPILATION_PROMPT,
        f"Conversation:\n\n{transcript_text}",
    )
    result = _parse_json(raw)
    elapsed = time.time() - t0
    if result:
        logger.info("Final compilation: done in %.1fs — keys: %s", elapsed, list(result.keys()))
    else:
        logger.error("Final compilation: failed after %.1fs", elapsed)
    return result


# ---------------------------------------------------------------------------
# BidiOutput — ONLY collects transcripts, NO API calls during conversation
# ---------------------------------------------------------------------------


class ProfileExtractorOutput(BidiOutput):
    """Collects transcripts during conversation. No live API calls."""

    def __init__(self, websocket=None) -> None:
        self._transcripts: list[dict[str, str]] = []

    async def start(self, agent: BidiAgent) -> None:
        self._transcripts = []

    async def stop(self) -> None:
        pass

    def get_transcripts(self) -> list[dict[str, str]]:
        """Return collected transcripts for final compilation."""
        return list(self._transcripts)

    async def __call__(self, event: BidiOutputEvent) -> None:
        # Only collect final transcripts — no API calls at all
        if not isinstance(event, BidiTranscriptStreamEvent):
            return
        if not event.is_final:
            return

        text = event.current_transcript or event.text
        if not text or not text.strip():
            return

        self._transcripts.append({"role": event.role, "text": text})
