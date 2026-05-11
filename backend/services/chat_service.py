import os
import logging
import time
import uuid
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import ChatThread, ChatLog
from services.socket_manager import manager

logger = logging.getLogger(__name__)

class ChatService:
    """Service for handling chat business logic, RAG coordination, and logging."""

    def __init__(self, db: AsyncSession, app_state: Any):
        self.db = db
        self.app_state = app_state

    async def handle_chat(self, user_input: str, chat_history: List[Tuple[str, str]], thread_id: Optional[str] = None):
        """Processes a chat request and yields chunks of the response."""
        start_time = time.time()
        thread_id = thread_id or str(uuid.uuid4())

        # 1. Detect Greetings/Thanks
        is_simple_interaction, response_type = self._detect_simple_interaction(user_input)

        log_id = None
        full_response = ""
        sources = []

        try:
            # 2. Create Initial Log
            try:
                log_id = await self.create_chat_log(thread_id, user_input)
                yield f"__log_id__:{log_id}\n"
            except Exception as e:
                logger.error(f"Error creating chat log: {e}")
                yield "__log_id__:None\n"

            if not is_simple_interaction:
                # 3. RAG Flow
                rag_chain = getattr(self.app_state, "rag_chain", None)
                if not rag_chain:
                    yield "\n\n[Systeemfout: RAG Chain niet beschikbaar.]"
                    return

                # Retrieve sources
                retrieved_docs = await rag_chain["retrieval"].ainvoke({
                    "input": user_input,
                    "chat_history": chat_history
                })
                
                sources = list(set([
                    f"{os.path.basename(doc.metadata.get('source', 'onbekend'))}#page={doc.metadata.get('page', '?')}"
                    for doc in retrieved_docs
                ]))
                yield f"__sources__:{','.join(sources)}\n"

                # Generate streaming response
                async for chunk in rag_chain["generation"].astream({
                    "input": user_input,
                    "chat_history": chat_history
                }):
                    full_response += chunk
                    yield chunk
            else:
                # 4. Simple Interaction Flow (Greeting/Thanks)
                yield "__sources__:\n"
                llm = getattr(self.app_state, "llm", None)
                prompt = self._get_simple_interaction_prompt(user_input, response_type)
                
                async for chunk in llm.astream(prompt):
                    content = chunk.content
                    full_response += content
                    yield content

            # 5. Finalize Log
            if log_id:
                try:
                    latency = time.time() - start_time
                    await self.update_chat_log(log_id, full_response, sources, latency)
                except Exception as e:
                    logger.error(f"Error updating chat log: {e}")

        except Exception as e:
            logger.error(f"Error in handle_chat: {e}", exc_info=True)
            yield "\n\n[Systeemfout: Er ging iets mis bij het genereren van het antwoord.]"

    def _detect_simple_interaction(self, user_input: str) -> Tuple[bool, str]:
        greetings = ["hallo", "hoi", "goedendag", "hi", "hey", "goedemorgen", "goedemiddag", "goedenavond"]
        thanks = ["bedankt", "dankje", "dank u", "thanks", "vriendelijk bedankt", "top", "super", "merci"]
        normalized = user_input.lower().strip().translate(str.maketrans('', '', '.,!?'))
        
        if any(normalized == g for g in greetings):
            return True, "greeting"
        if any(normalized == t for t in thanks):
            return True, "thanks"
        return False, ""

    def _get_simple_interaction_prompt(self, user_input: str, response_type: str) -> str:
        return (
            "Je bent de Digitale Gids van Zonnehoeve. "
            "De medewerker begroet je of bedankt je. "
            "Reageer kort, vriendelijk en professioneel in het Nederlands. "
            f"Vraag of je ergens mee kunt helpen als het een {response_type} is. "
            f"Input: {user_input}"
        )

    async def create_chat_log(self, thread_id: str, user_prompt: str) -> int:
        res = await self.db.execute(select(ChatThread).filter(ChatThread.id == thread_id))
        thread = res.scalar_one_or_none()
        if not thread:
            thread = ChatThread(id=thread_id, title=user_prompt[:50])
            self.db.add(thread)
            await self.db.flush()
        
        new_log = ChatLog(
            thread_id=thread_id,
            user_prompt=user_prompt,
            bot_response="", 
            retrieved_sources=[]
        )
        self.db.add(new_log)
        await self.db.commit()
        await self.db.refresh(new_log)
        return new_log.id

    async def update_chat_log(self, log_id: int, response: str, sources: List[str], latency: float):
        log = await self.db.get(ChatLog, log_id)
        if log:
            log.bot_response = response
            log.retrieved_sources = sources
            log.latency_seconds = latency
            await self.db.commit()
            
            await manager.broadcast({
                "type": "new_log",
                "data": {
                    "id": log.id,
                    "thread_id": log.thread_id,
                    "timestamp": log.timestamp.isoformat() if hasattr(log.timestamp, 'isoformat') else str(log.timestamp),
                    "user_prompt": log.user_prompt,
                    "bot_response": log.bot_response,
                    "latency_seconds": log.latency_seconds,
                    "retrieved_sources": log.retrieved_sources,
                    "user_feedback": log.user_feedback
                }
            })
            await manager.broadcast({"type": "refresh_stats"})
