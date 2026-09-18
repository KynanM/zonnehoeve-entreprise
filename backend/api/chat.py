from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import ChatThread
from api import auth as api_auth
from services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

async def get_guest_id(request: Request) -> Optional[str]:
    """Extraheert het Guest ID uit de headers voor gebruikersisolatie."""
    return request.headers.get("X-Guest-ID")

async def is_admin_request(request: Request) -> bool:
    """Controleert of het verzoek van een admin komt (bevat geldige admin key)."""
    admin_key = request.headers.get("x-admin-key")
    expected = api_auth.ADMIN_API_KEY
    return expected is not None and admin_key == expected

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
        user_id = await get_guest_id(request)
        
        return StreamingResponse(
            chat_service.handle_chat(req.input, formatted_history, req.thread_id, user_id=user_id),
            media_type="text/plain"
        )

    except Exception as e:
        logger.error(f"Error in chat_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Interne serverfout")

@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, request: Request, db: AsyncSession = Depends(get_db)):
    from models import ChatLog
    from sqlalchemy.orm import selectinload
    from services.socket_manager import manager
    
    user_id = await get_guest_id(request)
    is_admin = await is_admin_request(request)
    
    # Gebruik join + selectinload om eigenaarschap te controleren en relatie te laden
    res = await db.execute(
        select(ChatLog)
        .options(selectinload(ChatLog.thread))
        .join(ChatThread)
        .where(ChatLog.id == req.log_id)
    )
    log = res.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log niet gevonden")
    
    # Controleer eigenaarschap (admins mogen alles)
    if not is_admin and user_id and log.thread.user_id != user_id:
        raise HTTPException(status_code=403, detail="Geen toegang tot deze feedback")
    
    log.user_feedback = req.feedback
    await db.commit()
    
    await manager.broadcast({
        "type": "feedback_update",
        "data": {"log_id": req.log_id, "feedback": req.feedback}
    })
    await manager.broadcast({"type": "refresh_stats"})
    
    return {"status": "success"}

@router.get("/threads")
async def get_threads(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_guest_id(request)
        is_admin = await is_admin_request(request)
        
        query = select(ChatThread).where(ChatThread.is_archived.is_(False))
        
        if not is_admin:
            if user_id:
                query = query.where(ChatThread.user_id == user_id)
            else:
                # Als er geen guest ID is en geen admin, toon dan niets
                return []
            
        res = await db.execute(
            query.order_by(ChatThread.is_pinned.desc(), ChatThread.created_at.desc())
        )
        return res.scalars().all()
    except Exception as e:
        logger.warning(f"get_threads geavanceerde query mislukt ({e}), terugval naar minimale query")
        try:
            await db.rollback()
            # Selecteer enkel de kolommen die we ZEKER weten dat bestaan
            from sqlalchemy import text
            if is_admin:
                res = await db.execute(
                    text("SELECT id, title, created_at FROM chat_threads ORDER BY created_at DESC")
                )
            elif user_id:
                res = await db.execute(
                    text("SELECT id, title, created_at FROM chat_threads WHERE user_id = :uid ORDER BY created_at DESC"),
                    {"uid": user_id}
                )
            else:
                return []
            rows = res.fetchall()
            return [{"id": r[0], "title": r[1], "created_at": r[2], "is_pinned": False, "is_archived": False} for r in rows]
        except Exception as e2:
            logger.error(f"get_threads ook minimale query mislukt: {e2}")
            return []


@router.get("/threads/{thread_id}")
async def get_thread_history(thread_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    user_id = await get_guest_id(request)
    
    res = await db.execute(
        select(ChatThread)
        .options(selectinload(ChatThread.logs))
        .filter(ChatThread.id == thread_id)
    )
    thread = res.scalar_one_or_none()
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread niet gevonden")
    
    # Controleer eigenaarschap (admins mogen alles zien)
    is_admin = await is_admin_request(request)
    if not is_admin and user_id and thread.user_id != user_id:
        raise HTTPException(status_code=403, detail="Geen toegang tot dit gesprek")
        
    return thread

@router.patch("/threads/{thread_id}/metadata")
async def update_thread_metadata(thread_id: str, req: ThreadMetadataUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        user_id = await get_guest_id(request)
        thread = await db.get(ChatThread, thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread niet gevonden")
        
        # Controleer eigenaarschap (admins mogen alles bijwerken)
        is_admin = await is_admin_request(request)
        if not is_admin and user_id and thread.user_id != user_id:
            raise HTTPException(status_code=403, detail="Geen toegang tot dit gesprek")
        
        if req.title is not None:
            thread.title = req.title
        if req.is_pinned is not None:
            try:
                thread.is_pinned = req.is_pinned
            except Exception:
                pass
        if req.is_archived is not None:
            try:
                thread.is_archived = req.is_archived
            except Exception:
                pass
            
        await db.commit()
        await db.refresh(thread)
        return thread
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fout bij bijwerken metadata: {e}")
        # Als kolommen ontbreken, commit enkel wat kan
        await db.rollback()
        return {"id": thread_id, "status": "partial_success_or_skipped"}

@router.delete("/threads")
async def delete_all_threads(request: Request, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    is_admin = await is_admin_request(request)
    user_id = await get_guest_id(request)
    if is_admin:
        await db.execute(delete(ChatThread))
    elif user_id:
        await db.execute(delete(ChatThread).where(ChatThread.user_id == user_id))
    else:
        raise HTTPException(status_code=403, detail="Geen toegang")
    await db.commit()
    return {"status": "success", "message": "Alle gesprekken verwijderd"}

@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    thread = await db.get(ChatThread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread niet gevonden")
    is_admin = await is_admin_request(request)
    user_id = await get_guest_id(request)
    if not is_admin and (not user_id or thread.user_id != user_id):
        raise HTTPException(status_code=403, detail="Geen toegang tot dit gesprek")
    await db.delete(thread)
    await db.commit()
    return {"status": "success"}
