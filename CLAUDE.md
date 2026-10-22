# smart-kitchen — CLAUDE.md

Reference rapido per sessioni future. Aggiorna quando cambia l'architettura.

## Progetto

App React single-page per gestione dispensa con suggerimenti AI stagionali.
Stack: React 18 + Vite 5 + CSS Modules + Firebase (Auth + Firestore).
Autenticazione Google obbligatoria. Dispensa, pasti, ricette salvate e lista
spesa vivono su Firestore, sincronizzati in real-time tra dispositivi. Nessun backend
custom, nessun routing library.

## Comandi

```bash
npm run dev      # dev server (Vite)
npm run build    # build produzione
npm run preview  # preview build
```

Richiede `.env` con le variabili Firebase (vedi `.env.example`).

## Struttura

```
index.html                  # script inline che applica il tema prima del primo paint
public/
  fonts/                    # Bricolage Grotesque + DM Sans (variabili, latin, self-hosted) + licenze
  manifest.json, icon-*.png # PWA: monogramma SK con forchetta/coltello, S crema + K giallo su verde #1E5A43
src/
  main.jsx                  # entry: ToastProvider + watchSystemTheme
  firebase.js               # app, auth, db, messagingPromise, callFunction (import dinamico di firebase/functions)
  App.jsx                   # auth guard + orchestrazione stato + 5 destinazioni + AddFlow
  nav/tabs.js               # TABS (oggi, dispensa, cucina, spesa, tu) e sotto-sezioni
  ai/
    model.js                # MODEL_NAME (unico punto dove cambiare modello)
    prompts.js              # prompt ricette/spesa, PROMPT_VERSION (entra nell'hash della cache)
    errors.js               # classifyError → no-key | quota | invalid-key | offline | unknown
    extractIngredients.js   # estrazione batch degli ingredienti delle ricette (generateContent + responseSchema)
  hooks/
    useAuth.js              # Firebase Auth (Google), onAuthStateChanged
    useNavigation.js        # {tab, sub, detail} + history.pushState/popstate (nessun router)
    useInventory.js         # CRUD dispensa + CSV + Firestore sync (fallback localStorage), restoreItem
    useMealTracker.js       # pasti + sync
    useSavedRecipes.js      # ricette salvate + sync + estrazione ingredienti in background
    useSavedShopping.js     # lista spesa + sync
    useAI.js                # Gemini: ricette/spesa/follow-up, streaming, cache
    useVoiceBatch.js        # voce → item dispensa
    useReceiptScan.js       # scontrino → item dispensa
    useBatchCandidates.js   # lista candidati editabile condivisa dai due import
    useNotifications.js     # preferenze + dispositivi push, enable/disable, notifica di prova; useForegroundPush
    useOnline.js            # navigator.onLine + eventi
    useMediaQuery.js
  components/
    ui/                     # Icon, Segmented, StatusBadge, Chip, EmptyState, Toast(+useToast), PageHeader, OfflineBanner, RecipeCard
    TodayTab, PantryTab, ItemRow, CucinaTab, AITab, SavedRecipesTab, RecipeDetail, MealTrackerTab,
    SpesaTab, SavedShoppingTab, PantrySuggestionsModal, TuTab, ProfileTab, NotificationSettings,
    AddFlow, AddSheet, VoiceBatchModal, ReceiptScanModal, BatchReview,
    MealFormModal, MealDetailSheet, Modal, BottomNav, Sidebar, LoginScreen
  data/
    initialInventory.js     # SECTIONS, SECTION_LABELS
    seasonal.js             # produce stagionale per mese (Lombardia)
    mealCategories.js       # categorie pasti {id, label, icon}; i colori sono token --cat-*
  utils/
    date.js                 # SOON_DAYS, daysUntil (giorni di calendario), toDateStr, formatExpiry, expiryStatus
    pantry.js               # statusRank, itemBadge, getUseSoonItems, getPantryCandidates
    markdown.js             # md(): escape HTML poi #/##→h3, ###→h4, **bold**, liste
    parsers.js              # parseRecipes (split su "## "), parseShoppingItems, extractQty
    ingredientMatch.js      # "Hai X ingredienti su Y": matching per radici (puro)
    apiKey.js, theme.js
functions/
  index.js                  # sendExpiryNotifications (ogni 15 min) + callable sendTestNotification
  lib/schedule.js           # ora locale / finestre di giorno con Intl (DST-safe), shouldSendNow
  lib/notify.js             # raggruppamento messaggi, invio, token stale (funzioni pure con db/messaging iniettati)
docs/
  design-brief.md, ui-implementation-notes.md   # design e note di implementazione
  firestore-rules.md                            # regole Firestore da applicare a mano
```

