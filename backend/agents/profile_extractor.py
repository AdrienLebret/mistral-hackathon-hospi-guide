"""
Profile Extractor — collects transcripts, compiles patient record.

Uses a context-aware parser that reads the assistant's questions to determine
which section each patient answer belongs to.  Falls forward to an LLM call
via Bedrock when the daily token quota is available.  Instant when it's not.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import TYPE_CHECKING

import boto3

from strands.experimental.bidi.types.events import (
    BidiOutputEvent,
    BidiTranscriptStreamEvent,
)
from strands.experimental.bidi.types.io import BidiOutput

if TYPE_CHECKING:
    from strands.experimental.bidi.agent.agent import BidiAgent

logger = logging.getLogger(__name__)

CLINICAL_PROMPT_PATH = Path(__file__).parent / "prompts" / "clinical.md"

MODELS = [
    "amazon.nova-lite-v1:0",
    "amazon.nova-micro-v1:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
]

# Keywords in assistant questions that identify which section the NEXT
# patient answer belongs to.  Order doesn't matter — we match on context.
SECTION_PATTERNS: list[tuple[str, list[str]]] = [
    ("name", ["your name", "what is your name", "may i have your name"]),
    ("chief_complaint", ["what brings you", "why are you here", "how can i help", "what happened"]),
    ("onset", ["when did", "how long", "start", "sudden", "gradual", "began"]),
    ("region", ["where exactly", "where do you feel", "location", "radiate", "spread"]),
    ("severity", ["scale", "0 to 10", "rate the", "how bad", "intensity", "how severe"]),
    ("timing", ["constant", "come and go", "intermittent", "comes and goes"]),
    # IMPORTANT: allergies BEFORE history_meds — the allergies question contains
    # "medications" which would otherwise match history_meds first
    ("allergies", ["allerg"]),
    ("history_meds", ["medical condition", "past surger", "medication", "medical history", "take regularly"]),
    ("close", ["compiled", "nurse will", "thank you", "forwarding"]),
]

# Red flag keywords in patient speech
RED_FLAG_KEYWORDS: dict[str, list[str]] = {
    "chest_pain_with_dyspnea_and_diaphoresis": ["chest pain", "can't breathe", "sweating"],
    "sudden_neurological_deficit": ["can't speak", "can't see", "face drooping", "numb"],
    "signs_of_shock": ["dizzy", "faint", "passed out", "cold sweat"],
    "severe_hemorrhage": ["bleeding heavily", "won't stop bleeding", "blood everywhere"],
    "altered_consciousness": ["confused", "blacked out", "lost consciousness"],
    "severe_allergic_reaction_airway": ["throat closing", "swelling", "can't swallow"],
    "thunderclap_headache": ["worst headache", "sudden headache", "thunderclap"],
}

NEGATIVE_ANSWERS = frozenset([
    "no", "none", "no.", "none.", "nope", "nothing", "nah",
    "not that i know of", "not really", "i don't think so",
    "no i don't", "no allergies", "no known allergies",
    "none that i know of", "i'm not on any", "no medications",
    "no medical conditions", "no surgeries", "nothing i know of",
])


def _classify_assistant_question(text: str) -> str:
    """Identify which section an assistant turn is asking about."""
    lower = text.lower()
    for section, keywords in SECTION_PATTERNS:
        if any(kw in lower for kw in keywords):
            return section
    return "unknown"


def _extract_severity(text: str) -> int:
    """Try to extract a 0-10 severity number from text."""
    # Match patterns like "8", "about 8", "an 8", "8 out of 10"
    m = re.search(r'\b(\d{1,2})\s*(?:out of\s*10)?', text)
    if m:
        val = int(m.group(1))
        if 0 <= val <= 10:
            return val
    # Word numbers
    word_map = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
                "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
    for word, num in word_map.items():
        if word in text.lower():
            return num
    return 0


def _is_negative(text: str) -> bool:
    """Check if patient response is a negative/none answer."""
    return text.lower().strip().rstrip(".!") in NEGATIVE_ANSWERS


def _detect_red_flags(all_patient_text: str) -> list[str]:
    """Scan all patient text for red flag keywords."""
    lower = all_patient_text.lower()
    flags = []
    for flag_id, keywords in RED_FLAG_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            flags.append(flag_id)
    return flags


def _estimate_ccmu(severity: int, red_flags: list[str], chief_complaint: str) -> tuple[str, str]:
    """Basic CCMU estimation from extracted data."""
    lower_complaint = chief_complaint.lower()

    # CCMU 5: immediate life threat
    life_threat_flags = {"severe_hemorrhage", "altered_consciousness", "signs_of_shock"}
    if red_flags and any(f in life_threat_flags for f in red_flags):
        return "5", f"Life-threatening indicators detected: {', '.join(red_flags)}"

    # CCMU 4: red flags present
    if red_flags:
        return "4", f"Red flags present: {', '.join(red_flags)}. Requires urgent assessment."

    # CCMU 3: high severity or concerning symptoms
    concerning = ["breathing", "breath", "chest", "head", "abdomen", "abdominal"]
    if severity >= 7 or any(w in lower_complaint for w in concerning):
        reason = []
        if severity >= 7:
            reason.append(f"high severity ({severity}/10)")
        if any(w in lower_complaint for w in concerning):
            reason.append("concerning symptom location")
        return "3", f"Condition may deteriorate: {', '.join(reason)}."

    # CCMU 2: moderate
    if severity >= 4:
        return "2", f"Stable condition with moderate severity ({severity}/10). Diagnostic decision needed."

    # CCMU 1: mild
    return "1", f"Stable condition, low severity ({severity}/10). Non-urgent."


def _smart_parse(transcript_text: str) -> dict:
    """Context-aware parser that reads assistant questions to categorize patient answers.

    Instead of blind positional mapping, looks at WHAT the assistant asked
    to determine WHERE each patient response belongs in the profile.
    """
    # Build list of (role, text) turns
    turns: list[tuple[str, str]] = []
    for line in transcript_text.strip().split("\n"):
        line = line.strip()
        if line.startswith("Assistant:"):
            turns.append(("assistant", line[len("Assistant:"):].strip()))
        elif line.startswith("Patient:"):
            turns.append(("patient", line[len("Patient:"):].strip()))

    # Walk through turns: classify each assistant question, then assign
    # the next patient answer to that section
    current_section = "name"  # first question is always name
    sections: dict[str, list[str]] = {
        "name": [], "chief_complaint": [], "onset": [], "region": [],
        "severity": [], "timing": [], "history_meds": [], "allergies": [],
        "unknown": [],
    }

    for role, text in turns:
        if role == "assistant":
            detected = _classify_assistant_question(text)
            if detected != "unknown" and detected != "close":
                current_section = detected
        elif role == "patient":
            sections[current_section].append(text)

    # --- Extract name ---
    # The name section might contain "bonjour" or greetings before actual name
    raw_name_parts = sections["name"]
    name = ""
    for part in raw_name_parts:
        # Skip pure greetings
        lower = part.lower().strip().rstrip(".,!")
        if lower in ("bonjour", "hello", "hi", "hey", "good morning", "good afternoon"):
            continue
        # Extract "my name is X" pattern
        m = re.search(r"(?:my name is|i'm|i am|it's|call me)\s+(.+)", part, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(".,!")
            break
        # If it's not a greeting and has letters, use it as name
        if re.search(r"[a-zA-Z]", part) and len(part) > 1:
            name = part.strip().rstrip(".,!")

    # --- Extract chief complaint ---
    chief_complaint = " ".join(sections["chief_complaint"]).strip()

    # --- OPQRST fields ---
    onset = " ".join(sections["onset"]).strip()
    region = " ".join(sections["region"]).strip()
    timing = " ".join(sections["timing"]).strip()

    # Severity: extract number
    severity_text = " ".join(sections["severity"])
    severity = _extract_severity(severity_text) if severity_text else 0
    # Also check chief complaint for severity clues
    if severity == 0 and chief_complaint:
        severity = _extract_severity(chief_complaint)

    # --- History & Medications ---
    history_meds_text = " ".join(sections["history_meds"]).strip()
    medical_history: list[str] = []
    current_medications: list[str] = []

    if history_meds_text and not _is_negative(history_meds_text):
        # Try to separate medications from conditions
        # Look for "and I take X" or "I'm taking X" patterns
        med_match = re.search(
            r"(?:i take|i'm taking|taking|and take)\s+(.+)",
            history_meds_text, re.IGNORECASE,
        )
        if med_match:
            med_part = med_match.group(1).strip().rstrip(".,!")
            # Split by commas or "and"
            meds = re.split(r",\s*|\s+and\s+", med_part)
            current_medications = [m.strip().rstrip(".,!") for m in meds if m.strip()]
            # Everything before the medication mention is medical history
            hist_part = history_meds_text[:med_match.start()].strip()
            # Clean trailing "and", "and I", commas
            hist_part = re.sub(r"\s+and\s*$", "", hist_part, flags=re.IGNORECASE).strip().rstrip(".,!")
            if hist_part and not _is_negative(hist_part):
                medical_history = [hist_part]
        else:
            medical_history = [history_meds_text]

    # --- Allergies ---
    allergies_text = " ".join(sections["allergies"]).strip()
    allergies: list[str] = []
    if allergies_text and not _is_negative(allergies_text):
        # Split by commas or "and"
        parts = re.split(r",\s*|\s+and\s+", allergies_text)
        allergies = [a.strip().rstrip(".,!") for a in parts if a.strip()]

    # --- Red flags ---
    all_patient_text = " ".join(text for _, text in turns if _ == "patient")
    red_flags = _detect_red_flags(all_patient_text)

    # --- CCMU ---
    ccmu, ccmu_reasoning = _estimate_ccmu(severity, red_flags, chief_complaint)

    # --- Quality: infer from chief complaint ---
    quality = chief_complaint  # use the complaint itself as quality descriptor

    result = {
        "identity": {
            "fullName": name,
            "dateOfBirth": "",
            "sex": "",
        },
        "clinical": {
            "chiefComplaint": chief_complaint,
            "symptomAssessment": {
                "onset": onset,
                "provocation": "",
                "quality": quality,
                "region": region,
                "severity": severity,
                "timing": timing,
            },
            "medicalHistory": medical_history,
            "currentMedications": current_medications,
            "allergies": allergies,
            "redFlags": red_flags,
            "suggestedCcmu": ccmu,
            "ccmuReasoning": ccmu_reasoning,
        },
    }

    logger.info(
        "Smart parse: name=%s, complaint=%s, ccmu=%s, red_flags=%s",
        name[:30], chief_complaint[:40], ccmu, red_flags,
    )
    return result


# ---------------------------------------------------------------------------
# LLM compilation (used when Bedrock quota is available)
# ---------------------------------------------------------------------------


def _call_bedrock(transcript_text: str) -> dict | None:
    """Try LLM extraction via Bedrock. Returns None if throttled or fails."""
    region = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
    client = boto3.client("bedrock-runtime", region_name=region)
    system_prompt = CLINICAL_PROMPT_PATH.read_text(encoding="utf-8")

    for model_id in MODELS:
        try:
            logger.info("Trying Bedrock model %s", model_id)
            response = client.converse(
                modelId=model_id,
                system=[{"text": system_prompt}],
                messages=[{"role": "user", "content": [{"text": transcript_text}]}],
                inferenceConfig={"maxTokens": 2048, "temperature": 0.0},
            )
            raw = response["output"]["message"]["content"][0]["text"]
            stripped = re.sub(r"^```(?:json)?\s*\n?", "", raw, flags=re.MULTILINE)
            stripped = re.sub(r"\n?```\s*$", "", stripped, flags=re.MULTILINE).strip()
            parsed = json.loads(stripped)
            logger.info("Bedrock model %s returned valid JSON", model_id)
            return parsed
        except client.exceptions.ThrottlingException:
            logger.warning("Throttled on %s — trying next", model_id)
            continue
        except json.JSONDecodeError as exc:
            logger.error("Bad JSON from %s: %s", model_id, exc)
            return None
        except Exception as exc:
            logger.warning("Error on %s: %s — trying next", model_id, exc)
            continue

    logger.warning("All Bedrock models throttled/failed")
    return None


def _map_llm_to_frontend(llm_result: dict, name: str) -> dict:
    """Map LLM clinical.md JSON output to frontend structure."""
    opqrst = llm_result.get("opqrst", {})
    return {
        "identity": {"fullName": name, "dateOfBirth": "", "sex": ""},
        "clinical": {
            "chiefComplaint": llm_result.get("chief_complaint", ""),
            "symptomAssessment": {
                "onset": opqrst.get("onset", ""),
                "provocation": opqrst.get("provocation", ""),
                "quality": opqrst.get("quality", ""),
                "region": opqrst.get("region", ""),
                "severity": opqrst.get("severity", 0),
                "timing": opqrst.get("timing", ""),
            },
            "medicalHistory": llm_result.get("medical_history", []),
            "currentMedications": llm_result.get("medications", []),
            "allergies": llm_result.get("allergies", []),
            "redFlags": llm_result.get("red_flags", []),
            "suggestedCcmu": llm_result.get("suggested_ccmu", "2"),
            "ccmuReasoning": llm_result.get("ccmu_reasoning", ""),
        },
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def run_final_compilation(transcript_text: str) -> dict:
    """Compile the patient profile from the full conversation transcript.

    Strategy:
      1. Try LLM extraction via Bedrock (best quality).
      2. If throttled / fails → smart context-aware Python parser (instant).
    """
    logger.info("Final compilation: starting")

    # Extract name for LLM path
    name = ""
    for line in transcript_text.strip().split("\n"):
        line = line.strip()
        if line.startswith("Patient:"):
            name = line[len("Patient:"):].strip()
            break

    # Try LLM first
    llm_result = _call_bedrock(transcript_text)
    if llm_result is not None:
        logger.info("Final compilation: done via Bedrock LLM")
        return _map_llm_to_frontend(llm_result, name)

    # Smart Python parser — instant, context-aware
    logger.info("Final compilation: using smart parser (Bedrock unavailable)")
    return _smart_parse(transcript_text)


# ---------------------------------------------------------------------------
# BidiOutput — collects transcripts during conversation
# ---------------------------------------------------------------------------


class ProfileExtractorOutput(BidiOutput):
    """Collects transcripts during conversation. No API calls."""

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
        if not isinstance(event, BidiTranscriptStreamEvent):
            return
        if not event.is_final:
            return

        text = event.current_transcript or event.text
        if not text or not text.strip():
            return

        self._transcripts.append({"role": event.role, "text": text})
