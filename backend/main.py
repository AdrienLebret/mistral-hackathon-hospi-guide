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
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.io import BidiAudioIO, BidiTextIO
from strands.experimental.bidi.models import BidiNovaSonicModel
from strands.experimental.bidi.tools import stop_conversation

from agents.clinical_agent import clinical_assessment
from agents.datagouv_tool import query_health_data

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

PROMPT_PATH = Path(__file__).parent / "agents" / "prompts" / "orchestrator.md"
OUTPUT_DIR = Path(__file__).parent / "output"


def _load_prompt() -> str:
    """Load orchestrator system prompt from markdown file."""
    return PROMPT_PATH.read_text(encoding="utf-8")


def _make_nova_sonic_model() -> BidiNovaSonicModel:
    """Create Nova Sonic 2 model with configurable voice and region."""
    return BidiNovaSonicModel(
        model_id=os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0"),
        provider_config={
            "audio": {"voice": os.getenv("NOVA_SONIC_VOICE_ID", "tiffany")}
        },
        client_config={"region": os.getenv("AWS_REGION", "us-east-1")},
    )


def _save_triage_document(content: str) -> Path:
    """Save triage document JSON to the output directory."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filepath = OUTPUT_DIR / f"triage_{ts}.json"
    try:
        parsed = json.loads(content)
        filepath.write_text(
            json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except (json.JSONDecodeError, ValueError):
        filepath = OUTPUT_DIR / f"triage_{ts}.txt"
        filepath.write_text(content, encoding="utf-8")
    logger.info("📄 Triage document saved to %s", filepath)
    return filepath


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

    model = _make_nova_sonic_model()

    agent = BidiAgent(
        model=model,
        system_prompt=_load_prompt(),
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
