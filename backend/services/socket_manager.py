
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Beheert actieve WebSocket verbindingen."""
    
    def __init__(self):
        # We kunnen verbindingen groeperen per 'room' (bijv. 'admin')
        self.active_connections: Dict[str, List[WebSocket]] = {
            "admin": []
        }

    async def connect(self, websocket: WebSocket, room: str = "admin"):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        logger.info(f"🔌 Nieuwe WebSocket verbinding in room: {room}. Totaal: {len(self.active_connections[room])}")

    def disconnect(self, websocket: WebSocket, room: str = "admin"):
        if room in self.active_connections and websocket in self.active_connections[room]:
            self.active_connections[room].remove(websocket)
            logger.info(f"🔌 WebSocket verbinding verbroken in room: {room}. Totaal: {len(self.active_connections[room])}")

    async def broadcast(self, message: Any, room: str = "admin"):
        """Stuurt een bericht naar alle actieve verbindingen in een specifieke room."""
        if room not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"❌ Fout bij verzenden van WebSocket bericht: {e}")
                disconnected.append(connection)
        
        # Opruimen van verbroken verbindingen die niet netjes zijn afgesloten
        for conn in disconnected:
            self.disconnect(conn, room)

# Singleton instantie
manager = ConnectionManager()
