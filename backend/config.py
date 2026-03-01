"""
Triastral — Shared configuration for CLI and WebSocket server modes.

Centralises model creation, prompt loading, output persistence, and audio
constants so both ``main.py`` (terminal) and ``server.py`` (browser) use
the same settings.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from strands.experimental.bidi.models import BidiNovaSonicModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROMPT_PATH = Path(__file__).parent / "agents" / "prompts" / "orchestrator.md"
OUTPUT_DIR = Path(__file__).parent / "output"

# ---------------------------------------------------------------------------
# Audio constants (Nova Sonic 2 native format)
# ---------------------------------------------------------------------------

AUDIO_SAMPLE_RATE = 16000
AUDIO_CHANNELS = 1
AUDIO_FORMAT = "pcm"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_prompt() -> str:
    """Load orchestrator system prompt from markdown file."""
    return PROMPT_PATH.read_text(encoding="utf-8")


def make_nova_sonic_model() -> BidiNovaSonicModel:
    """Create Nova Sonic 2 model with configurable voice and region."""
    return BidiNovaSonicModel(
        model_id=os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0"),
        provider_config={
            "audio": {"voice": os.getenv("NOVA_SONIC_VOICE_ID", "tiffany")}
        },
        client_config={"region": os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))},
    )


def save_triage_document(content: str) -> Path:
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
    logger.info("Triage document saved to %s", filepath)
    return filepath
