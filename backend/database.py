import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

raw_url = (os.getenv("DATABASE_URL") or "postgresql://user:password@localhost:5433/zonnehoeve").strip().strip('"').strip("'")

# Railway versterkt soms `postgres://`, dit is verouderd in SQLAlchemy
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)

if raw_url.startswith("postgresql://"):
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    SYNC_DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
elif raw_url.startswith("postgresql+asyncpg://"):
    DATABASE_URL = raw_url
    SYNC_DATABASE_URL = raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
else:
    DATABASE_URL = raw_url
    SYNC_DATABASE_URL = raw_url

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """Dependency voor FastAPI routes om de database sessie op te halen."""
    async with async_session_maker() as session:
        yield session
