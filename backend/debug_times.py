import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.append(os.getcwd())
from database import async_session_maker
from models import ChatLog
from sqlalchemy import select

async def check():
    async with async_session_maker() as db:
        res = await db.execute(select(ChatLog.timestamp).order_by(ChatLog.timestamp.desc()).limit(5))
        times = res.fetchall()
        print(f"Current time (aware): {datetime.now(timezone.utc)}")
        print(f"Current time (naive): {datetime.now(timezone.utc).replace(tzinfo=None)}")
        for t in times:
            print(f"Log timestamp: {t[0]} (type: {type(t[0])})")

if __name__ == "__main__":
    asyncio.run(check())
