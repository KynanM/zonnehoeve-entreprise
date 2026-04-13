// Alle API calls gaan altijd via de Next.js proxy (/api/* → backend).
// Hierdoor vermijden we CORS problemen: de browser communiceert enkel met de
// eigen frontend server, die server-side doorsturen naar de backend.
// NEXT_PUBLIC_API_URL wordt NIET meer gebruikt - de proxy in next.config.ts regelt dit.
const API_BASE_URL = "";


async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ API Error aanroep naar ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500) // Log eerste stukje van de error
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
  post: <T>(path: string, body: any, options?: RequestInit) => request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: any, options?: RequestInit) => request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "DELETE" }),
  
  // Custom streamer for the chat endpoint
  stream: async (
    path: string, 
    body: any, 
    onChunk: (chunk: string) => void, 
    onLogId?: (id: number) => void,
    onSources?: (sources: string[]) => void
  ) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        
        // Match meta-markers in the buffer and strip them
        // 1. Log ID
        const logIdMatch = buffer.match(/__log_id__:(\d+)\n/);
        if (logIdMatch) {
          if (onLogId) onLogId(parseInt(logIdMatch[1]));
          buffer = buffer.replace(logIdMatch[0], "");
        }
        
        // 2. Sources
        const sourcesMatch = buffer.match(/__sources__:([^\n]*)\n/);
        if (sourcesMatch) {
          const sources = sourcesMatch[1] ? sourcesMatch[1].split(',').filter(s => s) : [];
          if (onSources) onSources(sources);
          buffer = buffer.replace(sourcesMatch[0], "");
        }
        
        // If there's anything left in the buffer and it doesn't look like a partial marker, send it
        // We check if it's potentially a partial marker to avoid sending "__log" before the rest arrives
        if (buffer && !buffer.endsWith("__") && !buffer.endsWith("__log_id__:") && !buffer.endsWith("__sources__:")) {
          onChunk(buffer);
          buffer = "";
        }
      }
      // Final flush
      if (buffer) {
        onChunk(buffer);
      }
    }
  }
};
