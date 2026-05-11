
import { useState, useEffect, useCallback, useRef } from "react";

interface SocketMessage {
  type: string;
  data?: any;
}

export function useAdminSocket(password: string, onMessage: (msg: SocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "polling" | "disconnected">("disconnected");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsFailedRef = useRef(false);
  const mountedRef = useRef(true);

  // HTTP Polling fallback: poll /api/admin/stats elke 15 seconden
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setConnectionMode("polling");
    setIsConnected(true);
    console.log("📡 WebSocket niet beschikbaar — Polling modus actief (15s interval)");
    
    // Onmiddellijk een refresh sturen
    onMessage({ type: "refresh_stats" });
    
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        onMessage({ type: "refresh_stats" });
      }
    }, 15000);
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!password) return;
    
    // Stop bestaande polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Bepaal de WebSocket URL op basis van de backend URL.
    // NEXT_PUBLIC_API_URL is de Railway-variabele voor de backend.
    // WebSocket gaat NIET via de Next.js proxy — we verbinden rechtstreeks met de backend.
    const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const cleanHost = backendApiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const protocol = backendApiUrl.startsWith("https") ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${cleanHost}/ws/admin?token=${password}`;

    console.log("🔌 Verbinden met WebSocket:", wsUrl);
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn("⚠️ WebSocket aanmaken mislukt, overschakelen naar polling:", e);
      wsFailedRef.current = true;
      startPolling();
      return;
    }

    // Als WebSocket na 6 seconden nog niet verbonden is, val terug op polling
    const wsTimeoutId = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn("⏱️ WebSocket timeout — overschakelen naar polling modus");
        ws.close();
        wsFailedRef.current = true;
        startPolling();
      }
    }, 6000);

    ws.onopen = () => {
      clearTimeout(wsTimeoutId);
      console.log("✅ WebSocket verbonden");
      wsFailedRef.current = false;
      if (mountedRef.current) {
        setIsConnected(true);
        setConnectionMode("websocket");
      }
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
      clearTimeout(wsTimeoutId);
      console.log("🔌 WebSocket gesloten:", event.code, event.reason);
      if (mountedRef.current) {
        setIsConnected(false);
        socketRef.current = null;
      }
      
      // Als WebSocket eerder al gefaald heeft of code 1006 (abnormal closure), ga naar polling
      if (wsFailedRef.current || event.code === 1006 || event.code === 1015) {
        startPolling();
        return;
      }
      
      // Normale reconnect poging na 4 seconden
      if (!reconnectTimeoutRef.current && mountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Opnieuw proberen te verbinden...");
          reconnectTimeoutRef.current = null;
          connect();
        }, 4000);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(wsTimeoutId);
      console.error("❌ WebSocket fout:", error);
      wsFailedRef.current = true;
      ws.close();
    };

    socketRef.current = ws;
  }, [password, onMessage, startPolling]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [connect]);

  const sendMessage = (msg: any) => {
    if (socketRef.current && isConnected && connectionMode === "websocket") {
      socketRef.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return { isConnected, sendMessage, connectionMode };
}
