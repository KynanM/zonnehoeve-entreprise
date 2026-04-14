import asyncio
import os
import sys
import time
from sqlalchemy import text
from dotenv import load_dotenv

# Voeg de huidige map toe aan sys.path om imports te laten werken
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from api.rag import setup_rag_chain

async def verify_production_readiness():
    print("🔍 Start Production Readiness Audit...")
    load_dotenv()

    # 1. Check Database Connectie & Extensies
    print("\n--- 1. Database & Extensions ---")
    async with engine.connect() as conn:
        try:
            # Check pgvector
            result = await conn.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector';"))
            ext = result.scalar()
            if ext:
                print("✅ pgvector extensie is aanwezig.")
            else:
                print("❌ pgvector extensie ONTBREEKT in de database!")
            
            # Check tabellen
            result = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"))
            tables = [row[0] for row in result.fetchall()]
            print(f"✅ Gevonden tabellen: {', '.join(tables)}")
            
        except Exception as e:
            print(f"❌ Database error: {e}")

    # 2. Check RAG Chain (Asynchroon)
    print("\n--- 2. RAG Chain Initialization ---")
    start_time = time.time()
    try:
        rag_data = await setup_rag_chain()
        duration = time.time() - start_time
        print(f"✅ RAG Chain succesvol geïnitialiseerd in {duration:.2f}s.")
        print(f"✅ Onderdelen: {', '.join(rag_data.keys())}")
    except Exception as e:
        print(f"❌ RAG Chain error: {e}")

    # 3. Check Environment Variables
    print("\n--- 3. Environment Variables ---")
    required_vars = ["DATABASE_URL", "OPENAI_API_KEY", "NEXT_PUBLIC_API_URL"]
    for var in required_vars:
        val = os.getenv(var)
        if val:
            # Mask sensitive info
            masked = val[:8] + "..." if len(val) > 10 else "***"
            print(f"✅ {var}: Aanwezig ({masked})")
        else:
            print(f"⚠️ {var}: ONTBREEKT!")

    print("\nAudit voltooid.")

if __name__ == "__main__":
    asyncio.run(verify_production_readiness())
