import hashlib
import logging

logger = logging.getLogger(__name__)

class HashService:
    """Service for computing file hashes for change detection."""
    
    @staticmethod
    def compute_file_hash(filepath: str) -> str:
        """Calculates the SHA256 hash of a file on disk."""
        sha256 = hashlib.sha256()
        try:
            with open(filepath, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error computing hash for file {filepath}: {e}")
            raise

    @staticmethod
    def compute_content_hash(content: bytes) -> str:
        """Calculates the SHA256 hash of byte content."""
        sha256 = hashlib.sha256()
        sha256.update(content)
        return sha256.hexdigest()
