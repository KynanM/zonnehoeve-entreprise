import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const rawBackendUrl = process.env.BACKEND_URL || "(niet ingesteld)";
  const cleanBackendUrl = (
    process.env.BACKEND_URL || 
    process.env.NEXT_PUBLIC_API_URL || 
    "https://zonnehoeve-entreprise-backend-production.up.railway.app"
  ).replace(/\/$/, "");

  let backendHealth: string = "niet getest";
  let backendDocuments: string = "niet getest";
  let fetchError: string = "";

  try {
    const healthRes = await fetch(`${cleanBackendUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    backendHealth = `${healthRes.status} ${healthRes.statusText} → ${await healthRes.text()}`;
  } catch (e: unknown) {
    fetchError = String(e);
    backendHealth = `FOUT: ${fetchError}`;
  }

  try {
    const docsRes = await fetch(`${cleanBackendUrl}/api/documents`, {
      signal: AbortSignal.timeout(5000),
    });
    const text = await docsRes.text();
    backendDocuments = `${docsRes.status} ${docsRes.statusText} → ${text.substring(0, 200)}`;
  } catch (e: unknown) {
    backendDocuments = `FOUT: ${String(e)}`;
  }

  let backendThreads: string = "niet getest";
  try {
    const threadsRes = await fetch(`${cleanBackendUrl}/api/chat/threads`, {
      signal: AbortSignal.timeout(5000),
    });
    const text = await threadsRes.text();
    backendThreads = `${threadsRes.status} ${threadsRes.statusText} → ${text.substring(0, 200)}`;
  } catch (e: unknown) {
    backendThreads = `FOUT: ${String(e)}`;
  }

  return NextResponse.json({
    debug: {
      BACKEND_URL_raw: rawBackendUrl,
      BACKEND_URL_clean: cleanBackendUrl,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "(niet ingesteld)",
      NODE_ENV: process.env.NODE_ENV,
      TIMESTAMP: new Date().toISOString()
    },
    tests: {
      backendHealth,
      backendDocuments,
      backendThreads,
    },
  });
}
