import os
import logging
import hashlib
from typing import List

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnableBranch
from langchain.retrievers import EnsembleRetriever, ContextualCompressionRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

from vector_store import get_vector_store
from api.prompts import RAG_SYSTEM_PROMPT, CONTEXTUALIZE_Q_SYSTEM_PROMPT

logger = logging.getLogger(__name__)
from api.prompts import RAG_SYSTEM_PROMPT, CONTEXTUALIZE_Q_SYSTEM_PROMPT

RAW_DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw_documents"))

async def _load_all_chunks_for_bm25() -> List[Document]:
    """Laadt een uitgebreide set chunks op uit de vector store voor BM25 indexering.
    We gebruiken meerdere zoektermen voor een brede dekking van de aanwezige protocollen.
    """
    try:
        vector_store = get_vector_store()
        seed_queries = [
            "zorg protocol afspraken veiligheid",
            "medicatie beheer toediening",
            "brandveiligheid evacuatie incidenten",
            "hygiëne infectiepreventie",
            "visie missie kwaliteit"
        ]
        
        all_docs = []
        seen_ids = set()
        
        for query in seed_queries:
            # We gebruiken de asynchrone variant van similarity_search om de event loop niet te blokkeren
            docs = await vector_store.asimilarity_search(query, k=250)
            for doc in docs:
                # Unieke ID op basis van content en bron
                doc_id = hashlib.md5((doc.page_content + doc.metadata.get('source', '')).encode()).hexdigest()
                if doc_id not in seen_ids:
                    seen_ids.add(doc_id)
                    all_docs.append(doc)
            
            if len(all_docs) >= 600: # Gereduceerd van 1200 voor geheugenbesparing
                break
        
        logger.info(f"✅ BM25: {len(all_docs)} unieke chunks geladen (geheugen-geoptimaliseerd).")
        return all_docs
    except Exception as e:
        logger.warning(f"⚠️ Kon BM25 chunks niet laden: {e}. Fallback naar vector-only.")
        return []

def _format_docs(docs: List[Document]) -> str:
    """Formatteert de gevonden documenten naar een leesbare context string."""
    formatted = []
    seen = set()
    for doc in docs:
        source = doc.metadata.get('source', 'Onbekend')
        page = doc.metadata.get('page', '?')
        filename = os.path.basename(source)
        key = (filename, page, doc.page_content[:50])
        if key not in seen:
            seen.add(key)
            formatted.append(f"Bron: {filename} (Pagina {page})\n{doc.page_content}")
    return "\n\n".join(formatted)

def get_retrieval_chain(retriever, llm, query_rewrite_prompt):
    """Zet de chain op die een standalone query maakt en documenten ophaalt."""
    get_input = RunnableLambda(lambda x: x["input"])
    
    query_rewrite_chain = RunnableBranch(
        (lambda x: len(x.get("chat_history", [])) > 0, query_rewrite_prompt | llm | StrOutputParser()),
        get_input
    )
    
    return query_rewrite_chain | retriever

async def setup_rag_chain() -> dict:
    """Zet de volledige RAG chain op op een asynchrone manier."""
    k = int(os.getenv("RETRIEVER_K", 4))
    
    # Vector retriever
    vector_retriever = get_vector_store().as_retriever(search_kwargs={"k": k})

    # BM25 retriever (asynchroon laden)
    all_chunks = await _load_all_chunks_for_bm25()
    if all_chunks:
        bm25_retriever = BM25Retriever.from_documents(all_chunks, k=k*2) # Haal meer op voor reranker
        retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, vector_retriever],
            weights=[0.4, 0.6]
        )
    else:
        retriever = vector_retriever

    # Reranker: Flashrank toevoegen voor hogere precisie (UITGESCHAKELD VOOR GEHEUGEN)
    try:
        use_reranker = os.getenv("USE_RERANKER", "false").lower() == "true"
        if use_reranker:
            from langchain_community.document_compressors import FlashrankRerank
            compressor = FlashrankRerank(top_n=k)
            retriever = ContextualCompressionRetriever(
                base_compressor=compressor, base_retriever=retriever
            )
            logger.info("✅ FlashRank reranker actief in de RAG chain.")
        else:
            logger.info("ℹ️ FlashRank reranker gedeactiveerd (geheugenbesparing).")
    except Exception as e:
        logger.warning(f"⚠️ FlashRank reranker niet beschikbaar: {e}")

    llm = ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=float(os.getenv("LLM_TEMPERATURE", 0.2)),
        max_tokens=int(os.getenv("LLM_MAX_TOKENS", 1000)),
        max_retries=int(os.getenv("LLM_MAX_RETRIES", 1))
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", RAG_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ])

    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", CONTEXTUALIZE_Q_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ])

    retrieval_chain = get_retrieval_chain(retriever, llm, contextualize_q_prompt)
    
    def format_docs_for_prompt(docs):
        return _format_docs(docs)

    # De uiteindelijke chain die we exporteren voor streaming
    rag_chain = (
            RunnableParallel(
                context=(retrieval_chain | format_docs_for_prompt),
                input=RunnableLambda(lambda x: x["input"]),
                chat_history=RunnableLambda(lambda x: x.get("chat_history", []))
            )
            | prompt
            | llm
            | StrOutputParser()
    )

    return {
        "generation": rag_chain,
        "retrieval": retrieval_chain
    }
