# Zonnehoeve Enterprise - DevOps & Deployment Guide

Dit document beschrijft hoe je de applicatie live krijgt (op Railway) en hoe je de Docker-omgeving beheert.

## 1. Lokale Ontwikkeling met Docker

Je kunt nu de hele stack (Frontend, Backend, Database) lokaal draaien in een geïsoleerde container-omgeving.

### Voorbereiding:
Zorg dat je een `.env` bestand hebt in de root (of in de `backend/` map) met je OpenAI API Key.

### Commando's:
```powershell
# Start de hele omgeving
docker-compose up -d

# Bekijk de logs
docker-compose logs -f

# Stop alles
docker-compose down
```

---

## 2. Deployment naar Railway (Aanbevolen)

### Stap 1: Voorbereiding in Railway
1. Ga naar [Railway.app](https://railway.app/) en maak een nieuw project aan.
2. Voeg een **PostgreSQL** database toe aan je project.
3. Ga naar de instellingen van de database en kopieer de `DATABASE_URL`.

### Stap 2: Backend Koppelen
1. Voeg een nieuwe **Service** toe via GitHub en kies de `zonnehoeve-entreprise` repository.
2. Ga naar de instellingen van deze service (`backend`) en stel de **Root Directory** in op `/backend`.
3. Voeg de volgende **Variables** toe:
    - `DATABASE_URL`: Plak hier de URL van je Railway Postgres (zorg dat je `postgresql://` vervangt door `postgresql+asyncpg://` als dat nodig is voor de driver).
    - `OPENAI_API_KEY`: Je eigen API key.
    - `PORT`: 8000

### Stap 3: Frontend Koppelen
1. Voeg nog een **Service** toe vanuit GitHub.
2. Stel de **Root Directory** in op `/frontend`.
3. Voeg de volgende **Variables** toe:
    - `NEXT_PUBLIC_API_URL`: De publieke URL van je Backend service (bijv. `https://backend-production-xxxx.up.railway.app`).

---

## 3. CI/CD (GitHub Actions)

Er is een test-pipeline aangemaakt in `.github/workflows/ci.yml`. 
- Elke keer dat je code pusht naar `main`, worden de tests gedraaid en worden de Docker-builds gecontroleerd.
- Als de tests slagen, zal Railway (indien gekoppeld) automatisch de nieuwe versie deployen.

## 4. Toekomst: Eigen Domeinnaam

Wanneer je een domeinnaam hebt:
1. Voeg het domein toe in de Railway instellingen voor de `frontend` service.
2. Voeg een CNAME record toe bij je domeinprovider die wijst naar het Railway adres.
3. Update de `CORS_ORIGINS` in de backend (indien geconfigureerd) naar je nieuwe domein.
