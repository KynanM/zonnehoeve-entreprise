# Zonnehoeve Enterprise Chatbot

Welkom bij de Zonnehoeve Enterprise Chatbot repository. Deze geavanceerde enterprise-applicatie helpt medewerkers van Zonnehoeve efficiënt informatie en protocollen te doorzoeken via een AI-gestuurde gids, aangedreven door LLMs en Retrieval-Augmented Generation (RAG).

## Kenmerken

1. **Intelligente RAG Engine (Backend - Python/FastAPI)**
   - Contextuele informatie-opvraging van protocollen, richtlijnen en documenten.
   - Vector-opslag (via `pgvector`) in een PostgreSQL database.
   - Asynchrone document-chunking, indexatie en pre-loading.
   
2. **Dynamische Digitale Gids (Frontend - Next.js/React)**
   - Intuïtieve chat-interface met "Vier Momenten" structuur focus.
   - Document-viewer en zijbalk ingebouwd.
   - Responsief ontwerp en vloeiende animaties (`framer-motion`).

3. **Infrastructuurklaar (DevOps)**
   - Volledig met Docker ingericht.
   - Configuratie en workflows ontworpen voor CI/CD pipelines (bijv. GitHub acties).
   - Simpele deployment integratie, bijvoorbeeld voor Railway.app.

## Onderdelen en Structuur

De applicatie bestaat uit twee hoofdonderdelen:

- `backend/`: De FastAPI server logic voor API's, RAG chain initialisatie en chat processen.
- `frontend/`: De Next.js site voor de user interface.

## Aan de Slag (Lokaal)

Wanneer je mee wilt ontwikkelen op de codebase, volg dan deze stappen.

### Vereisten
- Docker Desktop
- Python 3.11+
- Node.js 20+

### Instellingen configureren
Zorg ervoor dat het project de juiste instellingen heeft. Er is een `.env.example` beschikbaar om over te nemen:
1. Kopieer `.env.example` naar `.env`.
2. Pas eventueel de waarden aan, met name API keys (zoals `OPENAI_API_KEY`).

### Ontwikkelen via Docker
Je kan het volledige pakket (inclusief PostgreSQL-database met pgvector) in Docker lokaal inzetten.

```sh
docker-compose up -d
```
Nu draait het project lokaal. De frontend is bereikbaar op `http://localhost:3000` en de backend op `http://localhost:8000`.

Voor specifieke dev-server test (buiten Docker):
#### Start Backend (FastAPI)
```sh
cd backend
pip install -r requirements.txt
python main.py
```

#### Start Frontend (Next.js)
```sh
cd frontend
npm install
npm run dev
```

## Bestaande Documentatie & Deployment
Meer informatie omtrent tests en deployment instructies voor *Railway* staat in [README-DEVOPS.md](./README-DEVOPS.md).

## Testen van het project
Er zijn CI/CD validatietesten ingesteld. Als je deze handmatig wilt testen:

- **Backend tests:** `pytest` activeren vanuit de `backend/` map.
- **Frontend tests:** `npm test` vanuit de `frontend/` map (beheerd via Jest; Let op dat je de Playwright testen los moet starten voor E2E tests).

## Credits
Ontwikkeld voor Zonnehoeve voor optimalisatie van document retrieval en begeleiding.
