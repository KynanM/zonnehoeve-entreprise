
import asyncio
from sqlalchemy import text
from database import engine

async def inspect():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';"))
        tables = res.fetchall()
        print(f"Tables: {tables}")
        
        for table in tables:
            tname = table[0]
            print(f"\n--- {tname} ---")
            res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{tname}';"))
            for col in res.fetchall():
                print(f"  {col[0]}: {col[1]}")
            
            res = await conn.execute(text(f"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '{tname}';"))
            for idx in res.fetchall():
                print(f"  Index: {idx[0]} - {idx[1]}")

if __name__ == "__main__":
    asyncio.run(inspect())
