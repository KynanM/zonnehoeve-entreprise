import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def test_db():
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to: {db_url}")
    try:
        engine = create_async_engine(db_url)
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"Success: {result.fetchone()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_db())
