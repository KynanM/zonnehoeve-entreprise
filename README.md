#  Zonnehoeve Living+ Enterprise Chatbot

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![LangChain](https://img.shields.io/badge/LangChain-Enabled-121212?logo=chainlink)](https://langchain.com/)

Een state-of-the-art AI-platform ontwikkeld voor **Zonnehoeve Living+**. Dit systeem stelt zorgmedewerkers in staat om via een intelligente interface direct toegang te krijgen tot duizenden pagina's aan protocollen, werkafspraken en zorgdossiers.

---

##  Belangrijkste Functionaliteiten

###  Digitale Gids (AI Chat)
- **Retrieval-Augmented Generation (RAG)**: Antwoorden zijn gebaseerd op de werkelijke PDF-protocollen van Zonnehoeve.
- **Bronvermelding**: Elk antwoord bevat directe links naar de relevante documenten en specifieke pagina's.
- **Smart Context**: De chatbot onthoudt de gespreksgeschiedenis voor vervolgvragen.
- **Pin & Sla op**: Gebruikers kunnen belangrijke gesprekken pinnen of opslaan voor later gebruik.

###  Admin Dashboard
- **Real-time Statistieken**: Direct inzicht in systeemgebruik, AI-performance en feedback via WebSockets (met automatische HTTP-polling fallback).
- **Feedback Loop**: Beheerders kunnen user feedback (duimpjes) analyseren om de AI te verbeteren.
- **Document Beheer**: Upload en verwijder protocollen direct vanuit de browser; de AI indexeert ze automatisch.
- **AI Safety & Trust**: Ingebouwde dashboards voor het monitoren van de veiligheid en nauwkeurigheid van de antwoorden.

---

##  Technologie Stack

### Frontend
- **Framework**: Next.js 16 (React 19) met App Router.
- **Styling**: TailwindCSS voor een premium, responsive design.
- **State Management**: React Hooks & Context API.
- **Real-time**: Custom WebSocket hooks voor instant updates.

### Backend
- **Framework**: FastAPI (Python 3.12+).
- **AI Engine**: LangChain met OpenAI GPT-4o voor superieure redenering.
- **Vector Database**: PostgreSQL met de `pgvector` extensie voor bliksemsnelle semantische zoekopdrachten.
- **ORM**: SQLAlchemy (Async) voor veilige en performante database interactie.

---

##  Snelle Installatie

### Met Docker (Aanbevolen)
```bash
# 1. Omgeving instellen
cp .env.example .env

# 2. Start de stack
docker-compose up -d --build

# 3. Initialiseer de AI (Cruciaal voor eerste gebruik)
docker exec zonnehoeve_backend python ingest.py
```

### Handmatige Installatie

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

##  Kwaliteit & Stabiliteit

Wij hanteren een **Zero-Defect** beleid. Het project bevat uitgebreide test-suites voor zowel frontend als backend.

- **Backend (Pytest)**: `cd backend && python -m pytest`
- **Frontend (Jest)**: `cd frontend && npm test`

*Huidige status: **100% pass rate** op alle integratie- en unit-tests.*

---

##  Deployment

Dit project is volledig geoptimaliseerd voor **Railway.app**. 
- De frontend draait in `standalone` modus voor minimale resource-footprint.
- Automatische migraties en DB-checks zijn ingebouwd in de startup-pipeline.

---

##  Credits & Licentie
Ontwikkeld door het AI-team voor **Zonnehoeve Living+**. Alle rechten voorbehouden aan Zonnehoeve.

---
<p align="center">
  <i>"Zonnehoeve Living+ : Moderniseren door Innovatie."</i>
</p>