# smart-kitchen — CLAUDE.md

Reference rapido per sessioni future. Aggiorna quando cambia l'architettura.

## Progetto

App React single-page per gestione dispensa con suggerimenti AI stagionali.
Stack: React 18 + Vite 5 + CSS Modules + Firebase (Auth + Firestore).
Autenticazione Google/Apple obbligatoria. I dati dispensa vivono su Firestore,
sincronizzati in real-time tra dispositivi. Nessun backend custom, nessun routing library.

## Comandi

```bash
npm run dev      # dev server (Vite)
npm run build    # build produzione
npm run preview  # preview build
```

Richiede `.env` con le variabili Firebase (vedi `.env.example`).

## Struttura

```
src/
  main.jsx                  # entry point React
  firebase.js               # inizializzazione Firebase app, auth, db
  App.jsx                   # root: auth guard + tab navigation + state orchestration
  hooks/
    useAuth.js              # Firebase Auth: Google/Apple login, onAuthStateChanged
    useInventory.js         # CRUD dispensa + CSV + Firestore sync (fallback localStorage)
    useAI.js                # chiamate Gemini + cache + streaming
  components/
    LoginScreen.jsx         # schermata login Google/Apple
    PantryTab.jsx           # UI dispensa (3 sezioni: credenza/frigo/freezer)
    ItemRow.jsx             # riga item con edit inline e badge scadenza
    AITab.jsx               # display output AI con streaming + markdown
    SettingsTab.jsx         # profilo utente + API key + import/export CSV
  data/
    initialInventory.js     # costanti SECTIONS e SECTION_LABELS
    seasonal.js             # produce stagionale mese per mese (Lombardia)
  utils/
    date.js                 # formatDate, formatExpiry, expiryStatus
```

## Firebase — configurazione

Variabili d'ambiente Vite (`.env`):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Per Apple Sign-In è necessario configurare un Service ID in Apple Developer Portal
e abilitare il provider in Firebase Console → Authentication → Sign-in method.

## Firestore — struttura dati

```
/users/{uid}/inventory/data  →  { credenza: [...], frigo: [...], freezer: [...] }
```

Al primo login, i dati vengono migrati automaticamente da localStorage a Firestore.

## LocalStorage — chiavi residue

| Chiave | Contenuto |
|---|---|
| `gemini-api-key` | API key Gemini (rimane locale per sicurezza) |
| `cucina-ai-cache-v1` | cache risposte AI |
| `cucina-session-ricette-v1` | sessione chat ricette |
| `cucina-session-spesa-v1` | sessione chat spesa |
| `cucina-smart-v1` | inventario locale (usato solo quando non loggati) |

## Auth flow (`src/hooks/useAuth.js`)

- `user === undefined` → Firebase sta inizializzando (mostra spinner)
- `user === null` → non loggato (mostra `LoginScreen`)
- `user === object` → loggato (mostra app)
- `signInWithGoogle()` / `signInWithApple()` → `signInWithPopup`
- `signOut()` → torna a `LoginScreen`

## useInventory — sync Firestore (`src/hooks/useInventory.js`)

Accetta `uid` come parametro:
- Con uid: `onSnapshot` per real-time sync, ogni mutazione chiama `setDoc` direttamente
- Senza uid: solo localStorage (fallback / sviluppo senza Firebase)
- `snap.metadata.hasPendingWrites` usato per evitare doppi render sui propri write
- `clearInventory()` svuota sia Firestore che localStorage

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
- Streaming: `ai.models.generateContentStream({ model, contents, config: { systemInstruction } })`
- Chunk testo: `chunk.text` (stringa, non metodo) — nessun `maxOutputTokens` hardcoded
- Multi-turn: `contents` è un array `[{role:'user'|'model', parts:[{text}]}, ...]` — storia API in `apiHistoryRef`
- Tre funzioni esposte: `fetchRicette()`, `fetchSpesa()`, `sendFollowUp(text)`
- Stato restituito: `{ loading, messages, streaming, error, cached, ... }`
- Cache hash-based: invalida se cambia mese o inventario
- Prompt: italiano, Lombardia, stagionale, priorità agli item `[DA USARE PRESTO]`

Per cambiare modello: modifica solo `MODEL_NAME` in `useAI.js:7`.

## Componente AITab (`src/components/AITab.jsx`)

Renderizza l'output in streaming con parser markdown minimale:
- `## title` → `<h3>`
- `**text**` → `<strong>`
- `- item` → `<li>`

## CSS

Variabili globali in `src/index.css`. Palette warm brown (`--accent: #BA7517`).
Dark mode via `prefers-color-scheme`. Max-width 720px. Breakpoint mobile 600px.
Ogni componente ha il suo `.module.css`.

## Branch di sviluppo

Il branch di default per fix/feature è `claude/cross-device-data-sync-puJOK` (o il branch
indicato a inizio sessione). Non pushare su `main` direttamente.
