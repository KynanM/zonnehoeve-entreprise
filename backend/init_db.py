import asyncio
from database import engine, Base
from sqlalchemy import text
from models import ChatThread, ChatLog, DocumentMetadata, DocumentFile  # noqa: F401

async def init():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
            print("Vector extension OK")
        except Exception as e:
            print(f"Error vector extension: {e}")
        await conn.run_sync(Base.metadata.create_all)
        print("Init done")

if __name__ == "__main__":
    asyncio.run(init())
