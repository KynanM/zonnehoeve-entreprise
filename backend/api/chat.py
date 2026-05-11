from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import ChatThread
from api.auth import verify_admin
from services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    input: str
    chat_history: Optional[List[Message]] = []
    thread_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    log_id: int
    feedback: str  # "thumbs_up" or "thumbs_down"

class ThreadMetadataUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None

@router.post("/")
@router.post("")
async def chat_endpoint(req: ChatRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Streaming endpoint for real-time AI answers, delegating logic to ChatService."""
    try:
        formatted_history = []
        for msg in req.chat_history:
            role = "human" if msg.role in ["user", "human"] else "assistant"
            formatted_history.append((role, msg.content))

        chat_service = ChatService(db, request.app.state)
        
        return StreamingResponse(
            chat_service.handle_chat(req.input, formatted_history, req.thread_id),
            media_type="text/plain"
        )

    except Exception as e:
        logger.error(f"Error in chat_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Interne serverfout")

@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    from models import ChatLog
    from services.socket_manager import manager
    
    log = await db.get(ChatLog, req.log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log niet gevonden")
    
    log.user_feedback = req.feedback
    await db.commit()
    
    await manager.broadcast({
        "type": "feedback_update",
        "data": {"log_id": req.log_id, "feedback": req.feedback}
    })
    await manager.broadcast({"type": "refresh_stats"})
    
    return {"status": "success"}

@router.get("/threads")
async def get_threads(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ChatThread)
        .where(ChatThread.is_archived.is_(False))
        .order_by(ChatThread.is_pinned.desc(), ChatThread.created_at.desc())
    )
    return res.scalars().all()

@router.get("/threads/{thread_id}")
async def get_thread_history(thread_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    res = await db.execute(
        select(ChatThread)
        .options(selectinload(ChatThread.logs))
        .filter(ChatThread.id == thread_id)
    )
    thread = res.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread niet gevonden")
    return thread

@router.patch("/threads/{thread_id}/metadata")
async def update_thread_metadata(thread_id: str, req: ThreadMetadataUpdate, db: AsyncSession = Depends(get_db)):
    thread = await db.get(ChatThread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread niet gevonden")
    
    if req.title is not None:
        thread.title = req.title
    if req.is_pinned is not None:
        thread.is_pinned = req.is_pinned
    if req.is_archived is not None:
        thread.is_archived = req.is_archived
        
    await db.commit()
    await db.refresh(thread)
    return thread

@router.delete("/threads", dependencies=[Depends(verify_admin)])
async def delete_all_threads(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    await db.execute(delete(ChatThread))
    await db.commit()
    return {"status": "success", "message": "Alle gesprekken verwijderd"}

@router.delete("/threads/{thread_id}", dependencies=[Depends(verify_admin)])
async def delete_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    thread = await db.get(ChatThread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread niet gevonden")
    await db.delete(thread)
    await db.commit()
    return {"status": "success"}
