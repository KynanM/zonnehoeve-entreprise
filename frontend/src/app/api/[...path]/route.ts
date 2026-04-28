import { NextRequest, NextResponse } from "next/server";

// Verplicht Node.js runtime zodat process.env beschikbaar is op runtime (Railway)
export const runtime = "nodejs";

// Verbeterde Backend URL resolutie met interne networking support
const getBackendUrl = () => {
  return (
    process.env.BACKEND_URL || 
    process.env.NEXT_PUBLIC_API_URL || 
    "https://zonnehoeve-entreprise-backend-production.up.railway.app"
  ).replace(/\/$/, "");
};

const BACKEND_URL = getBackendUrl();

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const path = params.path?.join("/") || "";
  const search = req.nextUrl.search || "";
  const originalPathname = req.nextUrl.pathname;
  const trailingSlash = originalPathname.endsWith("/") ? "/" : "";
  
  const targetUrl = `${BACKEND_URL}/api/${path}${trailingSlash}${search}`;
  
  // --- LOOPBACK PROTECTION ---
  const requestHost = req.headers.get("host") || "";
  try {
    const targetHost = new URL(targetUrl).host;
    if (requestHost && targetHost === requestHost) {
      console.error(`[PROXY LOOPBACK DETECTED] Proxy probeert zichzelf aan te roepen op ${targetUrl}. Check NEXT_PUBLIC_API_URL.`);
      return NextResponse.json(
        {
          error: "Proxy configuratie fout: Loopback gedetecteerd",
          message: "De BACKEND_URL (of NEXT_PUBLIC_API_URL) wijst naar de frontend zelf. Dit veroorzaakt een oneindige lus.",
          host: requestHost,
          target: targetUrl,
          tip: "Zorg dat BACKEND_URL in Railway naar de backend-service wijst, niet naar de frontend."
        },
        { status: 400 }
      );
    }
  } catch (e) {
    // URL parsing failed, let fetch handle it
  }

  try {
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      // Strippen van headers die loops of proxy-fouten kunnen veroorzaken
      if (![
        "host", "content-length", "connection", "expect", "keep-alive", 
        "transfer-encoding", "accept-encoding", "cf-ray", "cf-connecting-ip",
        "x-forwarded-for", "x-forwarded-proto", "x-forwarded-host", "x-real-ip",
        "origin", "referer"
      ].includes(k)) {
        headers.set(key, value);
      }
    });

    // Diagnostische headers voor de backend
    headers.set("X-Proxy-Source", "Nextjs-Route-Handler");
    headers.set("X-Proxy-Target", targetUrl);
    headers.set("accept-encoding", "identity");
    headers.set("cache-control", "no-cache");

    const isChatStream = req.method === "POST" && (path === "chat" || path === "chat/");
    
    let body: any = undefined;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      try {
        body = await req.clone().blob();
      } catch (e) {
        console.warn(`[PROXY] Kon body niet clonen voor ${req.method} ${path}:`, e);
        body = undefined;
      }
    }

    const start = Date.now();
    console.log(`[PROXY] START ${req.method} ${originalPathname} → ${targetUrl}`);

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error - node-fetch / undici support
      duplex: body ? "half" : undefined,
      signal: isChatStream ? undefined : AbortSignal.timeout(45000), // Iets langere timeout
      redirect: "follow"
    });

    const duration = Date.now() - start;
    console.log(`[PROXY] BACKEND KLAAR: ${backendRes.status} ${backendRes.statusText} (${duration}ms)`);

    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      // Strippen van headers die loops of proxy-fouten kunnen veroorzaken
      // Maar we houden content-type en content-disposition strikt bij
      if (!["content-encoding", "transfer-encoding", "connection", "content-length", "set-cookie", "server", "x-powered-by"].includes(k)) {
        responseHeaders.set(key, value);
      }
    });

    // Zorg dat het document getoond mag worden in een iframe (SAMEORIGIN of verwijderen voor proxy)
    responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
    responseHeaders.set("Content-Security-Policy", "frame-ancestors 'self'");

    // Forceren van inline weergave voor documenten om downloads te voorkomen
    if (path.includes("documents/") && !search.includes("download=true")) {
      responseHeaders.set("Content-Disposition", "inline");
      // Zorg dat PDF's altijd het juiste type hebben
      if (path.toLowerCase().endsWith(".pdf")) {
        responseHeaders.set("Content-Type", "application/pdf");
      }
    }

    if (backendRes.status !== 200) {
        console.log(`[PROXY DEBUG] Backend Response headers:`, Object.fromEntries(backendRes.headers.entries()));
    }

    // WE STREAMEN ALLES DIRECT: Dit is de meest betrouwbare manier voor binaire data (PDF)
    // NextResponse(backendRes.body) is de standaard manier in Next.js om een stream te proxyen.
    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    const errorType = error.name || "UnknownError";
    const errorMessage = error.message || String(error);
    
    console.error(`[PROXY ERROR] ${req.method} ${targetUrl} [${errorType}]:`, errorMessage);
    
    return NextResponse.json(
      {
        error: "Proxy communicatie fout",
        method: req.method,
        target: targetUrl,
        type: errorType,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        tip: "Als de error 'Application failed to respond' is, controleer dan of de backend-service in Railway draait en bereikbaar is."
      },
      { status: 502 }
    );
  }
}

