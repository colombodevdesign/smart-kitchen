# cucina-smart

Gestione dispensa personale con suggerimenti AI. Dati salvati in localStorage, nessun backend.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
# output in /dist, deployabile su Vercel/Netlify con drag & drop
```

## Deploy rapido su Vercel

1. `npm run build`
2. `npx vercel --prod` (o drag & drop della cartella `dist` su vercel.com)

## Funzionalità

- **Dispensa** — credenza / frigo / freezer con modifica inline di nome e quantità
- **Data di aggiunta** mostrata sotto ogni prodotto
- **Data di scadenza** — opzionale per ogni alimento, con avviso visivo: arancio = scade presto (≤ 3 giorni), rosso = scaduto; clicca per modificare inline
- **Urgenza** — puntino rosso + ordinamento priorità
- **Export / Import CSV** — backup e ripristino con un click
- **Ricette AI** — suggerimenti basati su quello che hai (incluse scadenze), con streaming
- **Spesa Smart** — lista della spesa stagionale integrata con la dispensa
- **API key** — configurabile nelle impostazioni, salvata solo in localStorage

## Note sicurezza

La API key Gemini è gestita tramite una Vercel/Netlify Function come proxy (`/api/gemini.js`) e non è esposta nel codice client.
