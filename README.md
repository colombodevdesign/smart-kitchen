<p align="center">
  <img src="public/icon-512.png" alt="Logo smart kitchen" width="128">
</p>

<h1 align="center">smart kitchen</h1>

<p align="center">
  Gestione dispensa personale con sincronizzazione real-time tra dispositivi e suggerimenti AI stagionali.
</p>

È una **PWA** (Progressive Web App) ottimizzata sia per **desktop** che per **mobile**: si usa dal browser oppure si installa sul dispositivo (su iPhone con «Aggiungi a Home», su desktop e Android con «Installa app») e si apre a schermo intero come un'app nativa. Il layout si adatta allo schermo: sidebar e Dispensa a tre colonne su desktop, navigazione in basso e gesti di swipe su mobile. Funziona anche con le notifiche push di scadenza.

Stack: React 18 + Vite 5 + Firebase (Auth + Firestore) + Gemini AI.

## Screenshot

<p align="center">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.00.31.png" alt="Oggi" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.00.35.png" alt="Dispensa" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.00.41.png" alt="Dispensa, sezione espansa" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.00.48.png" alt="Ricette" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.01.00.png" alt="Pasti" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.03.25.png" alt="Spesa" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.05.08.png" alt="Ricetta" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.05.46.png" alt="Ricetta con ingredienti mancanti" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.07.22.png" alt="Profilo" width="49%">
  <img src="screenshots/Screenshot%202026-10-23%20at%2022.07.41.png" alt="Notifiche" width="49%">
</p>

## Prerequisiti

- Account Google (per Firebase)
- Progetto Firebase con Authentication e Firestore abilitati
- API key Gemini (opzionale, per i suggerimenti AI)

## Setup

1. Copia `.env.example` in `.env` e compila le variabili Firebase:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

2. Installa le dipendenze e avvia:

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
# output in /dist, deployabile su Vercel/Netlify con drag & drop
```

## Deploy su Vercel

1. `npm run build`
2. `npx vercel --prod` (o drag & drop della cartella `dist` su vercel.com)

## Firestore Security Rules

Prima di andare in produzione, applica le security rules dalla Firebase Console
(Firestore Database → Rules → Publish):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId}/inventory/data {
      allow read: if request.auth != null
                  && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && isValidInventory(request.resource.data);
    }
  }
  function isValidInventory(data) {
    return data.keys().hasAll(['credenza', 'frigo', 'freezer'])
        && data.credenza is list
        && data.frigo    is list
        && data.freezer  is list;
  }
}
```

## Funzionalità

- **Autenticazione** — login con Google, dati isolati per utente
- **Sincronizzazione real-time** — dispensa aggiornata su tutti i dispositivi via Firestore
- **Dispensa** — credenza / frigo / freezer con modifica inline di nome e quantità
- **Data di aggiunta** mostrata sotto ogni prodotto
- **Data di scadenza** — opzionale per ogni alimento, con avviso visivo: arancio = scade presto (≤ 3 giorni), rosso = scaduto
- **Urgenza** — puntino rosso + ordinamento priorità
- **Export / Import CSV** — backup e ripristino con un click
- **Ricette AI** — suggerimenti basati su quello che hai (incluse scadenze), con streaming
- **Spesa Smart** — lista della spesa stagionale integrata con la dispensa
- **API key Gemini** — configurabile nelle impostazioni, salvata in localStorage (è la chiave dell'utente, non del developer)
