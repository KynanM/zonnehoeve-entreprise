# Agile Overzicht: Zonnehoeve Chatbot Migratie (V1 naar V2)

Dit document bevat de technische verantwoording, Agile user stories en de urenregistratie voor de transitie van het Zonnehoeve project van een prototype naar een enterprise-ready applicatie.

## 1. Analyse & Verantwoording van de Migratie

### Tech Stack Vergelijking
| Technologie | Oude Versie (V1) | Nieuwe Versie (V2) |
| :--- | :--- | :--- |
| **Architectuur** | Monolithisch (Prototype) | Gedecoupleerd (Enterprise) |
| **Frameworks** | Streamlit (Python) | Next.js 15 (React) & FastAPI (Python) |
| **Database** | ChromaDB (Lokaal bestand) | PostgreSQL met pgvector (Railway Cloud) |
| **Hosting** | Render / Streamlit Cloud | Dockerized op Railway.app |
| **Interface** | Standaard Streamlit UI | Custom Premium UI (Tailwind & Framer) |
| **Features** | Basis Chat & PDF Links | PWA (Mobiel), Live Streaming, Filtered RAG |

### Waarom de Migratie naar V2?
De migratie naar V2 was een strategische beslissing om de applicatie klaar te stomen voor echt gebruik binnen de Zonnehoeve:
- **Betrouwbaarheid**: Door de frontend (Next.js) los te koppelen van de backend (FastAPI), blijft de chatbot sneller reageren en is hij makkelijker te onderhouden.
- **PWA (Progressive Web App)**: Medewerkers kunnen de chatbot nu installeren op hun telefoon. Dit zorgt voor een hogere adoptie op de werkvloer.
- **Schaalbaarheid**: De overstap naar PostgreSQL/pgvector maakt het mogelijk om duizenden documenten te doorzoeken zonder performanceverlies, iets wat met lokale ChromaDB bestanden risicovol is in productie.
- **Security**: V2 implementeert strikte CORS-policies en een proxy-architectuur, wat essentieel is voor de bescherming van interne procedures.

---

## 2. Agile User Stories & Subtasks

### US-01 [Technical Enabler]: Decoupled Architecture Setup
*Als developer wil ik de frontend en backend splitsen zodat de applicatie schaalbaar en onderhoudbaar is.*
- **Subtasks** (loggen op onderstaande items ⏱️):
  - ⏱️ **Initialiseren Next.js 15 Frontend & Styling**: Opzetten van de core folderstructuur, installatie van dependencies (Tailwind, Lucide, Framer Motion) en configureren van de Next.js App Router.
  - ⏱️ **Opzetten FastAPI Backend & Base Logic**: Inrichten van de backend API structuur met Pydantic schemas, exception handlers en asynchrone endpoints voor de chatbot communicatie.
  - ⏱️ **Configureren CORS & API Gateway Proxy**: Implementeren van middleware voor CORS-beheer en het inregelen van een frontend proxy om cross-origin verzoeken in productie veilig te laten verlopen.

### US-02 [Data]: Database Migratie naar PgVector
*Als systeembeheerder wil ik een robuuste database zodat data veilig en schaalbaar wordt opgeslagen.*
- **Subtasks** (loggen op onderstaande items ⏱️):
  - ⏱️ **Migratie naar PostgreSQL/pgvector Cloud**: Exporteren van embeddings uit de lokale ChromaDB en het importeren in een PostgreSQL database met pgvector ondersteuning op Railway.
  - ⏱️ **SQLAlchemy Modellen & Async DB Logic**: Definiëren van SQLAlchemy modellen voor documenten en metadata, inclusief asynchrone database-sessies voor optimaal resourcegebruik.
  - ⏱️ **Metadata Filtering & Cloud Ingest Script**: Uitbreiden van de RAG-pipeline om op basis van metadata (bijv. categorie of afdeling) te filteren, wat de precisie van de AI-antwoorden verbetert.

### US-03 [UX]: Premium Chat Interface & Streaming
*Als gebruiker wil ik een moderne chat-interface die direct feedback geeft.*
- **Subtasks** (loggen op onderstaande items ⏱️):
  - ⏱️ **Frontend Chat Streaming (SSE) Integratie**: Bouwen van een server-sent events kanaal tussen de backend en frontend om AI-antwoorden woord-voor-woord te tonen voor een vloeiende ervaring.
  - ⏱️ **Source Preview Component & PDF Viewer**: Ontwikkelen van een side-panel component dat brondocumenten direct in de browser rendert wanneer een gebruiker op een bronvermelding klikt.
  - ⏱️ **UI Animatie & Chat Bubbles Design**: Ontwerpen van interactieve chat-bubbles en transities om de applicatie een premium en responsief gevoel te geven.

### US-04 [Mobile]: PWA Support & Mobile UI
*Als medewerker op de gang wil ik de chatbot direct kunnen openen zonder browser-tab.*
- **Subtasks** (loggen op onderstaande items ⏱️):
  - ⏱️ **PWA Manifest & Service Worker Setup**: Genereren van iconen, configureren van de webapp-manifest en schrijven van een service worker for offline caching en installatiemogelijkheden.
  - ⏱️ **Mobile Layout Responsive Patches**: Fijnmazig afstellen van layouts voor diverse mobiele viewports en het aanpassen van de navigatie voor touch-gebruik.
  - ⏱️ **A2HS (Add to Home Screen) Logica**: Implementeren van de browser-specifieke scripts om de 'Install App' prompt op het juiste moment te triggeren bij gebruikers.

### US-05 [DevOps]: Cloud Orchestration & Containers
*Als developer wil ik een voorspelbare deployment flow.*
- **Subtasks** (loggen op onderstaande items ⏱️):
  - ⏱️ **Dockerization & Deployment naar Railway**: Dockerizing van zowel frontend als backend met multi-stage Dockerfiles en het automatiseren van de deployment pipeline via GitHub Actions.

---

## 3. Urenregistratie (Totaal 24 uur)

De uren zijn exact verdeeld over de twee teamleden (Kynan en Aaron).

| User Story | Subtask (⏱️ item) | Uitgevoerd door | Uren besteed |
| :--- | :--- | :--- | :--- |
| **US-01** | Initialiseren Next.js 15 Frontend & Styling | Kynan | 3.0 |
| **US-01** | Opzetten FastAPI Backend & Base Logic | Aaron | 3.0 |
| **US-01** | Configureren CORS & API Gateway Proxy | Kynan | 1.0 |
| **US-02** | Migratie naar PostgreSQL/pgvector Cloud | Aaron | 2.0 |
| **US-02** | SQLAlchemy Modellen & Async DB Logic | Aaron | 2.0 |
| **US-02** | Metadata Filtering & Cloud Ingest Script | Kynan | 2.0 |
| **US-03** | Frontend Chat Streaming (SSE) Integratie | Kynan | 2.0 |
| **US-03** | UI Animatie & Chat Bubbles Design | Kynan | 2.0 |
| **US-03** | Source Preview Component & PDF Viewer | Aaron | 2.0 |
| **US-04** | PWA Manifest & Service Worker Setup | Kynan | 2.0 |
| **US-04** | Mobile Layout Responsive Patches | Kynan | 1.0 |
| **US-04** | A2HS (Add to Home Screen) Logica | Aaron | 1.0 |
| **US-05** | Dockerization & Deployment naar Railway | Aaron | 2.0 |
| **TOTALS** | | **Kynan: 12u / Aaron: 12u**| **24.0 uur** |
