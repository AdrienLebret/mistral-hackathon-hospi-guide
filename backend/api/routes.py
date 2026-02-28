"""FastAPI application with CORS, health endpoint, and WebSocket endpoint."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Triastral API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    """Returns {"status": "ok"}."""
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Main WebSocket handler — delegates to ConnectionManager."""
    from backend.api.websocket import ConnectionManager

    manager = ConnectionManager()
    try:
        await manager.connect(websocket)
    except WebSocketDisconnect:
        await manager.disconnect()
