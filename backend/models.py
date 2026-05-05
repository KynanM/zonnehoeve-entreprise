from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, JSON, Text, LargeBinary
from sqlalchemy.orm import relationship
from database import Base

class ChatThread(Base):
    __tablename__ = "chat_threads"
    id = Column(String, primary_key=True)  # UUID
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_pinned = Column(Integer, default=0)  # 1 voor gepind, 0 voor niet
    is_archived = Column(Integer, default=0) # 1 voor gearchiveerd, 0 voor niet
    logs = relationship("ChatLog", back_populates="thread", cascade="all, delete-orphan")

class ChatLog(Base):
    __tablename__ = "chat_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    thread_id = Column(String, ForeignKey("chat_threads.id"))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user_prompt = Column(String, nullable=False)
    bot_response = Column(String, nullable=False)
    latency_seconds = Column(Float)
    retrieved_sources = Column(JSON)  # Lijst van gerelateerde bron documenten
    user_feedback = Column(String)  # 'thumbs_up', 'thumbs_down', of null

    thread = relationship("ChatThread", back_populates="logs")

class DocumentMetadata(Base):
    """Bijhouden van bestandshash en timestamp voor proactieve protocol-updates."""
    __tablename__ = "document_metadata"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False, unique=True)
    file_hash = Column(String, nullable=False)  # MD5 of SHA256 hash van het bestand
    last_ingested = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_modified = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)
    outline = Column(JSON, nullable=True)  # Hiërarchische lijst van secties
    summary = Column(Text, nullable=True)  # Korte samenvatting van het document

class DocumentFile(Base):
    """Opslag voor de eigenlijke PDF/Word binaire data."""
    __tablename__ = "document_files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False, unique=True)
    mime_type = Column(String, nullable=False, default="application/pdf")
    data = Column(LargeBinary, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
