"""
HospiGuide — Multi-Agent Triage System (Hackathon Entry Point)

Demonstrates the Orchestrator Agent calling Agent 2 (DataGouv health
enrichment) as a Strands @tool. Agents 1 and 3 are stubbed for now.
"""

from __future__ import annotations

import json

from strands import Agent, tool
from agents.datagouv_tool import query_health_data, _make_model


# ---------------------------------------------------------------------------
# Agent 1 stub — Pre-Nurse Diagnostic
# ---------------------------------------------------------------------------

@tool
def pre_nurse_diagnostic(patient_transcript: str) -> str:
    """Conduct a structured clinical pre-assessment from the patient
    conversation transcript using the OPQRST framework.

    Args:
        patient_transcript: The raw transcript of the patient conversation.

    Returns:
        A JSON string with clinical assessment, red flags, and suggested
        CCMU level.
    """
    # TODO: Replace with full Strands agent once Agent 1 prompt is ready
    return json.dumps({
        "chief_complaint": "Douleur thoracique",
        "opqrst": {
            "onset": "Ce matin",
            "provocation": "Effort physique",
            "quality": "Oppression",
            "region": "Thorax, irradiation bras gauche",
            "severity": 7,
            "timing": "Continu depuis 3h",
        },
        "red_flags": ["chest_pain_with_dyspnea_and_diaphoresis"],
        "medical_history": ["hypertension", "diabete_type_2"],
        "medications": ["metformine_1000mg", "amlodipine_5mg"],
        "allergies": [],
        "suggested_ccmu": 4,
        "status": "stub — agent 1 not yet implemented",
    }, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Agent 3 stub — Administrative File Builder
# ---------------------------------------------------------------------------

@tool
def build_admin_file(patient_info: str) -> str:
    """Collect and structure the patient's administrative information for
    hospital registration.

    Args:
        patient_info: Text with the patient's administrative details.

    Returns:
        A JSON string with administrative fields and completeness flag.
    """
    # TODO: Replace with full Strands agent once Agent 3 prompt is ready
    return json.dumps({
        "full_name": "Jean Dupont",
        "date_of_birth": "1958-05-12",
        "gender": "M",
        "address": "12 rue de Rivoli, 75001 Paris",
        "phone": "+33 6 12 34 56 78",
        "insurance": {"carte_vitale": "1 58 05 75 XXX XXX XX", "mutuelle": "MGEN"},
        "emergency_contact": {"name": "Marie Dupont", "relation": "Épouse", "phone": "+33 6 98 76 54 32"},
        "attending_physician": "Dr Martin, Cabinet Rivoli",
        "completeness": "complete",
        "missing_fields": [],
        "status": "stub — agent 3 not yet implemented",
    }, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Orchestrator Agent (AO)
# ---------------------------------------------------------------------------

ORCHESTRATOR_PROMPT = """Tu es l'Agent Orchestrateur (AO) de HospiGuide, un coordinateur d'accueil
médical opérant aux urgences d'un hôpital français.

Tu disposes de 3 outils correspondant à 3 agents spécialisés :
1. pre_nurse_diagnostic — évaluation clinique pré-infirmière (Agent 1)
2. query_health_data — enrichissement données de santé publique (Agent 2)
3. build_admin_file — collecte administrative (Agent 3)

## Processus
1. Analyse le contexte patient reçu
2. Appelle pre_nurse_diagnostic pour l'évaluation clinique
3. En parallèle, appelle query_health_data pour l'enrichissement épidémiologique
4. Appelle build_admin_file pour les données administratives
5. Compile tout en un Document de Triage Patient avec classification CCMU

## Classification CCMU
- CCMU 1: Stable, aucune action nécessaire
- CCMU 2: Stable, nécessite décision diagnostique/thérapeutique
- CCMU 3: État instable sans menace vitale
- CCMU 4: Pronostic vital engagé
- CCMU 5: Menace vitale immédiate
- CCMU P: Urgence psychiatrique
- CCMU D: Décédé à l'arrivée

## Format de sortie
Retourne un JSON structuré combinant les sorties des 3 agents + ta recommandation CCMU avec raisonnement.
"""


def create_orchestrator() -> Agent:
    return Agent(
        model=_make_model(),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[pre_nurse_diagnostic, query_health_data, build_admin_file],
    )


# ---------------------------------------------------------------------------
# Quick test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    patient_scenario = """
    Un homme de 67 ans se présente aux urgences de l'Hôpital Necker (Paris 75).
    Il se plaint d'une douleur thoracique oppressante depuis ce matin, qui
    irradie vers le bras gauche. Il est essoufflé et en sueur.
    Antécédents : hypertension artérielle, diabète de type 2.
    Médicaments : Metformine 1000mg, Amlodipine 5mg.
    Pas d'allergies connues.
    Accompagné par son épouse Marie Dupont.
    """

    print("=" * 60)
    print("HospiGuide — Orchestrator Agent")
    print("=" * 60)
    print(f"\nScénario patient:\n{patient_scenario.strip()}\n")
    print("-" * 60)

    orchestrator = create_orchestrator()
    result = orchestrator(patient_scenario)
    print("\n" + "=" * 60)
    print("Résultat du triage:")
    print("=" * 60)
    print(result)
