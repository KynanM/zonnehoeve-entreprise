import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import text
from database import engine

async def run():
    async with engine.begin() as conn:
        try:
            print("Altering is_pinned...")
            await conn.execute(text("ALTER TABLE chat_threads ALTER COLUMN is_pinned TYPE BOOLEAN USING CASE WHEN is_pinned = 1 THEN TRUE ELSE FALSE END;"))
            print("Altering is_archived...")
            await conn.execute(text("ALTER TABLE chat_threads ALTER COLUMN is_archived TYPE BOOLEAN USING CASE WHEN is_archived = 1 THEN TRUE ELSE FALSE END;"))
            print("Successfully updated column types to BOOLEAN!")
        except Exception as e:
            print("Failed to alter table:", e)

if __name__ == "__main__":
    asyncio.run(run())
