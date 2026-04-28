import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def test_asyncpg():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    print(f"Testing direct asyncpg to: {url[:25]}...")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgres://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgres://", 1)
        
    try:
        conn = await asyncpg.connect(url, timeout=60)
        row = await conn.fetchrow("SELECT 1")
        print(f"Direct asyncpg success! Result: {row[0]}")
        await conn.close()
    except Exception as e:
        print(f"Direct asyncpg failed: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(test_asyncpg())
