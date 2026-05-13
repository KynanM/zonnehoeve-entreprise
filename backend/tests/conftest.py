import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
from langchain_core.documents import Document


def make_execute_result(scalar_one=None, scalars_list=None):
    """Helper to create a mock result for `session.execute()`.

    - `scalar_one` will be returned by `scalar_one_or_none()`
    - `scalars_list` will be returned by `scalars().all()`
    """
    res = MagicMock()
    res.scalar_one_or_none.return_value = scalar_one
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_list if scalars_list is not None else []
    res.scalars.return_value = scalars_mock
    return res

# Laad de echte .env variabelen voor integratietesten
load_dotenv()

@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    """Voorkomt dat we de echte database gebruiken door de engine en logs te mocken."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None
    
    mock_session.add = MagicMock() # Sync method
    # Provide a safe default for execute() so tests that don't override it get sensible results
    mock_session.execute.return_value = make_execute_result()
    
    mock_session_maker = MagicMock()
    mock_session_maker.return_value = mock_session
    # Ook handles 'async with async_session_maker() as session'
    mock_session_maker.__aenter__.return_value = mock_session
    mock_session_maker.__aexit__.return_value = None

    with patch("database.engine"), \
         patch("database.AsyncSession"), \
         patch("database.async_session_maker", mock_session_maker):
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
         patch("api.rag.get_vector_store") as mock_get_rag, \
         patch("api.documents.get_vector_store") as mock_get_docs:
        mock_vs = MagicMock()
        mock_get.return_value = mock_vs
        mock_get_rag.return_value = mock_vs
        mock_get_docs.return_value = mock_vs
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
