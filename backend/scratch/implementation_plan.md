# Actieplan: Oplossen van Chat Opslag, Feedback & Activiteit op het Dashboard

Na een uitgebreid onderzoek van de backend (services, modellen en logs) en frontend (hooks, UI componenten en API integratie) heb ik de kern van de 3 problemen plus de werking van het admin dashboard in kaart gebracht.

Hier is de samenvatting van mijn bevindingen en het plan van aanpak.

## Waarom chats, feedback en activiteit falen

**Probleem 1: Chats worden niet opgeslagen en verschijnen niet aan de linkerkant.**
- **Oorzaak:** De PostgreSQL database (via Railway) heeft momenteel de kolommen `is_pinned` en `is_archived` in de tabel `chat_threads` geregistreerd als het type `integer`. Echter, de backend-code (`models.py`) verwacht een `Boolean` en stuurt bij het maken van een nieuw gesprek de waarde `False` door. PostgreSQL (via de strikte `asyncpg` driver) weigert dit en crasht met een `DatatypeMismatchError`.
- **Gevolg:** Omdat deze initiële insert faalt, wordt het gesprek (`ChatThread`) én het daadwerkelijke bericht (`ChatLog`) nooit opgeslagen.
- Bovendien faalt ook de ophaal-query voor de zijbalk (`get_threads`) vanwege dit datatype conflict, waardoor de zijbalk leeg blijft of terugvalt op een minimale weergave.

**Probleem 2: Feedback komt niet door.**
- **Oorzaak:** Feedback (thumbs up/down) wordt door de frontend verstuurd via de unieke `log_id` van het gegenereerde bericht. Omdat het bericht door Probleem 1 nooit is opgeslagen in de database, is er geen `log_id` aanwezig. De feedback call naar de backend faalt daarom en wordt niet opgeslagen.

**Probleem 3: Activiteit wordt niet bijgehouden op het dashboard.**
- **Oorzaak:** Het activiteitendashboard leest het aantal `ChatLog` records uit in de database, gegroepeerd op datum. Omdat er door Probleem 1 geen nieuwe `ChatLog` records worden toegevoegd, ziet het dashboard geen nieuwe activiteit en lijkt het bevroren.

## Analyse van het Volledige Admin Dashboard (4 Pagina's)

Ik heb de 4 pagina's van het admin dashboard geanalyseerd op real-time werking:

1. **Inzichten (Dashboard)**:
   - **Real-time logs & feedback:** Werkt **wel degelijk in real-time**! Er zit een WebSocket koppeling in de backend die via `useAdminSocket` direct nieuwe berichten en feedback naar de frontend pusht (met een 30 seconden polling fallback). Nieuwe chat-logs en feedback verschijnen direct in de "Recente logs" tabel in de UI zonder de pagina te herladen.
   - **Algehele Statistieken:** De backend gebruikt een **30-seconden in-memory cache** (`StatsService`) voor de grote nummers (Totaal vragen, Gem. Latency, etc) om de database te ontlasten. Deze nummers veranderen dus niet instant, maar pas als de cache na 30 seconden verloopt of als de gebruiker manueel op "Ververs" klikt (wat de cache overrulet).
   - **Database up-to-date:** De queries in de code zijn correct, maar door Probleem 1 is de data er fysiek niet.
2. **Protocollen (Docs)**: Handmatige updates. Wordt lokaal ververst zodra je zelf een bestand uploadt of verwijdert, of door de "Ververs" knop.
3. **Kwaliteit (QA Report)**: Handmatige updates (aangezien dit gekoppeld is aan statische testrapporten). Wordt vernieuwd via de "Ververs" knop.
4. **AI Safety**: Handmatige updates. Idem als Kwaliteit.

> [!NOTE]
> De real-time WebSockets van het dashboard werken correct en de database queries zijn up-to-date. Het probleem ligt puur bij de falende initiële insert.

## Proposed Changes

We hoeven de frontend of de websocket-logica niet aan te passen. We hoeven alleen het schema van de database in Railway te repareren, zodat de datatypes weer matchen.

### Database

#### [MODIFY] Railway PostgreSQL Database (via Python Script)
Ik heb een python script voorbereid (`scratch/fix_db_schema.py`) dat we eenmalig kunnen uitvoeren om de Railway database te repareren.
- Het script voert twee `ALTER TABLE` queries uit om `is_pinned` en `is_archived` permanent te converteren van `integer` naar `BOOLEAN`. 
- SQL-commando's die worden uitgevoerd:
  - `ALTER TABLE chat_threads ALTER COLUMN is_pinned TYPE BOOLEAN USING CASE WHEN is_pinned = 1 THEN TRUE ELSE FALSE END;`
  - `ALTER TABLE chat_threads ALTER COLUMN is_archived TYPE BOOLEAN USING CASE WHEN is_archived = 1 THEN TRUE ELSE FALSE END;`

Zodra dit script wordt uitgevoerd, zal `create_chat_log` weer succesvol inserts kunnen doen.
Hierna zal de chatbot zijn threads aan de linkerkant tonen, zullen logs worden opgeslagen en zal het admin dashboard (activiteit en feedback) de data direct in real-time verwerken via de WebSocket verbinding!

## User Review Required

> [!IMPORTANT]
> Aangezien het uitvoeren van dit Python script een structurele wijziging maakt (ALTER TABLE) op de gekoppelde PostgreSQL database, vraag ik u expliciet toestemming om deze database reparatie uit te voeren. Gaat u akkoord met het uitvoeren van het fix-script?
