from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text, LargeBinary, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base

class ChatThread(Base):
    """Container voor een gesprekssessie tussen een medewerker en de AI."""
    __tablename__ = "chat_threads"
    id = Column(String, primary_key=True)  # UUID
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True)
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    logs = relationship("ChatLog", back_populates="thread", cascade="all, delete-orphan")

class ChatLog(Base):
    """Individuele interactie (vraag/antwoord) binnen een ChatThread."""
    __tablename__ = "chat_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    thread_id = Column(String, ForeignKey("chat_threads.id", ondelete="CASCADE"), index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True)
    user_prompt = Column(String, nullable=False)
    bot_response = Column(String, nullable=False)
    latency_seconds = Column(Float)
    retrieved_sources = Column(JSONB)  # Lijst van gerelateerde bron documenten
    user_feedback = Column(String, index=True)  # 'thumbs_up', 'thumbs_down', of null

    thread = relationship("ChatThread", back_populates="logs")

class DocumentMetadata(Base):
    """Houdt bestandshashes en door AI gegenereerde metadata bij voor documenten."""
    __tablename__ = "document_metadata"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False, unique=True)
    file_hash = Column(String, nullable=False)  # SHA256 hash
    last_ingested = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True)
    last_modified = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    notes = Column(Text, nullable=True)
    outline = Column(JSON, nullable=True)  # Hiërarchische lijst van secties
    summary = Column(Text, nullable=True)  # Korte samenvatting van het document

class DocumentFile(Base):
    """Binaire opslag voor documenten (PDF/DOCX) ten behoeve van de viewer."""
    __tablename__ = "document_files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False, unique=True)
    mime_type = Column(String, nullable=False, default="application/pdf")
    data = Column(LargeBinary, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
