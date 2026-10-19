import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Adding columns to document_metadata table...")
        try:
            await conn.execute(text("ALTER TABLE document_metadata ADD COLUMN outline JSONB;"))
            print("- Added 'outline' column.")
        except Exception as e:
            print(f"- 'outline' column likely exists: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE document_metadata ADD COLUMN summary TEXT;"))
            print("- Added 'summary' column.")
        except Exception as e:
            print(f"- 'summary' column likely exists: {e}")
            
    await engine.dispose()
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
