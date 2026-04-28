import os
import psycopg2
from dotenv import load_dotenv

def test_conn():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    print(f"Testing sync connection to: {url[:25]}...")
    # psycopg2 needs postgresql:// prefix
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        print(f"Sync connection successful! Result: {cur.fetchone()[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Sync connection failed: {e}")

if __name__ == "__main__":
    test_conn()
