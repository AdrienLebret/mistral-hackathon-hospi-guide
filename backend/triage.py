"""
Triage helpers — CCMU classification and triage document compilation.

Provides deterministic logic for classifying patients according to the
CCMU scale and for assembling the final nurse-facing triage document
from clinical assessment and DataGouv enrichment data.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Immediate-death-risk red flag identifiers
# ---------------------------------------------------------------------------
# If *any* red flag in the patient's list matches one of these, the
# classification jumps straight to CCMU 5 (immediate life threat).
# All other non-empty red flags map to CCMU 4 (life-threatening prognosis).
# These identifiers match the red flag table in clinical.md.

IMMEDIATE_DEATH_RISK_FLAGS: frozenset[str] = frozenset(
    {
        "signs_of_shock",
        "severe_hemorrhage",
        "altered_consciousness",
        "severe_allergic_reaction_airway",
    }
)


# ---------------------------------------------------------------------------
# CCMU classification
# ---------------------------------------------------------------------------


def classify_ccmu(
    red_flags: list[str],
    psychiatric_indicators: bool,
    is_unstable: bool,
    needs_decision: bool,
) -> str:
    """Apply the CCMU decision rules and return the recommended level.

    Decision tree (evaluated top-to-bottom, first match wins):
        1. red_flags with immediate-death-risk identifiers → ``"5"``
        2. red_flags present (no immediate death risk)     → ``"4"``
        3. psychiatric indicators                          → ``"P"``
        4. unstable without life threat                    → ``"3"``
        5. stable, requires diagnostic/therapeutic decision→ ``"2"``
        6. stable, no action needed                        → ``"1"``

    Args:
        red_flags: List of red-flag identifier strings from the clinical
            assessment (may be empty).
        psychiatric_indicators: ``True`` when the patient presents
            psychiatric emergency indicators.
        is_unstable: ``True`` when the patient is clinically unstable
            but without confirmed life threat.
        needs_decision: ``True`` when the patient is stable but requires
            a diagnostic or therapeutic decision.

    Returns:
        A CCMU level string: one of ``"1"``, ``"2"``, ``"3"``, ``"4"``,
        ``"5"``, or ``"P"``.
    """
    if red_flags:
        if any(flag in IMMEDIATE_DEATH_RISK_FLAGS for flag in red_flags):
            return "5"
        return "4"

    if psychiatric_indicators:
        return "P"

    if is_unstable:
        return "3"

    if needs_decision:
        return "2"

    return "1"


# ---------------------------------------------------------------------------
# Triage document compilation
# ---------------------------------------------------------------------------


def compile_triage_document(
    clinical_data: dict,
    datagouv_data: dict | None,
) -> str:
    """Merge clinical assessment and DataGouv context into the final triage JSON.

    The returned JSON string is serialised with ``ensure_ascii=False`` so
    that French characters (accents, cedillas, ligatures) are preserved
    verbatim.

    Args:
        clinical_data: Dictionary produced by the Clinical Agent containing
            at minimum ``chief_complaint``, ``opqrst``, ``red_flags``,
            ``medical_history``, ``medications``, ``allergies``,
            ``suggested_ccmu``, and ``ccmu_reasoning``.
        datagouv_data: Dictionary produced by the DataGouv tool, or
            ``None`` if enrichment data is unavailable.

    Returns:
        A JSON string conforming to the Triage Document schema.
    """
    data_quality_notes: str | None = None

    if datagouv_data is None or not datagouv_data:
        data_quality_notes = (
            "Les données d'enrichissement DataGouv ne sont pas disponibles. "
            "Le document de triage a été généré sans contexte épidémiologique, "
            "médicamenteux ou d'établissement."
        )

    document: dict = {
        "patient_chief_complaint": clinical_data.get("chief_complaint", ""),
        "clinical_assessment": {
            "opqrst": clinical_data.get("opqrst", {}),
            "red_flags": clinical_data.get("red_flags", []),
            "medical_history": clinical_data.get("medical_history", []),
            "medications": clinical_data.get("medications", []),
            "allergies": clinical_data.get("allergies", []),
        },
        "datagouv_context": datagouv_data if datagouv_data else {},
        "recommended_ccmu": clinical_data.get("suggested_ccmu", ""),
        "ccmu_reasoning": clinical_data.get("ccmu_reasoning", ""),
        "data_quality_notes": data_quality_notes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return json.dumps(document, ensure_ascii=False)