## Navigazione

Cinque destinazioni: Oggi, Dispensa, Cucina (Ricette AI / Salvate / Pasti), Spesa (Lista / Idee AI), Tu.
`useNavigation` tiene `{tab, sub, detail}`; le viste di dettaglio (ricetta, notifiche) aggiungono una voce
alla history, quindi il tasto indietro del telefono le chiude. A ≥1024px Cucina e Spesa mostrano lo split a
due colonne. `BottomNav` e il FAB si nascondono quando `nav.detail` è attivo (`data-detail`).

Layout mobile (≤600px): `.app` è una colonna flex con la bottom nav **in flusso** (non fixed), quindi l'area
scrollabile `.main` finisce già sopra la nav. Conseguenze: le barre `position: sticky` dentro `.main` usano
`bottom: 0` (il padding di `.main` dà il margine), mentre solo gli elementi `position: fixed` (FAB) usano
`--float-bottom`. L'header è ridotto a una striscia alta quanto `env(safe-area-inset-top)` (su iOS standalone la
pagina è disegnata sotto la status bar, `black-translucent`): il logo compare solo da tablet in su. Da iOS 26 il sistema sfoca ~40pt sotto il bordo alto delle web app installate (non
disattivabile): `.main` ha 8px di padding in più in alto per stare un po' più lontano dalla fascia. I toast
(`ui/Toast`) stanno in alto, sotto la safe area, così non si sovrappongono a FAB e nav.

## Firebase — configurazione

Variabili d'ambiente Vite (`.env`):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_VAPID_KEY        ← VAPID key per Web Push (Firebase Console → Cloud Messaging → Web Push certificates)
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

L'unico provider è Google (Firebase Console → Authentication → Sign-in method).

## Firestore — struttura dati

```
/users/{uid}/inventory/data            →  { credenza: [...], frigo: [...], freezer: [...] }
/users/{uid}/meals/data                →  { "YYYY-MM-DD": Meal[] }
/users/{uid}/savedRecipes/data         →  { items: SavedRecipe[] }
/users/{uid}/savedShopping/data        →  { items: ShoppingItem[] }
/users/{uid}/notificationPrefs/data    →  { enabled, hour, minute, tz, daysBefore: number[], lastRunDay, updatedAt }
/users/{uid}/pushTokens/{deviceId}     →  { token, label, platform, status: 'active'|'stale', lastOkAt, staleSince, updatedAt }
/users/{uid}/pushToken/data            →  LEGACY (dispositivo singolo): { token, enabled, updatedAt }
```

Wrapping `{ items: [...] }` per ricette/spesa: Firestore non accetta array root in
`setDoc`, lo stato React resta array piatto. `meals` è già una mappa, niente wrap.

Al primo login, i dati vengono migrati automaticamente da localStorage a Firestore
(per ogni doc mancante: `setDoc(ref, localData)`).

`pushToken/data` è scritto ancora in doppia copia da `useNotifications` finché la Function precedente
non è stata ridistribuita; i punti sono marcati `TODO(remove next release)` (client, `functions/lib/notify.js`
fallback e regole).

