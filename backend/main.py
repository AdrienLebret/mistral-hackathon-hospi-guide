"""
Triastral — BidiAgent Voice Orchestrator Entry Point

Patient-facing voice conversation orchestrator for the Triastral emergency
department triage assistant. Uses Amazon Nova Sonic 2 via the Strands SDK
BidiAgent for real-time bidirectional audio streaming in French.

The orchestrator delegates clinical pre-assessment to the Clinical Agent
and health data enrichment to the DataGouv tool, then compiles a structured
triage document with a CCMU classification recommendation for the nurse
dashboard.

Usage:
    python backend/main.py
"""

from __future__ import annotations

import asyncio
import logging
import os

from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.io import BidiAudioIO, BidiTextIO
from strands.experimental.bidi.tools import stop_conversation

from agents.clinical_agent import clinical_assessment
from agents.datagouv_tool import query_health_data
from config import load_prompt, make_nova_sonic_model

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Voice session
# ---------------------------------------------------------------------------


async def main() -> None:
    """Initialize and run the voice conversation session."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("=" * 60)
    logger.info("🚀 Triastral Voice Orchestrator starting")
    logger.info("=" * 60)
    logger.info(
        "Model: %s", os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0")
    )
    logger.info("Voice: %s", os.getenv("NOVA_SONIC_VOICE_ID", "tiffany"))
    logger.info("Region: %s", os.getenv("AWS_REGION", "us-east-1"))
    logger.info("Tools: clinical_assessment, query_health_data, stop_conversation")
    logger.info("-" * 60)

    model = make_nova_sonic_model()

    agent = BidiAgent(
        model=model,
        system_prompt=load_prompt(),
        tools=[clinical_assessment, query_health_data, stop_conversation],
    )

    audio_io = BidiAudioIO()
    text_io = BidiTextIO()

    try:
        await agent.run(
            inputs=[audio_io.input()],
            outputs=[audio_io.output(), text_io.output()],
        )
    except Exception:
        logger.exception("Voice session error — connection lost or interrupted")
    finally:
        # Try to capture any triage document from the conversation
        logger.info("=" * 60)
        logger.info("🏁 Voice session ended")
        logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
