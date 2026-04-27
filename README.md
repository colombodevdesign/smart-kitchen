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
- **Urgenza** — puntino rosso + ordinamento priorità
- **Export CSV** — backup con un click
- **Ricette AI** — suggerimenti basati su quello che hai, con streaming
- **Spesa Smart** — lista della spesa stagionale integrata con la dispensa
- **API key** — configurabile nelle impostazioni, salvata solo in localStorage

## Note sicurezza

La API key viene chiamata direttamente dal browser (no proxy). Accettabile per uso personale su repo privata. Per distribuzione pubblica, aggiungere una Vercel/Netlify function come proxy.
