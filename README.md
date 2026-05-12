# Zonnehoeve Enterprise AI Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/KynanM/zonnehoeve-entreprise)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/KynanM/zonnehoeve-entreprise)

## Overview

The Zonnehoeve Enterprise AI Platform is a specialized knowledge management system designed for Zonnehoeve Living+. The application implements a high-performance Retrieval-Augmented Generation (RAG) pipeline that allows users to interact with large-scale documentation through a natural language interface. It provides verified, context-aware responses with direct source attribution, alongside a comprehensive administrative dashboard for system monitoring and data management.

## Key Features

- **Retrieval-Augmented Generation (RAG)**: Leverages semantic search to provide answers based strictly on internal organizational documents.
- **Source Attribution**: Provides transparent links to specific pages and sections within source PDF/DOCX files for every AI response.
- **Real-time Admin Dashboard**: Integrated monitoring of system activity, AI safety metrics, and user feedback via WebSocket-driven updates.
- **Automated Document Pipeline**: Support for multi-format document ingestion with automatic metadata extraction and vector indexing.
- **Hybrid Search Architecture**: Combines vector-based semantic retrieval with keyword-based ranking for maximum accuracy.
- **AI Safety Framework**: Built-in monitoring tools for verifying response quality and maintaining organizational trust.

## Tech Stack

### Core Frameworks
- **Frontend**: Next.js 15+ (React 19, TypeScript)
- **Backend**: FastAPI (Python 3.12+)
- **Orchestration**: LangChain

### Data & Retrieval
- **Database**: PostgreSQL with pgvector extension
- **Vector Search**: Semantic embedding indexing via OpenAI / Ollama
- **Reranking**: FlashRank / BM25 hybrid implementation

### UI & Styling
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Interface**: Lucide React

### Infrastructure & Testing
- **Deployment**: Docker & Docker Compose / Railway
- **Backend Testing**: Pytest (Unit & Integration)
- **Frontend Testing**: Jest & Playwright

## Architecture & Approach

The system is built on a modular, service-oriented architecture to ensure scalability and reliability:

1. **Decoupled API Design**: The FastAPI backend serves as a stateless processing engine, separating business logic into dedicated services (Ingestion, Stats, Chat).
2. **Stateless Frontend**: The Next.js client utilizes the App Router for optimal performance and SEO, connecting to the backend via secure REST and WebSocket protocols.
3. **Optimized Data Pipeline**: Document processing is handled asynchronously to ensure large files do not block user interactions.
4. **Reliability Layer**: The dashboard implements a hybrid synchronization strategy, using WebSockets for low-latency updates with HTTP polling fallbacks for stability.

## Getting Started

