"""WebSocket routes for real-time updates."""
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import get_current_user
from backend.database import get_db
from backend.services.websocket_service import websocket_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/api/installations/{installation_id}/stream")
async def websocket_endpoint(
    websocket: WebSocket,
    installation_id: int,
):
    """WebSocket endpoint for real-time installation updates."""
    await websocket_manager.connect(websocket, installation_id)
    
    try:
        while True:
            # Keep connection alive and send periodic updates
            # In production, this would be triggered by MQTT messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, installation_id)

