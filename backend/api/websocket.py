"""ConnectionManager — bridges a browser WebSocket to a BidiAgent session.

One instance per WebSocket connection. Handles:
- BidiAgent lifecycle (init, run, stop)
- Audio forwarding (browser PCM 16kHz → agent, agent PCM 24kHz → browser)
- Event translation (BidiAgent events → JSON protocol for the frontend)
- Tool execution notifications
- Session end with triage document compilation
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.models import BidiNovaSonicModel
from strands.experimental.bidi.tools import stop_conversation
from strands.experimental.bidi.types.events import BidiAudioInputEvent

logger = logging.getLogger(__name__)

PROMPT_PATH = (
    Path(__file__).resolve().parent.parent / "agents" / "prompts" / "orchestrator.md"
)

# Valid server event types per the WebSocket protocol spec
VALID_EVENT_TYPES = frozenset(
    {
        "sessionStart",
        "audioData",
        "textOutput",
        "toolUse",
        "toolResult",
        "sessionEnd",
        "error",
    }
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_prompt() -> str:
    """Load orchestrator system prompt from markdown file."""
    return PROMPT_PATH.read_text(encoding="utf-8")


def format_event(event_type: str, **kwargs: Any) -> str:
    """Build a JSON event string with ``type`` and ``timestamp`` (ISO 8601).

    Every server→client message goes through this helper so the protocol
    invariant (type + timestamp always present) is enforced in one place.
    """
    payload: dict[str, Any] = {
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **kwargs,
    }
    return json.dumps(payload, ensure_ascii=False)


def _make_nova_sonic_model() -> BidiNovaSonicModel:
    """Create Nova Sonic 2 model with configurable voice and region."""
    return BidiNovaSonicModel(
        model_id=os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0"),
        provider_config={
            "audio": {"voice": os.getenv("NOVA_SONIC_VOICE_ID", "tiffany")}
        },
        client_config={"region": os.getenv("AWS_REGION", "us-east-1")},
    )


def _load_tools() -> list:
    """Import and return the tool functions used by the orchestrator.

    Imports are deferred so the module can be loaded without triggering
    heavy SDK initialisation at import time.
    """
    from backend.agents.clinical_agent import clinical_assessment
    from backend.agents.datagouv_tool import query_health_data

    return [clinical_assessment, query_health_data, stop_conversation]


# ---------------------------------------------------------------------------
# ConnectionManager
# ---------------------------------------------------------------------------


class ConnectionManager:
    """Bridges a single browser WebSocket to a BidiAgent session.

    Lifecycle:
        1. ``connect()`` — accept WS, create BidiAgent, start background tasks
        2. Browser sends binary audio → ``receive_audio()`` → agent
        3. Agent emits events → background tasks → formatted JSON to browser
        4. ``stop_conversation`` tool → ``handle_session_end()`` → sessionEnd event
        5. ``disconnect()`` — cancel tasks, release agent resources
    """

    def __init__(self) -> None:
        self.agent: BidiAgent | None = None
        self.websocket: WebSocket | None = None
        self.is_active: bool = False
        self._tasks: list[asyncio.Task] = []
        # Accumulate tool results for triage document compilation
        self._clinical_data: dict = {}
        self._datagouv_data: dict | None = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, websocket: WebSocket) -> None:
        """Accept the WebSocket, initialise BidiAgent, and start streaming.

        Sends a ``sessionStart`` event to the browser once the agent is ready,
        then enters the main receive loop for incoming audio/text frames.
        """
        await websocket.accept()
        self.websocket = websocket
        self.is_active = True
        logger.info("WebSocket connection accepted")

        try:
            model = _make_nova_sonic_model()
            tools = _load_tools()

            self.agent = BidiAgent(
                model=model,
                system_prompt=_load_prompt(),
                tools=tools,
            )

            # Start the agent (establishes model connection)
            await self.agent.start()
            logger.info("BidiAgent session started")

            # Notify browser that the session is ready
            await self._send_json(format_event("sessionStart"))

            # Spawn background tasks for reading agent output
            self._tasks.append(asyncio.create_task(self._process_agent_events()))

            # Enter the main receive loop (blocks until disconnect)
            await self._receive_loop()

        except WebSocketDisconnect:
            logger.info("WebSocket disconnected by client")
            raise
        except Exception as exc:
            logger.exception("Error during WebSocket session: %s", exc)
            try:
                await self._send_json(
                    format_event("error", message=f"Erreur de session: {exc}")
                )
            except Exception:
                pass
            raise
        finally:
            await self.disconnect()

    async def disconnect(self) -> None:
        """Cancel background tasks and release BidiAgent resources."""
        if not self.is_active:
            return
        self.is_active = False
        logger.info("Disconnecting — cleaning up resources")

        # Cancel background tasks
        for task in self._tasks:
            if not task.done():
                task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()

        # Stop the BidiAgent
        if self.agent is not None:
            try:
                await self.agent.stop()
            except Exception:
                logger.exception("Error stopping BidiAgent")
            self.agent = None

        self.websocket = None
        logger.info("Cleanup complete")

    # ------------------------------------------------------------------
    # Incoming data from browser
    # ------------------------------------------------------------------

    async def _receive_loop(self) -> None:
        """Read frames from the browser WebSocket until disconnect.

        Binary frames → audio input to BidiAgent.
        Text frames   → parsed as JSON commands (e.g. textInput).
        """
        while self.is_active and self.websocket is not None:
            message = await self.websocket.receive()

            if "bytes" in message:
                await self.receive_audio(message["bytes"])
            elif "text" in message:
                await self._handle_text_message(message["text"])

    async def receive_audio(self, audio_data: bytes) -> None:
        """Forward PCM 16kHz audio from the browser to the BidiAgent."""
        if self.agent is None or not self.is_active:
            return
        try:
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")
            await self.agent.send(
                BidiAudioInputEvent(
                    audio=audio_b64,
                    format="pcm",
                    sample_rate=16000,
                    channels=1,
                )
            )
        except Exception:
            # Don't crash the session for a single bad audio chunk
            logger.debug("Error forwarding audio chunk to BidiAgent", exc_info=True)

    async def _handle_text_message(self, raw: str) -> None:
        """Parse a JSON text frame from the browser and act on it."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Received non-JSON text frame, ignoring")
            return

        msg_type = data.get("type")
        if msg_type == "textInput":
            content = data.get("content", "")
            if self.agent and content:
                await self.agent.send(content)

    # ------------------------------------------------------------------
    # Outgoing data to browser
    # ------------------------------------------------------------------

    async def _send_json(self, payload: str) -> None:
        """Send a JSON text frame to the browser, swallowing errors."""
        if self.websocket is None:
            return
        try:
            await self.websocket.send_text(payload)
        except Exception:
            logger.debug("Failed to send JSON to browser", exc_info=True)

    async def _send_audio(self, audio_bytes: bytes) -> None:
        """Send raw PCM 24kHz audio as a binary WebSocket frame."""
        if self.websocket is None:
            return
        try:
            await self.websocket.send_bytes(audio_bytes)
        except Exception:
            logger.debug("Failed to send audio to browser", exc_info=True)

    # ------------------------------------------------------------------
    # Background task — process BidiAgent output events
    # ------------------------------------------------------------------

    async def _process_agent_events(self) -> None:
        """Read events from the BidiAgent and forward them to the browser.

        Maps BidiAgent event types to the Triastral WebSocket protocol:
        - bidi_audio_stream   → binary PCM 24kHz frame to browser
        - bidi_transcript_stream → textOutput JSON event
        - tool_use_stream     → toolUse JSON event
        - bidi_connection_close (reason=user_request) → compile triage + sessionEnd
        - bidi_error          → error JSON event
        """
        if self.agent is None:
            return

        try:
            async for event in self.agent.receive():
                if not self.is_active:
                    break

                event_type = event.get("type", "")

                if event_type == "bidi_audio_stream":
                    await self._handle_audio_output(event)

                elif event_type == "bidi_transcript_stream":
                    await self._handle_transcript(event)

                elif event_type == "tool_use_stream":
                    await self._handle_tool_use(event)

                elif event_type == "bidi_interruption":
                    logger.info("Barge-in detected: %s", event.get("reason"))

                elif event_type == "bidi_connection_close":
                    reason = event.get("reason", "")
                    if reason == "user_request":
                        # stop_conversation was called — compile triage doc
                        await self.handle_session_end()
                    break

                elif event_type == "bidi_connection_restart":
                    logger.info("BidiAgent connection restarting (timeout)")

                elif event_type == "bidi_error":
                    msg = event.get("message", "Erreur interne")
                    logger.error("BidiAgent error: %s", msg)
                    await self._send_json(format_event("error", message=msg))

                elif event_type == "bidi_connection_start":
                    logger.info(
                        "BidiAgent connected to model: %s", event.get("model", "?")
                    )

        except asyncio.CancelledError:
            logger.info("Agent event processing cancelled")
        except Exception:
            logger.exception("Unexpected error in agent event processing")
            await self._send_json(
                format_event("error", message="Erreur interne du serveur")
            )

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------

    async def _handle_audio_output(self, event: dict) -> None:
        """Decode base64 audio from BidiAgent and send as binary to browser."""
        audio_b64 = event.get("audio", "")
        if not audio_b64:
            return
        try:
            audio_bytes = base64.b64decode(audio_b64)
            await self._send_audio(audio_bytes)
        except Exception:
            logger.debug("Error decoding/sending audio output", exc_info=True)

    async def _handle_transcript(self, event: dict) -> None:
        """Forward transcript events as textOutput JSON to the browser."""
        role_map = {"assistant": "agent", "user": "user"}
        raw_role = event.get("role", "assistant")
        role = role_map.get(raw_role, raw_role)
        text = event.get("text", "")
        is_final = event.get("is_final", False)

        await self._send_json(
            format_event(
                "textOutput",
                role=role,
                content=text,
                isFinal=is_final,
            )
        )

    async def _handle_tool_use(self, event: dict) -> None:
        """Forward tool execution events to the browser.

        Also captures tool results for triage document compilation.
        """
        tool_use = event.get("current_tool_use", {})
        tool_name = tool_use.get("name", "unknown")

        # Notify browser that a tool is running
        await self._send_json(format_event("toolUse", tool=tool_name, status="running"))

        # The BidiAgent executes tools automatically in the background.
        # We capture results via the tool_use event data when available.
        tool_input = tool_use.get("input", {})

        # Store tool context for later triage compilation
        if tool_name == "clinical_assessment":
            self._clinical_data = tool_input
        elif tool_name == "query_health_data":
            self._datagouv_data = tool_input

        # Send toolResult event (the agent handles execution internally;
        # we notify the browser that the tool completed)
        await self._send_json(
            format_event("toolResult", tool=tool_name, status="complete")
        )

    async def handle_tool_use(self, tool_name: str, tool_content: dict) -> dict:
        """Execute a tool and return the result to the BidiAgent.

        In the Strands BidiAgent SDK, tools execute automatically via the
        agent loop. This method exists for manual/fallback invocation if
        needed, and captures results for triage document compilation.
        """
        result: dict = {}

        if tool_name == "clinical_assessment":
            from backend.agents.clinical_agent import clinical_assessment

            raw = clinical_assessment(
                patient_context=json.dumps(tool_content, ensure_ascii=False)
            )
            try:
                result = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                result = {"raw_output": str(raw), "suggested_ccmu": "3"}
            self._clinical_data = result

        elif tool_name == "query_health_data":
            from backend.agents.datagouv_tool import query_health_data

            raw = query_health_data(
                patient_context=json.dumps(tool_content, ensure_ascii=False)
            )
            try:
                result = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                result = {"raw_output": str(raw)}
            self._datagouv_data = result

        return result

    # ------------------------------------------------------------------
    # Session end — triage document compilation
    # ------------------------------------------------------------------

    async def handle_session_end(self) -> dict:
        """Compile the triage document and send a ``sessionEnd`` event.

        Called when the BidiAgent's ``stop_conversation`` tool fires.
        Uses ``compile_triage_document`` from ``backend.triage`` to merge
        clinical assessment and DataGouv enrichment data.

        Returns:
            The compiled triage document as a dict.
        """
        from backend.triage import compile_triage_document

        logger.info("Compiling triage document")

        triage_json = compile_triage_document(
            clinical_data=self._clinical_data,
            datagouv_data=self._datagouv_data,
        )

        try:
            triage_doc = json.loads(triage_json)
        except (json.JSONDecodeError, TypeError):
            triage_doc = {"raw": triage_json}

        await self._send_json(format_event("sessionEnd", triageDocument=triage_doc))

        logger.info(
            "Session ended — CCMU recommendation: %s",
            triage_doc.get("recommended_ccmu", "?"),
        )
        return triage_doc
