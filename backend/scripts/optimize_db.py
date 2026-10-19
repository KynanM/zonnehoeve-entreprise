
import asyncio
from sqlalchemy import text
from database import engine

async def optimize():
    async with engine.begin() as conn:
        print("Start database optimalisatie...")
        
        # 1. Indexen toevoegen voor snellere dashboard queries
        print("Indexen toevoegen aan chat_logs...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_logs_thread_id ON chat_logs(thread_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs(timestamp);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_logs_user_feedback ON chat_logs(user_feedback);"))
        
        print("Indexen toevoegen aan document_metadata...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_doc_metadata_last_ingested ON document_metadata(last_ingested);"))
        
        # 2. Convert retrieved_sources naar JSONB voor betere performance
        print("Converteren van retrieved_sources naar JSONB...")
        try:
            await conn.execute(text("ALTER TABLE chat_logs ALTER COLUMN retrieved_sources TYPE JSONB USING retrieved_sources::jsonb;"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_logs_sources_gin ON chat_logs USING GIN (retrieved_sources);"))
        except Exception as e:
            print(f"Kon JSONB conversie niet uitvoeren (mogelijk al gebeurd of niet ondersteund): {e}")

        # 3. Foreign Key cascading rules verbeteren (ON DELETE CASCADE)
        print("Foreign key cascading controleren...")
        # Eerst bestaande constraint zoeken en verwijderen indien nodig
        res = await conn.execute(text("""
            SELECT constraint_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'chat_logs' AND column_name = 'thread_id';
        """))
        constraint = res.scalar()
        if constraint:
            print(f"Bestaande constraint {constraint} vervangen door CASCADE...")
            await conn.execute(text(f"ALTER TABLE chat_logs DROP CONSTRAINT {constraint};"))
            await conn.execute(text("""
                ALTER TABLE chat_logs 
                ADD CONSTRAINT chat_logs_thread_id_fkey 
                FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE;
            """))

        print("Database optimalisatie voltooid!")

if __name__ == "__main__":
    asyncio.run(optimize())
