import os
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

# We gebruiken hier de psycopg2 connection string omdat Langchain's PGVector (community versie)
# standaard SQLAlchemy + psycopg2 gebruikt.
raw_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/zonnehoeve").strip().strip('"').strip("'")

# Railway versterkt soms `postgres://`, dit is verouderd in SQLAlchemy
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql://", 1)

# Verwijder eventuele async prefixes voor de synchrone vector store
SYNC_DATABASE_URL = raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
# Voeg expliciet de psycopg2 driver toe voor compatibiliteit
SYNC_DATABASE_URL = SYNC_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

def get_embeddings() -> OpenAIEmbeddings:
    """Haalt het embedding model op, zoals gedefinieerd in de MVP."""
    return OpenAIEmbeddings(
        model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    )

def get_vector_store() -> PGVector:
    """Initialiseert en retourneert de PostgreSQL vector store."""
    store = PGVector(
        connection_string=SYNC_DATABASE_URL,
        embedding_function=get_embeddings(),
        collection_name="zonnehoeve_docs",
        # Gebruik JSONB voor metadata opslag (performanter in Postgres)
        use_jsonb=True,
    )
    return store
