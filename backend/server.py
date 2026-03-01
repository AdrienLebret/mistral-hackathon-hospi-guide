"""
Triastral — FastAPI WebSocket Server for Browser-Based Voice Triage.

Bridges the React patient kiosk frontend to the BidiAgent voice orchestrator
via WebSocket.  Each WebSocket connection gets its own BidiAgent session with
the same tools and system prompt as the CLI mode (``main.py``).

Usage:
    uvicorn server:app --host 0.0.0.0 --port 8000
    # or
    python server.py
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.tools import stop_conversation

from agents.profile_extractor import ProfileExtractorOutput, run_final_compilation
from config import load_prompt, make_nova_sonic_model
from ws_io import WebSocketBidiAudioOutput, WebSocketBidiInput, WebSocketBidiTextOutput

# Configure application logging (works both with uvicorn and direct python)
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
    force=True,
)
# Reduce noise from AWS SDK internals
logging.getLogger("botocore").setLevel(logging.WARNING)
logging.getLogger("smithy_core").setLevel(logging.WARNING)
logging.getLogger("smithy_aws_event_stream").setLevel(logging.WARNING)
logging.getLogger("smithy_aws_core").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Triastral Voice Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Liveness / readiness probe."""
    region = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1 (default)"))
    has_key = bool(os.getenv("AWS_ACCESS_KEY_ID"))
    has_token = bool(os.getenv("AWS_SESSION_TOKEN"))
    return {
        "status": "ok",
        "service": "triastral-voice",
        "aws_region": region,
        "aws_credentials": "present" if has_key else "MISSING",
        "aws_session_token": "present" if has_token else "absent",
    }


# ---------------------------------------------------------------------------
# WebSocket voice session
# ---------------------------------------------------------------------------


@app.websocket("/ws/voice")
async def voice_session(websocket: WebSocket):
    """Handle a single patient voice session over WebSocket.

    Protocol
    --------
    1. Client connects, sends ``{"type": "session.start"}``
    2. Server creates BidiAgent, sends ``{"type": "session.started", …}``
    3. Client streams binary PCM audio → server → Nova Sonic 2
    4. Server streams binary PCM audio + JSON transcripts → client
    5. When agent calls ``stop_conversation``, server runs final compilation
       then sends ``{"type": "compilation.complete", …}`` followed by
       ``{"type": "session.ended", …}`` and closes.
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    logger.info("WebSocket connected — session %s", session_id)

    # ── Wait for session.start ──────────────────────────────────────────
    try:
        first_msg = await asyncio.wait_for(websocket.receive_json(), timeout=30)
        if first_msg.get("type") != "session.start":
            await websocket.send_json({"type": "error", "message": "Expected session.start"})
            await websocket.close()
            return
    except (asyncio.TimeoutError, WebSocketDisconnect):
        logger.warning("Session %s: no session.start received", session_id)
        return

    # ── Build agent ────────────────────────────────────────────────────
    # The voice agent ONLY asks questions and calls stop_conversation.
    # Clinical assessment and data extraction happen in the final
    # compilation step after the conversation ends.
    model = make_nova_sonic_model()
    agent = BidiAgent(
        model=model,
        system_prompt=load_prompt(),
        tools=[stop_conversation],
    )

    # ── Create WebSocket I/O bridges ────────────────────────────────────
    ws_input = WebSocketBidiInput(websocket)
    ws_audio_output = WebSocketBidiAudioOutput(websocket)
    ws_text_output = WebSocketBidiTextOutput(websocket)
    ws_profile_extractor = ProfileExtractorOutput()

    await websocket.send_json({"type": "session.started", "sessionId": session_id})
    logger.info("Session %s: sent session.started, launching agent.run()", session_id)

    # ── Run the agent ───────────────────────────────────────────────────
    try:
        await agent.run(
            inputs=[ws_input],
            outputs=[ws_audio_output, ws_text_output, ws_profile_extractor],
        )
        logger.info("Session %s: agent.run() completed normally", session_id)
    except asyncio.CancelledError:
        logger.info("Session %s: cancelled (client disconnected)", session_id)
    except WebSocketDisconnect:
        logger.info("Session %s: WebSocket disconnected", session_id)
    except Exception:
        logger.exception("Session %s: voice session error", session_id)
        try:
            await websocket.send_json({"type": "error", "message": "Internal server error"})
        except Exception:
            pass
    finally:
        # Ensure the agent is stopped
        try:
            await agent.stop()
        except Exception:
            pass

        # ── Final compilation: process full transcript with Mistral ─────
        # This runs AFTER the conversation ends.  The frontend is already
        # showing a "Compiling…" loading screen (triggered by the
        # session.ended event from BidiConnectionCloseEvent in ws_io.py).
        try:
            transcripts = ws_profile_extractor.get_transcripts()
            if transcripts:
                transcript_text = "\n".join(
                    f"{'Assistant' if t['role'] == 'assistant' else 'Patient'}: {t['text']}"
                    for t in transcripts
                )
                logger.info(
                    "Session %s: running final compilation on %d transcript entries",
                    session_id,
                    len(transcripts),
                )

                loop = asyncio.get_running_loop()
                compilation = await loop.run_in_executor(
                    None, run_final_compilation, transcript_text
                )

                if compilation:
                    await websocket.send_json({
                        "type": "compilation.complete",
                        "data": compilation,
                    })
                    logger.info("Session %s: compilation.complete sent to frontend", session_id)
                else:
                    logger.warning("Session %s: final compilation returned None", session_id)
            else:
                logger.warning("Session %s: no transcripts collected for compilation", session_id)
        except Exception:
            logger.exception("Session %s: final compilation failed", session_id)

        # Send session ended
        try:
            await websocket.send_json({"type": "session.ended", "reason": "completed"})
        except Exception:
            pass

        try:
            await websocket.close()
        except Exception:
            pass

        logger.info("Session %s: ended", session_id)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("=" * 60)
    logger.info("Triastral Voice Server starting on port %d", BACKEND_PORT)
    logger.info("=" * 60)

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=BACKEND_PORT,
        log_level="info",
    )
