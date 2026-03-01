"""
Triastral — WebSocket I/O bridge for BidiAgent.

Implements the Strands ``BidiInput`` and ``BidiOutput`` protocols using a
FastAPI WebSocket connection instead of local microphone / speaker.  Audio
flows as raw PCM binary frames; transcripts and lifecycle events flow as
JSON text frames.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import TYPE_CHECKING

from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from strands.experimental.bidi.types.events import (
    BidiAudioInputEvent,
    BidiAudioStreamEvent,
    BidiConnectionCloseEvent,
    BidiErrorEvent,
    BidiInterruptionEvent,
    BidiOutputEvent,
    BidiResponseCompleteEvent,
    BidiTranscriptStreamEvent,
)
from strands.experimental.bidi.types.io import BidiInput, BidiOutput

if TYPE_CHECKING:
    from strands.experimental.bidi.agent.agent import BidiAgent

from config import AUDIO_CHANNELS, AUDIO_FORMAT, AUDIO_SAMPLE_RATE

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _safe_send_json(ws: WebSocket, data: dict) -> None:
    """Send JSON to WebSocket, silently ignoring closed connections."""
    try:
        if ws.client_state == WebSocketState.CONNECTED:
            await ws.send_json(data)
    except Exception:
        logger.debug("WebSocket send failed (connection likely closed)")


async def _safe_send_bytes(ws: WebSocket, data: bytes) -> None:
    """Send binary to WebSocket, silently ignoring closed connections."""
    try:
        if ws.client_state == WebSocketState.CONNECTED:
            await ws.send_bytes(data)
    except Exception:
        logger.debug("WebSocket send failed (connection likely closed)")


# ---------------------------------------------------------------------------
# Input: Browser microphone → BidiAgent
# ---------------------------------------------------------------------------


class WebSocketBidiInput(BidiInput):
    """Read PCM audio from a browser WebSocket and yield ``BidiAudioInputEvent``.

    Binary frames are base64-encoded and wrapped in the event format that the
    Strands SDK expects.  JSON control messages (``session.stop``, ``ping``)
    are handled inline.
    """

    def __init__(self, websocket: WebSocket) -> None:
        self._ws = websocket
        self._stopped = False

    async def start(self, agent: BidiAgent) -> None:
        """Called by BidiAgent when the session begins."""
        self._stopped = False
        logger.info("WebSocket audio input started (waiting for browser mic data)")

    async def stop(self) -> None:
        """Called by BidiAgent when the session ends."""
        self._stopped = True
        logger.info("WebSocket audio input stopped")

    async def __call__(self) -> BidiAudioInputEvent:
        """Block until the next audio chunk arrives from the browser."""
        while not self._stopped:
            try:
                message = await self._ws.receive()
            except WebSocketDisconnect:
                raise asyncio.CancelledError("WebSocket disconnected")

            msg_type = message.get("type", "")

            if msg_type == "websocket.disconnect":
                raise asyncio.CancelledError("WebSocket disconnected")

            # Binary frame → audio
            raw_bytes = message.get("bytes")
            if raw_bytes:
                audio_b64 = base64.b64encode(raw_bytes).decode("ascii")
                logger.debug("Audio input: %d bytes from browser", len(raw_bytes))
                return BidiAudioInputEvent(
                    audio=audio_b64,
                    format=AUDIO_FORMAT,
                    sample_rate=AUDIO_SAMPLE_RATE,
                    channels=AUDIO_CHANNELS,
                )

            # Text frame → control message
            raw_text = message.get("text")
            if raw_text:
                try:
                    data = json.loads(raw_text)
                except json.JSONDecodeError:
                    continue

                if data.get("type") == "session.stop":
                    raise asyncio.CancelledError("Client requested stop")

                if data.get("type") == "ping":
                    await _safe_send_json(self._ws, {"type": "pong"})

        raise asyncio.CancelledError("Input stopped")


# ---------------------------------------------------------------------------
# Output: BidiAgent audio → Browser speaker
# ---------------------------------------------------------------------------


class WebSocketBidiAudioOutput(BidiOutput):
    """Forward audio output events from BidiAgent to the browser as binary PCM.

    Also sends ``audio.start`` / ``audio.end`` JSON markers so the frontend
    can synchronise the avatar animation.
    """

    def __init__(self, websocket: WebSocket) -> None:
        self._ws = websocket
        self._is_streaming = False

    async def start(self, agent: BidiAgent) -> None:
        self._is_streaming = False

    async def stop(self) -> None:
        if self._is_streaming:
            await _safe_send_json(self._ws, {"type": "audio.end"})
            self._is_streaming = False

    async def __call__(self, event: BidiOutputEvent) -> None:
        if isinstance(event, BidiAudioStreamEvent):
            if not self._is_streaming:
                logger.info("Audio output: stream started → browser")
                await _safe_send_json(self._ws, {"type": "audio.start"})
                self._is_streaming = True

            pcm_bytes = base64.b64decode(event.audio)
            logger.debug("Audio output: %d bytes → browser", len(pcm_bytes))
            await _safe_send_bytes(self._ws, pcm_bytes)

        elif isinstance(event, (BidiInterruptionEvent, BidiResponseCompleteEvent)):
            if self._is_streaming:
                logger.info("Audio output: stream ended (event=%s)", type(event).__name__)
                await _safe_send_json(self._ws, {"type": "audio.end"})
                self._is_streaming = False
        else:
            logger.debug("Audio output: ignoring event type %s", type(event).__name__)


# ---------------------------------------------------------------------------
# Output: BidiAgent transcripts & lifecycle → Browser JSON events
# ---------------------------------------------------------------------------


class WebSocketBidiTextOutput(BidiOutput):
    """Forward transcript and lifecycle events to the browser as JSON."""

    def __init__(self, websocket: WebSocket) -> None:
        self._ws = websocket

    async def start(self, agent: BidiAgent) -> None:
        pass

    async def stop(self) -> None:
        pass

    async def __call__(self, event: BidiOutputEvent) -> None:
        if isinstance(event, BidiTranscriptStreamEvent):
            text = event.current_transcript or event.text
            logger.info(
                "Transcript [%s] final=%s: %s",
                event.role,
                event.is_final,
                text[:80] if text else "(empty)",
            )
            await _safe_send_json(self._ws, {
                "type": "transcript",
                "role": event.role,
                "text": text,
                "delta": event.text,
                "isFinal": event.is_final,
            })

        elif isinstance(event, BidiConnectionCloseEvent):
            logger.info("Connection close event: reason=%s", event.reason)
            await _safe_send_json(self._ws, {
                "type": "session.ended",
                "reason": event.reason,
            })

        elif isinstance(event, BidiErrorEvent):
            logger.error("BidiError event: %s", event.message)
            await _safe_send_json(self._ws, {
                "type": "error",
                "message": event.message,
            })
        else:
            logger.debug("Text output: ignoring event type %s", type(event).__name__)
