import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin import router as admin_router
from api.admin_ws import router as admin_ws_router
from api.chat import router as chat_router
from api.documents import router as documents_router
from api.quality import router as quality_router
from api.rag import setup_rag_chain
from database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure pgvector extension and tables exist
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            print("[OK] pgvector extensie geactiveerd.")
        except Exception as e:
            print(f"[ERROR] Kon pgvector extensie niet automatisch laden: {e}")

        await conn.run_sync(Base.metadata.create_all)
        print("[OK] Database tabellen gecontroleerd/aangemaakt.")
        
        # Expliciete kolommigratie: create_all voegt geen kolommen toe aan bestaande tabellen.
        # Deze ALTER TABLE statements zijn idempotent (IF NOT EXISTS).
        migration_statements = [
            "ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE document_metadata ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
            "ALTER TABLE document_metadata ADD COLUMN IF NOT EXISTS last_ingested TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
            "ALTER TABLE document_metadata ADD COLUMN IF NOT EXISTS summary TEXT;",
            "ALTER TABLE document_metadata ADD COLUMN IF NOT EXISTS outline JSONB;",
        ]
        for stmt in migration_statements:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                print(f"[WARN] Migratie overgeslagen ({stmt[:40]}...): {e}")
        print("[OK] Kolommigraties uitgevoerd.")

    try:
        rag_data = await setup_rag_chain()
        app.state.rag_chain = rag_data
        app.state.llm = rag_data.get("llm")
        print("[OK] RAG Chain vooraf ingeladen.")
    except Exception as e:
        print(f"[ERROR] RAG Chain faalde om vooraf te laden: {e}")
        app.state.rag_chain = None
        app.state.llm = None

    yield


app = FastAPI(
    title="Zonnehoeve Chatbot API",
    description="Enterprise backend API for Zonnehoeve Chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuratie
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "http://localhost:3000")
if CORS_ORIGINS_RAW == "*" and os.getenv("ENVIRONMENT") != "development":
    print(
        "WARNING: CORS origin ingesteld op '*', dit is onveilig voor productie. Fallback naar strikte modus."
    )
    cors_origins = ["http://localhost:3000"]
elif CORS_ORIGINS_RAW == "*" and os.getenv("ENVIRONMENT") == "development":
    cors_origins = ["*"]
else:
    cors_origins = [
        origin.strip().rstrip("/") for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_origins != ["*"],  # Credentials niet toegestaan met '*'
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welkom bij de Zonnehoeve Chatbot API!"}


@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Uitgebreide health check inclusief database status."""
    db_status = "error"
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {"status": "ok", "service": "Zonnehoeve API", "database": db_status}


app.include_router(chat_router)
app.include_router(admin_router)
app.include_router(admin_ws_router)
app.include_router(documents_router)
app.include_router(quality_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
