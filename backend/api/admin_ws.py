
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from services.socket_manager import manager
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin WebSocket"])

@router.websocket("/ws/admin")
async def admin_websocket(
    websocket: WebSocket,
    token: str = Query(None)
):
    """
    WebSocket endpoint voor real-time admin updates.
    Beveiligd via de ADMIN_API_KEY (token query param).
    """
    expected_token = os.getenv("ADMIN_API_KEY", "REDACTED_ADMIN_KEY")
    
    if token != expected_token:
        logger.warning(f"🔒 Ongeautoriseerde WebSocket poging met token: {token}")
        await websocket.close(code=1008) # Policy Violation
        return

    await manager.connect(websocket, "admin")
    try:
        while True:
            # We luisteren naar berichten van de admin (bijv. ping),
            # maar de hoofdrol is het pushen van server -> client.
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, "admin")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket, "admin")
