"""
Agent 2 — DataGouv Health Data Enrichment Tool

Strands SDK agent that queries data.gouv.fr via MCP to enrich patient
triage assessments with epidemiological and public health context.

Usage as a @tool for the Orchestrator Agent:
    from agents.datagouv_tool import query_health_data
    orchestrator = Agent(tools=[query_health_data, ...])
"""

from __future__ import annotations

import os
from pathlib import Path

from strands import Agent, tool
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from mcp.client.streamable_http import streamablehttp_client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATAGOUV_MCP_URL = os.getenv("DATAGOUV_MCP_URL", "https://mcp.data.gouv.fr/mcp")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "mistral.mistral-large-3-675b-instruct")
BEDROCK_REGION = os.getenv("AWS_REGION", "us-east-1")

PROMPT_PATH = Path(__file__).parent / "prompts" / "datagouv.md"


def _load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _make_model() -> BedrockModel:
    return BedrockModel(
        model_id=BEDROCK_MODEL_ID,
        region_name=BEDROCK_REGION,
        temperature=0.2,
    )


def _make_mcp_client() -> MCPClient:
    return MCPClient(lambda: streamablehttp_client(DATAGOUV_MCP_URL))


# ---------------------------------------------------------------------------
# Public tool — this is what the Orchestrator Agent calls
# ---------------------------------------------------------------------------


@tool
def query_health_data(patient_context: str) -> str:
    """Query French public health datasets from data.gouv.fr to enrich a
    patient triage assessment with epidemiological context, pathology
    prevalence, medication safety data, and nearby facility capabilities.

    Args:
        patient_context: A text description of the patient situation including
            symptoms, age, gender, location (department), declared medications,
            and chronic conditions.

    Returns:
        A JSON string with epidemiological_context, medication_context,
        facility_context, summary, and data_quality_notes.
    """
    mcp_client = _make_mcp_client()

    with mcp_client:
        tools = mcp_client.list_tools_sync()

        agent = Agent(
            model=_make_model(),
            system_prompt=_load_prompt(),
            tools=tools,
        )

        response = agent(
            f"Voici le contexte patient à enrichir avec des données de santé publique :\n\n"
            f"{patient_context}\n\n"
            f"Recherche les données pertinentes sur data.gouv.fr et retourne "
            f"le JSON d'enrichissement."
        )

    return str(response)


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
    print("Agent 2 — DataGouv Health Enrichment")
    print("=" * 60)
    result = query_health_data(patient_context=test_context)
    print(result)
