# Zonnehoeve Enterprise Chatbot

Welkom bij de Zonnehoeve Enterprise Chatbot repository. Deze geavanceerde enterprise-applicatie helpt medewerkers van Zonnehoeve efficiënt informatie en protocollen te doorzoeken via een AI-gestuurde gids, aangedreven door LLMs en Retrieval-Augmented Generation (RAG).

## 🚀 Snel aan de slag (Docker)

De makkelijkste manier om het project volledig werkend te krijgen is via Docker.

### 1. Omgeving instellen
Kopieer de voorbeeld instellingen naar een lokaal `.env` bestand:
```sh
cp .env.example .env
```
Open `.env` en voeg je `OPENAI_API_KEY` toe.

### 2. Containers opstarten
Zorg dat Docker Desktop draait en voer uit:
```sh
docker-compose up -d --build
```

### 3. Documenten Inladen (Cruciaal)
Bij de eerste installatie is de database leeg. Je moet de aanwezige PDF-protocollen inladen in de AI-database:
```sh
docker exec zonnehoeve_backend python ingest.py
```
*Dit script analyseert de 48+ PDF's in `backend/data/raw_documents` en maakt ze doorzoekbaar in de chat en zichtbaar in de viewer.*

---

## 🏗️ Project Structuur

- **`frontend/`**: Next.js 16 applicatie (React 19). Bevat de Chat UI, Document Viewer en Admin dashboard.
- **`backend/`**: FastAPI server. Bevat de RAG logica, LangChain integratie en PostgreSQL/pgvector database koppeling.
- **`docker-compose.yml`**: Beheert de volledige stack (Frontend, Backend, DB).

---

## 🛠️ Ontwikkeling (Zonder Docker)

Wil je lokaal ontwikkelen buiten Docker? Volg dan deze stappen:

### Backend (Python)
```sh
cd backend
python -m venv venv
source venv/bin/activate  # Of 'venv\Scripts\activate' op Windows
pip install -r requirements.txt
python main.py
```

### Frontend (Next.js)
```sh
cd frontend
npm install
npm run dev
```

---

## 🧪 Testen

Wij hechten veel waarde aan stabiliteit. Je kunt de tests als volgt draaien:

- **Backend (Pytest):**
  ```sh
  cd backend
  python -m pytest
  ```
- **Frontend (Jest):**
  ```sh
  cd frontend
  npm test
  ```

---

## 🌍 Deployment

Dit project is geoptimaliseerd voor **Railway.app**. 
- De frontend gebruikt `standalone` output mode.
- De backend gebruikt `uvicorn` op poort 8000.
- Zie `README-DEVOPS.md` voor gedetailleerde instructies over de Railway installatie.

---

## 💡 Troubleshooting

- **Hero laadt niet?**: Dit komt vaak door hydratatie-verschillen in React 19. Zorg dat je de nieuwste code uit `main` gebruikt waar mount-key fixes zijn toegevoegd.
- **Document Viewer leeg?**: Heb je de `ingest.py` stap uitgevoerd (zie stap 3 bij de start)?
- **Port 3000 in gebruik?**: Docker kan niet starten als er al een lokale `npm run dev` draait. Stop je lokale processen voordat je Docker opstart.

---

## 📜 Credits
Ontwikkeld voor Zonnehoeve Living+ om de toegang tot kritieke zorginformatie te moderniseren.