## LocalStorage — chiavi

| Chiave | Contenuto |
|---|---|
| `gemini-api-key` | API key Gemini (rimane locale per sicurezza) |
| `theme` | preferenza tema: `system` \| `light` \| `dark` |
| `sk-device-id` | id di questo dispositivo per `pushTokens/{deviceId}` |
| `sk-notif-migrated-{uid}` | flag: migrazione da `pushToken/data` già tentata |
| `cucina-ai-cache-v1` | cache risposte AI (l'hash include `PROMPT_VERSION`) |
| `cucina-session-ricette-v1` | sessione chat ricette |
| `cucina-session-spesa-v1` | sessione chat spesa |
| `cucina-smart-v1` | inventario fallback (solo quando non loggati) |
| `cucina-pasti-v1` | pasti fallback (solo quando non loggati) |
| `cucina-ricette-salvate-v1` | ricette salvate fallback (solo quando non loggati) |
| `cucina-spesa-salvata-v1` | lista spesa fallback (solo quando non loggati) |

## Auth flow (`src/hooks/useAuth.js`)

- `user === undefined` → Firebase sta inizializzando (mostra spinner)
- `user === null` → non loggato (mostra `LoginScreen`, solo Google)
- `user === object` → loggato (mostra app)
- `signInWithGoogle()` → `signInWithPopup`; `signOut()` → torna a `LoginScreen`

## Hook con sync Firestore — pattern condiviso

`useInventory`, `useMealTracker`, `useSavedRecipes`, `useSavedShopping` seguono tutti
lo stesso pattern (`useInventory.js` è il riferimento canonico):
- Accettano `uid` come parametro.
- Con uid: `onSnapshot` per real-time sync; ogni mutazione chiama `setDoc(ref, next)`.
- Senza uid: solo localStorage (fallback / non loggati).
- `!snap.metadata.hasPendingWrites` per evitare doppi render sui propri write.
- Migrazione `localStorage → Firestore` al primo login: se `!snap.exists()` fa
  `setDoc(ref, local)`.
- `clearInventory()` svuota sia Firestore che localStorage.

## Modello dati — Item (dispensa)

```js
{
  id: string,        // section[0] + Date.now()
  name: string,
  qty: string,
  urgent: boolean,   // flag "aperto": elemento aperto, da consumare presto (senza scadenza precisa)
  added: number,     // timestamp ms
  expiresAt: number | null
}
```

## Modello dati — Meal (pasti)

```js
{
  id: string,
  text: string,
  category: 'colazione' | 'pranzo' | 'cena' | 'spuntino' | null,
  recipeId: string | null,        // riferimento opzionale a SavedRecipe
  recipeTitle: string | null,     // denormalizzato: sopravvive alla cancellazione
  createdAt: number,
}
```

I pasti vecchi privi di `category` vengono renderizzati con dot grigio neutro;
NON viene fatta migrazione automatica per evitare scritture silenziose multi-device.

## Import massivo in dispensa (voce e scontrino)

Due flussi paralleli, stessa struttura e stessa schermata di verifica:

| | Voce | Scontrino |
|---|---|---|
| Hook | `useVoiceBatch.js` | `useReceiptScan.js` |
| Modale | `VoiceBatchModal.jsx` | `ReceiptScanModal.jsx` |
| Input | `MediaRecorder`, max 60s | `<input type="file" capture="environment">` |
| Stati | `idle → recording → processing → ready \| error` | `idle → processing → ready \| error` |

- Entrambi chiamano `generateContent` (non streaming) con `responseMimeType: 'application/json'`
  e un `responseSchema` che vincola `{ name, qty, section }`; lo scontrino aggiunge `raw`
  (riga originale) mostrato come hint sopra al nome nella verifica.
- La foto viene ridimensionata a 1600px lato lungo e ricodificata in JPEG su canvas prima
  dell'invio; l'immagine processata resta come anteprima nella modale.
- Il prompt scontrino espande le abbreviazioni ("PNE CASER" → "pane casereccio") e scarta
  righe non alimentari, totali, sconti e intestazioni.
- `BatchReview.jsx` è la schermata di verifica condivisa (checkbox, nome, quantità,
  segmented credenza/frigo/freezer) e ospita anche gli stili dei bottoni del footer;
  `useBatchCandidates.js` gestisce la lista editabile.
- Alla conferma entrambi passano `[{ name, qty, section }]` a `onAddBatch` → `addBatch`
  di `useInventory` (item creati con `expiresAt: null` e `urgent: false`).
- Entrambi i bottoni nella add-row sono disabilitati se manca `gemini-api-key`.

## Integrazione AI

- SDK: `@google/genai`. Modello: `MODEL_NAME` in `src/ai/model.js` (usato da `useAI`, `useVoiceBatch`,
  `useReceiptScan` e `extractIngredients`: per cambiarlo si modifica solo quel file).
- Prompt in `src/ai/prompts.js`. **Formato ricetta**: `## Titolo`, una riga meta (tempo/porzioni), poi
  `### Ingredienti` e `### Procedimento`. Le sezioni interne usano `###` perché `parseRecipes` spezza le
  ricette su `## `; il testo prima del primo `##` viene scartato. Se cambi il formato, alza `PROMPT_VERSION`.
- Marcatori nell'inventario inviato: `[scad]`/`[oggi]`/`[Ngg]` (scade presto) e `[APERTO]`; priorità: scade
  presto > aperto; i già scaduti vanno controllati prima di usarli.
- Streaming: `generateContentStream`, `chunk.text` (stringa). Multi-turn con `apiHistoryRef`.
- Funzioni esposte da `useAI`: `fetchRicette()`, `fetchSpesa()`, `sendFollowUp(text)`; stato `{ loading, messages,
  streaming, error, errorCode, cached, ... }`. `errorCode`: `no-key | quota | invalid-key | offline | unknown`.
- "Hai X ingredienti su Y" (`useSavedRecipes` + `ai/extractIngredients.js` + `utils/ingredientMatch.js`):
  dopo il salvataggio una chiamata batch estrae `{ ingredients: [{ name, qty, qb }] }` per ricetta (mai
  bloccante; "Analizza ingredienti" fa il backfill). Il matching è per radici: un ingrediente è "in dispensa" se
  le sue radici sono un sottoinsieme di quelle del prodotto con la stessa radice principale ("pasta" ≈ "pasta
  penne", ≠ "pasta sfoglia"). Non confronta le quantità.

## Componente AITab

Parser markdown minimale (`utils/markdown.js`, con escape HTML). Mostra le ricette come schede
(`ui/RecipeCard`), `aria-live="polite"` + `aria-busy` durante lo streaming, scroll automatico solo se
l'utente è già in fondo. Ricette senza `###` cadono su rendering markdown semplice.

## CSS e tema

Token in `src/index.css`: `:root` chiaro e **un solo** blocco `:root[data-theme='dark']`. Lo script inline in
`index.html` (e `utils/theme.js`) risolve "Sistema/Chiaro/Scuro" a `light`/`dark`, imposta `data-theme`,
`color-scheme` e `<meta name="theme-color">` prima del paint; per questo non servono media query nel CSS.
Palette verde orto (`--accent: #1E5A43`) + giallo zucca (`--highlight`), Bricolage Grotesque (titoli,
`--font-display`) + DM Sans. Regole: nessun colore hex nei `.module.css` (solo token), nessun `style` inline
per i colori, target tattili `--tap` (44px) / `--tap-lg` (56px), z-index dalla scala `--z-*`,
`--bottom-nav-h` e `--float-bottom` per tutto ciò che sta sopra la nav. Colori sezione e categoria pasto
arrivano da `data-s` / `data-cat`. `[hidden]` è forzato a `display: none`. Breakpoint: 600px (mobile),
1024px (sidebar desktop). Ogni componente ha il suo `.module.css`.

## Firestore Security Rules

Il testo completo delle regole è in `docs/firestore-rules.md` (nessun `firestore.rules` nel repo:
applicarle a mano dalla Console dopo ogni modifica). Ogni utente legge e scrive solo i propri documenti;
`notificationPrefs` ha regole di lettura e scrittura separate con validazione dei campi, `pushTokens`
accetta solo token `active` dal client (`stale` lo imposta la Function).

## Notifiche push

**Client** — `hooks/useNotifications.js` (schermata `NotificationSettings`):
- `enable()` chiede il permesso, registra `/firebase-messaging-sw.js`, ottiene il token FCM e scrive
  `pushTokens/{deviceId}` + `notificationPrefs/data` (`enabled:true`, `tz` del dispositivo).
  `disable()` scrive solo `enabled:false` e non tocca i token.
- All'apertura dell'app, se gli avvisi sono attivi e il permesso concesso, il token viene verificato e
  riscritto in silenzio (auto-riparazione). Un dispositivo "non raggiungibile" si riattiva aprendo l'app lì:
  non esiste un pulsante "Riattiva" (il motivo sta in un tooltip).
- `useForegroundPush` (in `App`) mostra le push ricevute con l'app aperta come toast.
- `sendTest()` chiama la callable `sendTestNotification` e mostra l'esito per dispositivo.

**Functions** (`functions/`, Node 22, CommonJS):
- `sendExpiryNotifications`: schedule `*/15 * * * *`. Per ogni utente con `notificationPrefs.enabled`
  controlla se l'ora locale (`tz`) è nella finestra `[hour:minute, +30 min)` (minuti arrotondati al quarto
  d'ora) e se `lastRunDay` non è oggi; raccoglie i prodotti che scadono nei giorni di `daysBefore`
  (giorni di calendario locali, DST-safe), invia un messaggio raggruppato per giorno a tutti i token attivi
  con `sendEach`. I token rifiutati da FCM diventano `status:'stale'` (eliminati dopo 30 giorni).
  Gli utenti senza prefs ma con il vecchio `pushToken/data` abilitato ricevono ancora l'avviso alle 09:00.
  La lista utenti arriva da `listDocuments()` + `getAll` delle prefs a blocchi di 100: nessun indice
  necessario, ma costa una lettura per utente a ogni tick (valutare un `collectionGroup` se gli utenti crescono).
- `sendTestNotification` (callable, richiede auth): invia a tutti i dispositivi (anche stale) e restituisce
  `{ results: [{ deviceId, label, status: 'ok'|'stale'|'error' }] }`.
- `lib/schedule.js` e `lib/notify.js` sono pure (db/messaging iniettati), provabili con `node`.

`src/firebase-messaging-sw.template.js` è elaborato dal plugin Vite (`%%VITE_*%%` → `.env`) e servito alla
root come `firebase-messaging-sw.js`.

### Setup one-time richiesto
1. Firebase Console → Cloud Messaging → **Web Push certificates** → copiare la chiave in `.env` come
   `VITE_FIREBASE_VAPID_KEY`.
2. Piano **Blaze** (Cloud Functions schedulate). 96 esecuzioni al giorno: ricontrollare il free tier.
3. Pubblicare le regole di `docs/firestore-rules.md`.
4. `cd functions && npm install && cd .. && firebase deploy --only functions` (aggiorna il job esistente
   `sendExpiryNotifications` e crea `sendTestNotification`).
5. Poi deploy del client. Ordine: **regole → Functions → client**.
6. iOS: le push web funzionano solo con la PWA aggiunta alla Home (iOS 16.4+).

## Branch di sviluppo

Il branch di default per fix/feature è quello indicato a inizio sessione.
Non pushare su `main` direttamente.
