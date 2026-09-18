
import { useState, useEffect, useCallback, useRef } from "react";

interface SocketMessage {
  type: string;
  data?: any;
}

export function useAdminSocket(password: string, onMessage: (msg: SocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "polling" | "disconnected">("disconnected");
  const socketRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inPollingModeRef = useRef(false);
  const mountedRef = useRef(true);

  // Eenmalige cleanup van polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // HTTP Polling fallback — PERMANENT, geen WS-reconnects meer daarna
  const startPollingPermanently = useCallback(() => {
    if (inPollingModeRef.current) return; // Voorkom dubbele polling
    inPollingModeRef.current = true;
    
    stopPolling();
    
    if (!mountedRef.current) return;
    setConnectionMode("polling");
    setIsConnected(true);
    console.log("📡 Polling modus actief (30s interval) — WebSocket niet beschikbaar");
    
    // Stuur direct een refresh
    onMessage({ type: "refresh_stats" });
    
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        onMessage({ type: "refresh_stats" });
      }
    }, 30000);
  }, [onMessage, stopPolling]);

  useEffect(() => {
    mountedRef.current = true;
    if (!password) return;

    // Bepaal de backend URL voor WebSocket via NEXT_PUBLIC_API_URL.
    // Als dit niet ingesteld is (undefined), skip WebSocket direct en ga naar polling.
    const backendApiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendApiUrl || backendApiUrl.includes("localhost") || backendApiUrl.includes("127.0.0.1")) {
      // Geen geldige productie backend URL → ga direct naar polling
      console.log("ℹ️ Geen backend URL geconfigureerd voor WebSocket — direct polling starten");
      startPollingPermanently();
      return;
    }

    const cleanHost = backendApiUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/\/api$/, "");
    const protocol = backendApiUrl.startsWith("https") ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${cleanHost}/ws/admin?token=${password}`;

    console.log("🔌 Eenmalige WebSocket poging naar admin-kanaal");

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn("⚠️ WebSocket aanmaken mislukt, start polling:", e);
      startPollingPermanently();
      return;
    }

    // Timeout: als niet verbonden binnen 8 seconden → polling (GEEN herpoging)
    const wsTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn("⏱️ WebSocket timeout — permanent naar polling");
        ws.close();
        startPollingPermanently();
      }
    }, 8000);

    ws.onopen = () => {
      clearTimeout(wsTimeout);
      if (!mountedRef.current) { ws.close(); return; }
      console.log("✅ WebSocket verbonden");
      setIsConnected(true);
      setConnectionMode("websocket");
      socketRef.current = ws;
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
      clearTimeout(wsTimeout);
      socketRef.current = null;
      if (!mountedRef.current) return;
      
      console.log("🔌 WebSocket gesloten:", event.code);
      setIsConnected(false);
      
      // Bij elke sluiting: permanent naar polling, GEEN herverbinding
      startPollingPermanently();
    };

    ws.onerror = () => {
      // Fout wordt afgehandeld in onclose
    };

    return () => {
      mountedRef.current = false;
      clearTimeout(wsTimeout);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      stopPolling();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]); // Bewust geen reconnect dependencies — éénmalige setup

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  const sendMessage = (msg: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return { isConnected, sendMessage, connectionMode };
}
