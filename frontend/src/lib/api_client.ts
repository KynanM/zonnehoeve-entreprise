// Alle API calls gaan altijd via de Next.js proxy (/api/* → backend).
// Hierdoor vermijden we CORS problemen: de browser communiceert enkel met de
// eigen frontend server, die server-side doorsturen naar de backend.
// NEXT_PUBLIC_API_URL wordt NIET meer gebruikt - de proxy in next.config.ts regelt dit.
const API_BASE_URL = "";


function getGuestId(): string | null {
  if (typeof window === "undefined") return null;
  let guestId = localStorage.getItem("zonnehoeve-guest-id");
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem("zonnehoeve-guest-id", guestId);
  }
  return guestId;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  
  // Headers samenstellen: geen Content-Type bij FormData (fetch doet dit zelf met boundary)
  const headers: Record<string, string> = { ...options.headers } as Record<string, string>;
  const isFormData = options.body instanceof FormData;
  
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Voeg Guest ID toe voor isolatie van geschiedenis
  const guestId = getGuestId();
  if (guestId) {
    headers["X-Guest-ID"] = guestId;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ API Error aanroep naar ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500)
      });
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`❌ Netwerk of API fout voor ${url}:`, error);
    throw error;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body: any, options?: RequestInit) => 
    request<T>(path, { 
      ...options, 
      method: "POST", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  patch: <T>(path: string, body: any, options?: RequestInit) => 
    request<T>(path, { 
      ...options, 
      method: "PATCH", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "DELETE" }),
  
  // Custom streamer for the chat endpoint
  stream: async (
    path: string, 
    body: any, 
    onChunk: (chunk: string) => void, 
    onLogId?: (id: number | null) => void,
    onSources?: (sources: string[]) => void,
    onThreadId?: (threadId: string) => void
  ) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const guestId = getGuestId();
    if (guestId) {
      headers["X-Guest-ID"] = guestId;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error("Stream error");
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        let foundMarker = true;
        while (foundMarker) {
          foundMarker = false;
          
          // 1. Log ID (__log_id__:123\n or __log_id__:None\n)
          const logIdMatch = buffer.match(/__log_id__:(?:\d+|None)\n/);
          if (logIdMatch) {
            const rawVal = logIdMatch[0].split(':')[1].trim();
            if (onLogId) onLogId(rawVal === 'None' ? null : parseInt(rawVal));
            buffer = buffer.replace(logIdMatch[0], "");
            foundMarker = true;
          }
          
          // 1b. Thread ID (__thread_id__:uuid\n)
          const threadIdMatch = buffer.match(/__thread_id__:([^\n]+)\n/);
          if (threadIdMatch) {
            if (onThreadId) onThreadId(threadIdMatch[1].trim());
            buffer = buffer.replace(threadIdMatch[0], "");
            foundMarker = true;
          }
          
          // 2. Sources (__sources__:a.pdf,b.pdf\n)
          const sourcesMatch = buffer.match(/__sources__:([^\n]*)\n/);
          if (sourcesMatch) {
            const sources = sourcesMatch[1] ? sourcesMatch[1].split(',').filter(s => s) : [];
            if (onSources) onSources(sources);
            buffer = buffer.replace(sourcesMatch[0], "");
            foundMarker = true;
          }

          // 3. Fallback JSON (|JSON|{"log_id":...})
          const jsonMatch = buffer.match(/\|JSON\|(\{.*\})/);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[1]);
              if (onLogId) onLogId(data.log_id ?? null);
              if (onSources) onSources(data.sources ?? []);
            } catch (e) { /* ignore partial json */ }
            buffer = buffer.replace(jsonMatch[0], "");
            foundMarker = true;
          }
        }
        
        // Stuur tekst door als de buffer geen markers meer bevat
        const MARKER_REGEX = /__log_id__:(?:\d+|None)\n|__thread_id__:[^\n]+\n|__sources__:[^\n]*\n|\|JSON\|\{.*\}/g;
        const cleanChunk = buffer.replace(MARKER_REGEX, "");
        if (cleanChunk) {
          onChunk(cleanChunk);
          buffer = buffer.replace(cleanChunk, "");
        }
      }
      // Final flush
      const MARKER_REGEX = /__log_id__:(?:\d+|None)\n|__thread_id__:[^\n]+\n|__sources__:[^\n]*\n|\|JSON\|\{.*\}/g;
      if (buffer) {
        onChunk(buffer.replace(MARKER_REGEX, ""));
      }
    }
  }
};
