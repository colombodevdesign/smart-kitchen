# smart-kitchen — CLAUDE.md

Reference rapido per sessioni future. Aggiorna quando cambia l'architettura.

## Progetto

App React single-page (client-only) per gestione dispensa con suggerimenti AI stagionali.
Stack: React 18 + Vite 5 + CSS Modules. Nessun backend, nessun routing library.
Tutto il dato vive in `localStorage`.

## Comandi

```bash
npm run dev      # dev server (Vite)
npm run build    # build produzione
npm run preview  # preview build
```

## Struttura

```
src/
  main.jsx                  # entry point React
  App.jsx                   # root: tab navigation + state orchestration
  hooks/
    useInventory.js         # CRUD dispensa + CSV + localStorage sync
    useAI.js                # chiamate Gemini + cache + streaming
  components/
    PantryTab.jsx           # UI dispensa (3 sezioni: credenza/frigo/freezer)
    ItemRow.jsx             # riga item con edit inline e badge scadenza
    AITab.jsx               # display output AI con streaming + markdown
    SettingsTab.jsx         # gestione API key + import/export CSV
  data/
    initialInventory.js     # costanti SECTIONS e SECTION_LABELS
    seasonal.js             # produce stagionale mese per mese (Lombardia)
  utils/
    date.js                 # formatDate, formatExpiry, expiryStatus
```

## LocalStorage — chiavi

| Chiave | Contenuto |
|---|---|
| `cucina-smart-v1` | inventario `{ credenza: [], frigo: [], freezer: [] }` |
| `gemini-api-key` | API key Gemini (inserita dall'utente in Settings) |
| `cucina-ai-cache-v1` | cache risposte AI `{ ricette: {hash, output}, spesa: {hash, output} }` |

## Modello dati — Item

```js
{
  id: string,        // section[0] + Date.now()
  name: string,
  qty: string,
  urgent: boolean,
  added: number,     // timestamp ms
  expiresAt: number | null
}
```

## Integrazione AI (`src/hooks/useAI.js`)

- SDK: `@google/genai` (pacchetto ufficiale GA, non il vecchio `@google/generative-ai`)
- Modello: `gemini-3-flash-preview` (costante `MODEL_NAME`)
- Streaming via `ai.models.generateContentStream({ model, contents, config: { systemInstruction } })`
- Chunk testo: `chunk.text` (stringa, non metodo) — nessun `maxOutputTokens` hardcoded
- Cache hash-based: invalida se cambia mese o inventario
- Due funzioni esposte: `fetchRicette()`, `fetchSpesa()`
- Prompt: italiano, Lombardia, stagionale, priorità agli item `[DA USARE PRESTO]`

Per cambiare modello: modifica solo `MODEL_NAME` in `useAI.js:7`.

## Componente AITab (`src/components/AITab.jsx`)

Renderizza l'output in streaming con parser markdown minimale:
- `## title` → `<h3>`
- `**text**` → `<strong>`
- `- item` → `<li>`

## Navigazione tab

Gestita in `App.jsx` con `activeTab` state. Quando si cambia tab verso `ricette` o `spesa`,
viene chiamato `clearOutput()` per resettare l'output precedente.

## Stagionalità

`src/data/seasonal.js` esporta `getSeasonal()` (array produce del mese corrente) e
`getMonthName()` (nome mese in italiano). Dati per tutti i 12 mesi, regione Lombardia.

## CSS

Variabili globali in `src/index.css`. Palette warm brown (`--accent: #BA7517`).
Dark mode via `prefers-color-scheme`. Max-width 720px. Breakpoint mobile 600px.
Ogni componente ha il suo `.module.css`.

## Branch di sviluppo

Il branch di default per fix/feature è `claude/fix-gemini-truncation-zmtYb` (o il branch
indicato a inizio sessione). Non pushare su `main` direttamente.
