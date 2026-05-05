from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import logging
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db, async_session_maker
from models import ChatThread, ChatLog
from api.auth import verify_admin

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
    is_pinned: Optional[int] = None
    is_archived: Optional[int] = None

async def create_chat_log(thread_id: str, user_prompt: str) -> int:
    """Maakt een nieuwe chat-log aan in de database."""
    async with async_session_maker() as db:
        res = await db.execute(select(ChatThread).filter(ChatThread.id == thread_id))
        thread = res.scalar_one_or_none()
        if not thread:
            thread = ChatThread(id=thread_id, title=user_prompt[:50])
            db.add(thread)
            await db.flush()
        
        new_log = ChatLog(
            thread_id=thread_id,
            user_prompt=user_prompt,
            bot_response="", 
            retrieved_sources=[]
        )
        db.add(new_log)
        await db.commit()
        await db.refresh(new_log)
        return new_log.id

async def update_chat_log(log_id: int, response: str, sources: List[str], latency: float):
    """Update de bestaande log met de volledige respons en bronnen."""
    async with async_session_maker() as db:
        log = await db.get(ChatLog, log_id)
        if log:
            log.bot_response = response
            log.retrieved_sources = sources
            log.latency_seconds = latency
            await db.commit()

@router.post("/")
@router.post("")
async def chat_endpoint(req: ChatRequest, background_tasks: BackgroundTasks, request: Request):
    """Streaming endpoint voor real-time AI antwoorden."""
    start_time = time.time()
    try:
        formatted_history = []
        for msg in req.chat_history:
            role = "human" if msg.role in ["user", "human"] else "assistant"
            formatted_history.append((role, msg.content))

        # 1. Greeting Detector
        greetings = ["hallo", "hoi", "goedendag", "hi", "hey", "goedemorgen", "goedemiddag", "goedenavond"]
        thanks = ["bedankt", "dankje", "dank u", "thanks", "vriendelijk bedankt", "top", "super", "merci"]
        normalized_input = req.input.lower().strip().translate(str.maketrans('', '', '.,!?'))
        is_greeting = any(normalized_input == g for g in greetings) or any(normalized_input == t for t in thanks)

        # 2. Maak alvast de log aan
        thread_id = req.thread_id or str(uuid.uuid4())
        log_id = await create_chat_log(thread_id, req.input)

        async def stream_generator():
            full_response = ""
            try:
                # Altijd eerst de log_id sturen voor de frontend
                yield f"__log_id__:{log_id}\n"

                sources = []
                if not is_greeting:
                    # Get chain lazily from app state
                    rag_chain = request.app.state.rag_chain
                    if not rag_chain:
                        yield "\n\n[Systeemfout: RAG Chain niet beschikbaar.]"
                        return
                    
                    # 3. Haal bronnen op (RAG)
                    retrieved_docs = await rag_chain["retrieval"].ainvoke({
                        "input": req.input,
                        "chat_history": formatted_history
                    })
                    
                    # Verrijk bronnen met meta-data voor de frontend (bijv. pagina's)
                    sources_data = []
                    for doc in retrieved_docs:
                        src = os.path.basename(doc.metadata.get("source", "onbekend"))
                        page = doc.metadata.get("page", "?")
                        sources_data.append(f"{src}#page={page}")
                    
                    sources = list(set(sources_data))
                    yield f"__sources__:{','.join(sources)}\n"

                    # 4. Start de stream van de RAG chain
                    rag_chain_data = request.app.state.rag_chain
                    async for chunk in rag_chain_data["generation"].astream({
                        "input": req.input,
                        "chat_history": formatted_history
                    }):
                        full_response += chunk
                        yield chunk
                else:
                    # Direct antwoord voor begroetingen zonder RAG
                    yield "__sources__:\n" # Lege bronnen
                    rag_chain_data = request.app.state.rag_chain
                    # Robuuste LLM toegang via de state
                    llm = request.app.state.llm if hasattr(request.app.state, 'llm') else rag_chain_data["generation"].middle[1]
                    prompt_greeting = (
                        "Je bent de Digitale Gids van Zonnehoeve. "
                        "De medewerker begroet je of bedankt je. "
                        "Reageer kort, vriendelijk en professioneel in het Nederlands. "
                        "Vraag of je ergens mee kunt helpen als het een begroeting is. "
                        f"Input: {req.input}"
                    )
                    async for chunk in llm.astream(prompt_greeting):
                        content = chunk.content
                        full_response += content
                        yield content

                # 5. Update de log in de achtergrond
                latency = time.time() - start_time
                background_tasks.add_task(
                    update_chat_log, 
                    log_id, 
                    full_response, 
                    sources,
                    latency
                )
            except Exception as e:
                logger.error(f"Fout tijdens streaming: {e}", exc_info=True)
                yield "\n\n[Systeemfout: Er ging iets mis bij het genereren van het antwoord.]"

        return StreamingResponse(stream_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Fout in chat_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Interne serverfout")

@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    log = await db.get(ChatLog, req.log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log niet gevonden")
    log.user_feedback = req.feedback
    await db.commit()
    return {"status": "success"}

@router.get("/threads")
async def get_threads(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ChatThread)
        .where(ChatThread.is_archived == 0)
        .order_by(ChatThread.is_pinned.desc(), ChatThread.created_at.desc())
    )
    return res.scalars().all()

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
