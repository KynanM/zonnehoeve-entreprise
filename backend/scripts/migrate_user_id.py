import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating chat_threads table...")
        try:
            # Check if user_id already exists
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='chat_threads' AND column_name='user_id'"))
            if not res.fetchone():
                print("Adding user_id column to chat_threads...")
                await conn.execute(text("ALTER TABLE chat_threads ADD COLUMN user_id VARCHAR"))
                await conn.execute(text("CREATE INDEX ix_chat_threads_user_id ON chat_threads (user_id)"))
                print("Migration successful.")
            else:
                print("Column user_id already exists.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
