import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from dotenv import load_dotenv
from langchain_core.documents import Document

# Laad de echte .env variabelen voor integratietesten
load_dotenv()

@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    """Voorkomt dat we de echte database gebruiken door de engine en logs te mocken."""
    mock_session = AsyncMock()
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None
    
    mock_session_maker = MagicMock()
    mock_session_maker.return_value = mock_session
    # Ook handles 'async with async_session_maker() as session'
    mock_session_maker.__aenter__.return_value = mock_session
    mock_session_maker.__aexit__.return_value = None

    with patch("database.engine"), \
         patch("database.AsyncSession"), \
         patch("database.async_session_maker", mock_session_maker), \
         patch("api.chat.create_chat_log", new_callable=AsyncMock) as mock_create_log, \
         patch("api.chat.update_chat_log", new_callable=AsyncMock):
        mock_create_log.return_value = 1
        yield mock_session

@pytest.fixture(scope="function", autouse=True)
def mock_rag_setup():
    """Voorkomt dat setup_rag_chain de echte vector store aanroept."""
    with patch("main.setup_rag_chain", new_callable=AsyncMock) as mock_setup:
        mock_setup.return_value = {
            "retrieval": AsyncMock(),
            "generation": AsyncMock()
        }
        yield mock_setup

@pytest.fixture
def mock_vector_store():
    """Mock voor de vector store, gebruikt door de RAG-logic."""
    with patch("vector_store.get_vector_store") as mock_get, \
         patch("api.rag.get_vector_store") as mock_get_rag:
        mock_vs = MagicMock()
        mock_get.return_value = mock_vs
        mock_get_rag.return_value = mock_vs
        yield mock_vs

@pytest.fixture
def sample_documents():
    """Returns a list of sample LangChain documents for testing."""
    return [
        Document(
            page_content="Zonnehoeve biedt 100% levenskwaliteit aan haar bewoners.",
            metadata={"source": "protocol_zorg.pdf", "page": 1}
        ),
        Document(
            page_content="Afspraken over medicatieveiligheid zijn essentieel.",
            metadata={"source": "veiligheid.docx", "page": 5}
        )
    ]
