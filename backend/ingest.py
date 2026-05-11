import os
import asyncio
import logging
from database import async_session_maker
from services.ingestion_service import IngestionService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

RAW_DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "raw_documents"))

async def process_single_file_from_memory(filename: str, content: bytes) -> None:
    """Entry point for processing a single file (used by API background tasks)."""
    async with async_session_maker() as db_session:
        service = IngestionService(db_session)
        await service.process_file(filename, content)

async def main():
    """CLI entry point for syncing the local raw_documents directory."""
    logger.info("Starting batch ingestion...")
    async with async_session_maker() as db_session:
        service = IngestionService(db_session)
        await service.sync_local_directory(RAW_DATA_PATH)
    logger.info("Batch ingestion completed.")

if __name__ == "__main__":
    asyncio.run(main())
