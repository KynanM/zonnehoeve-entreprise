
import { useState, useEffect, useCallback, useRef } from "react";

interface SocketMessage {
  type: string;
  data?: any;
}

export function useAdminSocket(password: string, onMessage: (msg: SocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!password) return;

    // Bepaal de websocket URL op basis van de huidige window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_BACKEND_URL 
      ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/^https?:\/\//, "")
      : window.location.host.includes("localhost") ? "localhost:8000" : window.location.host;
    
    const wsUrl = `${protocol}//${host}/ws/admin?token=${password}`;

    console.log("🔌 Verbinden met WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket verbonden");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (e) {
        console.error("❌ Fout bij parsen WebSocket bericht:", e);
      }
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket gesloten:", event.code, event.reason);
      setIsConnected(false);
      socketRef.current = null;
      
      // Auto-reconnect na 3 seconden
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Opnieuw proberen te verbinden...");
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket fout:", error);
      ws.close();
    };

    socketRef.current = ws;
  }, [password, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = (msg: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return { isConnected, sendMessage };
}
