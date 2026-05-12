import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import uuid
from sqlalchemy import select
from database import engine, async_session_maker
from models import ChatThread

async def run():
    async with async_session_maker() as session:
        thread_id = str(uuid.uuid4())
        thread = ChatThread(id=thread_id, title="Test insert")
        session.add(thread)
        try:
            await session.commit()
            print("Insert succeeded!")
        except Exception as e:
            print("Insert failed:", e)

if __name__ == "__main__":
    asyncio.run(run())