### Prerequisites
- Node.js v20.x or higher
- Python v3.11 or higher
- Docker and Docker Compose (optional for local deployment)
- OpenAI API Credentials

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/KynanM/zonnehoeve-entreprise.git
   cd zonnehoeve-entreprise
   ```

2. Backend setup:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Frontend setup:
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Variables

Configure the following variables in a `.env` file at the project root:

| Variable | Description |
| :--- | :--- |
| DATABASE_URL | PostgreSQL connection string (with async driver) |
| OPENAI_API_KEY | API key for GPT and embedding services |
| ADMIN_API_KEY | Secret key for administrative API access |
| LLM_MODEL | Specified model identifier (e.g., gpt-4o-mini) |
| EMBEDDING_MODEL | Model for vector embedding generation |
| BACKEND_URL | Internal/External URL of the FastAPI backend |
| NEXT_PUBLIC_API_URL | Publicly accessible backend endpoint for the frontend |

### Running Locally

1. Start the services using Docker:
   ```bash
   docker-compose up -d
   ```

2. Alternatively, start manually:
   - Backend: `uvicorn main:app --reload` (from `backend` directory)
   - Frontend: `npm run dev` (from `frontend` directory)

## Project Structure

```text
zonnehoeve-entreprise/
├── backend/                # FastAPI application source
│   ├── api/                # Route definitions and controllers
│   ├── services/           # Business logic and AI services
│   ├── tests/              # Comprehensive test suites
│   ├── models.py           # Database schema definitions
│   └── main.py             # Application entry point
├── frontend/               # Next.js application source
│   ├── src/app/            # Pages and layouts
│   ├── src/components/     # Reusable UI components
│   ├── src/lib/            # Utility functions and API clients
│   └── tests/              # Frontend unit and E2E tests
├── docker-compose.yml      # Service orchestration
└── railway.json           # Deployment configuration
```

## Available Scripts

### Frontend
- `npm run dev`: Start development server.
- `npm run build`: Generate production bundle.
- `npm run start`: Run production server.
- `npm run test`: Execute Jest tests.

### Backend
- `pytest`: Execute all backend tests.
- `uvicorn main:app --reload`: Start backend development server.
- `python ingest.py`: Trigger document ingestion and indexing process.

## Administrative Authentication

The platform implements a multi-layer security model for administrative functions:

- **REST API Authorization**: All endpoints under `/api/admin` and `/api/documents/upload` require the `X-Admin-Key` header.
- **WebSocket Security**: The real-time update stream at `/ws/admin` requires the `token` query parameter.
- **Key Management**: Both authentication methods validate against the `ADMIN_API_KEY` defined in the environment configuration.

## API Documentation

The backend provides interactive documentation for exploring and testing the API:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs) - For interactive testing and schema visualization.
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc) - For clean, searchable API specifications.

## QA, Testing & Monitoring

The platform includes a specialized QA reporting system accessible via the Admin Dashboard. This system aggregates data from multiple sources:

### Generating Reports
To update the dashboard metrics, run the following commands in the `backend` directory:
- **Test Results**: `pytest --json-report --json-report-file=pytest_results.json`
- **Coverage**: `pytest --cov=. --cov-report=xml` (Generates `coverage.xml`)
- **Code Quality**: `ruff check . --output-format=json > ruff_report.json`
- **AI Safety**: `pytest tests/test_chatbot_qa_expert.py` (Generates `safety_test_results.json`)

### Monitoring Endpoints
- `/api/admin/qa-report`: Aggregates coverage, linting, and safety scores into a unified quality metric.
- `/api/admin/stats`: Provides real-time activity tracking and feedback analysis.

## Database Maintenance & Optimization

Several specialized scripts are available in the `backend` directory for managing the data layer:

- `init_db.py`: Initializes the PostgreSQL schema and ensures the `pgvector` extension is active.
- `optimize_db.py`: Analyzes table statistics and recreates vector indices (HNSW/IVFFlat) for optimal search performance.
- `migrate_metadata.py`: Synchronizes document metadata across the SQL database and the vector store.
- `inspect_db.py`: Provides a high-level overview of table sizes and record counts.

## Document Ingestion Workflow

Documents can be added to the system using two primary methods:

1. **Admin Dashboard (API)**: Upload files directly via the UI. This triggers an asynchronous background task using `IngestionService` for parsing, chunking, and vectorization.
2. **CLI Ingestion**: Use `python ingest.py` for bulk processing of documents stored in the `data/raw_documents` directory.

### Hybrid Search Logic
The system uses a two-stage retrieval process:
1. **Semantic Search**: Uses `pgvector` to identify the most relevant context chunks.
2. **Re-ranking (Optional)**: If `USE_RERANKER` is enabled, it applies FlashRank or BM25 to refine the results, ensuring the most precise information is passed to the LLM.

## Authors

The application was developed by:
- **Kynan Melsens**
- **Aaron Vangermeersch**

This project is proprietary software. Copyright © 2026 Kynan Melsens & Aaron Vangermeersch.

A license is granted to Zonnehoeve Living+ for internal use and modification. See the [LICENSE](LICENSE) file for full details.