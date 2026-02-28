"""
Summarize Transcript Tool

Uses Mistral Large to analyze a conversation transcript and produce
a structured patient summary JSON for the validation screen.

This tool is called by the ConnectionManager at session end to build
the patient-facing summary from the actual conversation content.
"""

from __future__ import annotations

import json
import logging
import os

from strands import Agent
from strands.models import BedrockModel

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a medical transcript summarizer. You receive a conversation transcript between a triage assistant and a patient at an emergency department.

Your job is to extract ONLY factual, patient-declared information and return it as a structured JSON object.

## Output Format

Return ONLY a valid JSON object with these exact fields:

```json
{
  "patient_chief_complaint": "A concise 1-2 sentence TLDR of why the patient came to the ER",
  "declared_symptoms": ["symptom 1", "symptom 2"],
  "medical_history": ["condition 1", "condition 2"],
  "medications": ["medication 1", "medication 2"],
  "allergies": ["allergy 1", "allergy 2"]
}
```

## Rules

- For patient_chief_complaint: Write a concise summary (1-2 sentences max) of the main reason the patient came. Example: "Severe chest pain radiating to left arm, started 3 hours ago after climbing stairs."
- Extract ONLY what the patient explicitly said. Do not infer or add information.
- Use the patient's own words when possible, but clean up for clarity.
- If a field was not discussed, use an empty array [] or empty string "".
- Do NOT include any clinical assessment, CCMU levels, red flags, or medical reasoning.
- Do NOT include the assistant's questions or analysis.
- Do NOT include greetings like "good evening" or "hello" as the chief complaint.
- Return ONLY the JSON object, no markdown, no explanation, no code blocks.
"""


def _make_model() -> BedrockModel:
    return BedrockModel(
        model_id=os.getenv("BEDROCK_MODEL_ID", "mistral.mistral-large-3-675b-instruct"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        temperature=0.1,
    )


def summarize_transcript(transcripts: list[dict]) -> dict:
    """Summarize a conversation transcript into a structured patient summary.

    Args:
        transcripts: List of {"role": "agent"|"user", "text": "..."} dicts.

    Returns:
        A dict with patient_chief_complaint, declared_symptoms,
        medical_history, medications, allergies.
    """
    if not transcripts:
        return _empty_summary()

    # Build readable transcript
    lines = []
    for msg in transcripts:
        role = "Patient" if msg.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {msg.get('text', '')}")
    transcript_text = "\n".join(lines)

    try:
        logger.info("📋 Summarizing transcript (%d messages)", len(transcripts))

        agent = Agent(
            model=_make_model(),
            system_prompt=SYSTEM_PROMPT,
        )

        response = agent(
            f"Here is the conversation transcript to summarize:\n\n{transcript_text}\n\n"
            f"Extract the patient summary as JSON."
        )

        raw = str(response)

        # Try to parse JSON from the response
        try:
            parsed = json.loads(raw)
            logger.info("✅ Transcript summary complete")
            return parsed
        except (json.JSONDecodeError, ValueError):
            # Try to extract JSON from markdown code blocks
            if "```" in raw:
                json_block = raw.split("```")[1]
                if json_block.startswith("json"):
                    json_block = json_block[4:]
                parsed = json.loads(json_block.strip())
                logger.info(
                    "✅ Transcript summary complete (extracted from code block)"
                )
                return parsed

            logger.warning("⚠️ Summary agent returned non-JSON: %s", raw[:200])
            return _empty_summary()

    except Exception as exc:
        logger.error("❌ Transcript summary failure: %s", exc)
        return _empty_summary()


def _empty_summary() -> dict:
    return {
        "patient_chief_complaint": "",
        "declared_symptoms": [],
        "medical_history": [],
        "medications": [],
        "allergies": [],
    }
