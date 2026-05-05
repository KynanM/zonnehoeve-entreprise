from unittest.mock import patch

def test_vector_store_getters():
    import vector_store
    with patch("vector_store.OpenAIEmbeddings") as mock_embeddings:
        vector_store.get_embeddings()
        mock_embeddings.assert_called()

    with patch("vector_store.PGVector") as mock_pgvector, \
         patch("vector_store.get_embeddings"):
        vector_store.get_vector_store()
        mock_pgvector.assert_called()

def test_postgres_url_fix():
    # Force the module level replacement logic to run
    with patch.dict("os.environ", {"DATABASE_URL": "postgres://test"}):
        import vector_store
        import importlib
        importlib.reload(vector_store)
        assert vector_store.SYNC_DATABASE_URL.startswith("postgresql+psycopg2://")
