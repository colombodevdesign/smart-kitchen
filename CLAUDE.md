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
    model.js                # MODEL_NAME (Lite) + MODEL_PRO e PRO_CONFIG (unico punto dove cambiare modelli)
    prompts.js              # prompt ricette/spesa, PROMPT_VERSION (entra nell'hash della cache)
    errors.js               # classifyError → no-key | quota | billing | invalid-key | offline | unknown
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
    TodayTab, ExpiringList, PantryTab, ItemRow, CucinaTab, AITab, SavedRecipesTab, RecipeDetail, MealTrackerTab,
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
`useNavigation` tiene `{tab, sub, detail}`; le viste di dettaglio (ricetta, notifiche, "In scadenza" su Oggi) aggiungono una voce
alla history, quindi il tasto indietro del telefono le chiude. A ≥1024px Cucina e Spesa mostrano lo split a
due colonne. `BottomNav` e il FAB si nascondono quando `nav.detail` è attivo (`data-detail`).

Layout mobile (≤600px): `.app` è una colonna flex con la bottom nav **in flusso** (non fixed), quindi l'area
scrollabile `.main` finisce già sopra la nav. Conseguenze: le barre `position: sticky` dentro `.main` usano
`bottom: 0` (il padding di `.main` dà il margine), mentre solo gli elementi `position: fixed` (FAB) usano
`--float-bottom`. L'header è ridotto a una striscia alta quanto `env(safe-area-inset-top)` (su iOS standalone la
pagina è disegnata sotto la status bar, `black-translucent`): il logo compare solo da tablet in su. Da iOS 26 il
sistema aggiunge un blur "scroll edge" di ~40pt sotto il bordo alto delle web app installate (non disattivabile):
`index.html` marca `<html data-ios-standalone>` (`navigator.standalone`) e `--edge-ramp` (28px, 0 in landscape)
si somma a `env(safe-area-inset-top)` in `--top-inset`, usato dalla striscia mobile e dall'header tablet. I toast
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
/users/{uid}/pushTokens/{deviceId}     →  { token, label, platform, status: 'active'|'stale', lastOkAt, lastSeenAt, staleSince, updatedAt }
```

Wrapping `{ items: [...] }` per ricette/spesa: Firestore non accetta array root in
`setDoc`, lo stato React resta array piatto. `meals` è già una mappa, niente wrap.

Al primo login, i dati vengono migrati automaticamente da localStorage a Firestore
(per ogni doc mancante: `setDoc(ref, localData)`).

Il vecchio doc `users/{uid}/pushToken/data` (dispositivo singolo) non è più letto né scritto; se esiste ancora
si può cancellare dalla Console.

## LocalStorage — chiavi

| Chiave | Contenuto |
|---|---|
| `gemini-api-key` | API key Gemini (rimane locale per sicurezza) |
| `theme` | preferenza tema: `system` \| `light` \| `dark` |
| `sk-device-id` | id di questo dispositivo per `pushTokens/{deviceId}` |
| `sk-notif-off-here` | `'1'` se l'utente ha rimosso questo dispositivo: l'auto-riparazione non lo ri-registra |
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

- SDK: `@google/genai`. Modelli in `src/ai/model.js` (per cambiarli si modifica solo quel file):
  `MODEL_PRO` (`gemini-3.8-flash`, con `PRO_CONFIG` = ragionamento `LOW`, perché i token di ragionamento si
  pagano come output) dove la qualità si vede: ricette e relativi follow-up (`useAI` con `name === 'ricette'`) e
  scontrino (`useReceiptScan`). `MODEL_NAME` (`gemini-3.5-flash-lite`) per spesa, voce ed `extractIngredients`.
  Il nome del modello entra nell'hash della cache di `useAI`: cambiando modello le risposte vengono rigenerate.
- Prompt in `src/ai/prompts.js`. **Formato ricetta**: `## Titolo`, una riga meta (tempo/porzioni), poi
  `### Ingredienti` e `### Procedimento`. Le sezioni interne usano `###` perché `parseRecipes` spezza le
  ricette su `## `; il testo prima del primo `##` viene scartato. Se cambi il formato, alza `PROMPT_VERSION`.
- Marcatori nell'inventario inviato: `[scad]`/`[oggi]`/`[Ngg]` (scade presto) e `[APERTO]`; priorità: scade
  presto > aperto; i già scaduti vanno controllati prima di usarli.
- Streaming: `generateContentStream`, `chunk.text` (stringa). Multi-turn con `apiHistoryRef`.
- Funzioni esposte da `useAI`: `fetchRicette()`, `fetchSpesa()`, `sendFollowUp(text)`; stato `{ loading, messages,
  streaming, error, errorCode, cached, ... }`. `errorCode`: `no-key | quota | billing | invalid-key | offline | unknown`.
