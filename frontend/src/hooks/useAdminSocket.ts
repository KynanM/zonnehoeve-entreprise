
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

    // Bepaal de WebSocket URL op basis van de backend URL.
    // NEXT_PUBLIC_API_URL is de Railway-variabele voor de backend.
    // WebSocket gaat NIET via de Next.js proxy — we verbinden rechtstreeks met de backend.
    const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const cleanHost = backendApiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const protocol = backendApiUrl.startsWith("https") ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${cleanHost}/ws/admin?token=${password}`;

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
