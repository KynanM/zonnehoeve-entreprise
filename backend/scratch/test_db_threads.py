import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import select, text
from database import engine, get_db
from models import ChatThread

async def run():
    async with engine.connect() as conn:
        print("Checking raw chat_threads:")
        res = await conn.execute(text("SELECT id, title, created_at, is_pinned, is_archived FROM chat_threads"))
        for row in res.fetchall():
            print(row)
        
        print("\nChecking advanced query:")
        try:
            res = await conn.execute(
                select(ChatThread)
                .where(ChatThread.is_archived.is_(False))
            )
            for row in res.fetchall():
                print(row)
        except Exception as e:
            print("Advanced query failed:", e)

if __name__ == "__main__":
    asyncio.run(run())
