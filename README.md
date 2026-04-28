# smart-kitchen

Gestione dispensa personale con sincronizzazione real-time tra dispositivi e suggerimenti AI stagionali.

Stack: React 18 + Vite 5 + Firebase (Auth + Firestore) + Gemini AI.

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

- **Autenticazione** — login con Google o Apple, dati isolati per utente
- **Sincronizzazione real-time** — dispensa aggiornata su tutti i dispositivi via Firestore
- **Dispensa** — credenza / frigo / freezer con modifica inline di nome e quantità
- **Data di aggiunta** mostrata sotto ogni prodotto
- **Data di scadenza** — opzionale per ogni alimento, con avviso visivo: arancio = scade presto (≤ 3 giorni), rosso = scaduto
- **Urgenza** — puntino rosso + ordinamento priorità
- **Export / Import CSV** — backup e ripristino con un click
- **Ricette AI** — suggerimenti basati su quello che hai (incluse scadenze), con streaming
- **Spesa Smart** — lista della spesa stagionale integrata con la dispensa
- **API key Gemini** — configurabile nelle impostazioni, salvata in localStorage (è la chiave dell'utente, non del developer)