- Errori API: l'SDK mette nel `message` il JSON della risposta (a volte annidato due volte); `apiErrorInfo` lo
  scompatta, così l'utente non vede mai JSON grezzo. `billing` = HTTP 402 / credito prepagato esaurito: tutte
  le chiavi dei progetti collegati a quel conto falliscono finché non si ricarica su AI Studio (l'errore mostra
  il link). Voce e scontrino passano da `classifyError` e aggiungono solo il messaggio per audio/immagine rifiutati.
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
  riscritto in silenzio (auto-riparazione), e `lastSeenAt` aggiornato al massimo ogni 12 ore (serve a
  distinguere i dispositivi con la stessa etichetta). Un dispositivo "non raggiungibile" si riattiva aprendo
  l'app lì: non esiste un pulsante "Riattiva" (il motivo sta in un tooltip).
- Un documento per token: `writeDevice` cancella gli altri doc con lo stesso token e la lista li mostra una volta.
- `removeDevice(id)` (cestino con conferma nella lista): cancella il doc. Se è questo dispositivo fa anche
  `deleteToken` e imposta `sk-notif-off-here`, così l'auto-riparazione non lo ri-registra finché non si
  riattiva qui.
- `useForegroundPush` (in `App`) mostra le push ricevute con l'app aperta come toast (con "Vedi" se la push
  ha `data.open`). `useNotificationOpen` apre la vista indicata da `?apri=scadenze` (app chiusa) o dal
  messaggio `sk-open` del service worker (app già aperta).
- `sendTest()` chiama la callable `sendTestNotification` e mostra l'esito per dispositivo.

**Functions** (`functions/`, Node 22, CommonJS):
- `sendExpiryNotifications`: schedule `*/15 * * * *`. Per ogni utente con `notificationPrefs.enabled`
  controlla se l'ora locale (`tz`) è nella finestra `[hour:minute, +30 min)` (minuti arrotondati al quarto
  d'ora) e se `lastRunDay` non è oggi; raccoglie i prodotti che scadono nei giorni di `daysBefore`
  (giorni di calendario locali, DST-safe), invia **un solo** messaggio di riepilogo ("3 prodotti scadono
  domani" + nomi) a tutti i token attivi (deduplicati per valore) con `sendEach`. Il messaggio ha
  `webpush.notification.tag = 'sk-scadenze'` (due push sullo stesso dispositivo si fondono) e
  `data.open = 'scadenze'` (il tocco apre la lista "In scadenza"). I token rifiutati da FCM diventano
  `status:'stale'` (eliminati dopo 30 giorni).
  La lista utenti arriva da `listDocuments()` + `getAll` delle prefs a blocchi di 100: nessun indice
  necessario, ma costa una lettura per utente a ogni tick (valutare un `collectionGroup` se gli utenti crescono).
- `sendTestNotification` (callable, richiede auth): invia a tutti i dispositivi (anche stale) e restituisce
  `{ results: [{ deviceId, label, status: 'ok'|'stale'|'error' }] }`.
- `lib/schedule.js` e `lib/notify.js` sono pure (db/messaging iniettati), provabili con `node`.

`src/firebase-messaging-sw.template.js` è elaborato dal plugin Vite (`%%VITE_*%%` → `.env`) e servito alla
root come `firebase-messaging-sw.js`. I messaggi hanno il payload `notification`, quindi la notifica la mostra
già l'SDK: il SW **non** deve chiamare `showNotification` in `onBackgroundMessage`, altrimenti arriva doppia.
Il suo `notificationclick` è registrato prima di `firebase.messaging()` per precedere quello dell'SDK: mette a
fuoco l'app e le manda `sk-open`, oppure la apre su `/?apri=<vista>`.

### Setup one-time richiesto
1. Firebase Console → Cloud Messaging → **Web Push certificates** → copiare la chiave in `.env` come
   `VITE_FIREBASE_VAPID_KEY`.
2. Piano **Blaze** (Cloud Functions schedulate). 96 esecuzioni al giorno: ricontrollare il free tier.
3. `cd functions && npm install && cd .. && firebase deploy --only functions` (aggiorna il job esistente
   `sendExpiryNotifications` e la callable `sendTestNotification`).
4. Poi deploy del client, poi le regole di `docs/firestore-rules.md`. Ordine: **Functions → client → regole**.
5. iOS: le push web funzionano solo con la PWA aggiunta alla Home (iOS 16.4+).

## Branch di sviluppo

Il branch di default per fix/feature è quello indicato a inizio sessione.
Non pushare su `main` direttamente.
