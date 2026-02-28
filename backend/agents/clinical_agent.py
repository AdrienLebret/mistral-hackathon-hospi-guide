"""
Agent 1 — Clinical Pre-Assessment Tool

Strands SDK agent that conducts a structured clinical pre-assessment
using the OPQRST framework and returns a JSON report with a suggested
CCMU classification for the coordinating nurse.

Usage as a @tool for the Orchestrator Agent:
    from agents.clinical_agent import clinical_assessment
    orchestrator = Agent(tools=[clinical_assessment, ...])
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import logging

from strands import Agent, tool
from strands.models import BedrockModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROMPT_PATH = Path(__file__).parent / "prompts" / "clinical.md"

REQUIRED_FIELDS = {
    "chief_complaint",
    "opqrst",
    "red_flags",
    "medical_history",
    "medications",
    "allergies",
    "suggested_ccmu",
    "ccmu_reasoning",
    "is_urgent",
}


def _load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _make_model() -> BedrockModel:
    return BedrockModel(
        model_id=os.getenv("BEDROCK_MODEL_ID", "mistral.mistral-large-3-675b-instruct"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        temperature=0.2,
    )


# ---------------------------------------------------------------------------
# Public tool — this is what the Orchestrator Agent calls
# ---------------------------------------------------------------------------


@tool
def clinical_assessment(patient_context: str) -> str:
    """Conduct a structured clinical pre-assessment using the OPQRST framework.

    Analyses the patient conversation context to extract and structure clinical
    information, screen for red flag indicators, and suggest a CCMU
    classification level for the coordinating nurse.

    Args:
        patient_context: Conversation transcript with patient symptoms,
            medical history, medications, allergies, and any other relevant
            clinical information collected during the voice intake.

    Returns:
        A JSON string with chief_complaint, opqrst, red_flags,
        medical_history, medications, allergies, suggested_ccmu,
        ccmu_reasoning, and is_urgent.
    """
    try:
        logger.info("=" * 60)
        logger.info("🏥 CLINICAL AGENT CALLED")
        logger.info("=" * 60)
        logger.info("Patient context received:\n%s", patient_context[:500])

        agent = Agent(
            model=_make_model(),
            system_prompt=_load_prompt(),
        )

        response = agent(
            f"Voici le contexte patient à évaluer cliniquement :\n\n"
            f"{patient_context}\n\n"
            f"Analyse ce contexte et retourne le JSON d'évaluation clinique."
        )

        raw = str(response)

        # Validate that the response is valid JSON
        try:
            parsed = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            logger.warning("⚠️  Clinical agent returned non-JSON output, using fallback")
            return json.dumps(
                {
                    "error": "Agent output is not valid JSON",
                    "raw_output": raw,
                    "chief_complaint": "Erreur d'analyse",
                    "opqrst": {
                        "onset": "Non renseigné",
                        "provocation": "Non renseigné",
                        "quality": "Non renseigné",
                        "region": "Non renseigné",
                        "severity": 0,
                        "timing": "Non renseigné",
                    },
                    "medical_history": [],
                    "medications": [],
                    "allergies": [],
                    "red_flags": [],
                    "suggested_ccmu": "3",
                    "ccmu_reasoning": "Évaluation clinique échouée — classification prudente par défaut",
                    "is_urgent": False,
                },
                ensure_ascii=False,
            )

        # If valid JSON, return as-is
        logger.info(
            "✅ Clinical assessment complete — CCMU suggestion: %s",
            parsed.get("suggested_ccmu", "?"),
        )
        logger.info("   Red flags: %s", parsed.get("red_flags", []))
        logger.info("   Is urgent: %s", parsed.get("is_urgent", False))
        return (
            raw if isinstance(parsed, dict) else json.dumps(parsed, ensure_ascii=False)
        )

    except Exception as exc:
        logger.error("❌ Clinical agent failure: %s", exc)
        return json.dumps(
            {
                "error": f"Clinical agent failure: {exc}",
                "chief_complaint": "Erreur d'évaluation",
                "opqrst": {
                    "onset": "Non renseigné",
                    "provocation": "Non renseigné",
                    "quality": "Non renseigné",
                    "region": "Non renseigné",
                    "severity": 0,
                    "timing": "Non renseigné",
                },
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "red_flags": [],
                "suggested_ccmu": "3",
                "ccmu_reasoning": "Évaluation clinique échouée — classification prudente par défaut",
                "is_urgent": False,
            },
            ensure_ascii=False,
        )


# ---------------------------------------------------------------------------
# Standalone execution for quick testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_context = """
    Patient: Homme, 67 ans, département 75 (Paris)
    Motif de consultation: Douleur thoracique depuis ce matin, irradiant vers le bras gauche
    Symptômes associés: Essoufflement, sueurs
    Antécédents: Hypertension artérielle, diabète type 2
    Médicaments actuels: Metformine 1000mg, Amlodipine 5mg
    Allergies: Aucune connue
    """
    print("=" * 60)
    print("Agent 1 — Clinical Pre-Assessment")
    print("=" * 60)
    result = clinical_assessment(patient_context=test_context)
    print(result)
