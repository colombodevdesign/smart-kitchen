# smart-kitchen — CLAUDE.md

Reference rapido per sessioni future. Aggiorna quando cambia l'architettura.

## Progetto

App React single-page per gestione dispensa con suggerimenti AI stagionali.
Stack: React 18 + Vite 5 + CSS Modules + Firebase (Auth + Firestore).
Autenticazione Google/Apple obbligatoria. Dispensa, pasti, ricette salvate e lista
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
src/
  main.jsx                  # entry point React
  firebase.js               # inizializzazione Firebase app, auth, db
  App.jsx                   # root: auth guard + tab navigation + state orchestration
  hooks/
    useAuth.js              # Firebase Auth: Google/Apple login, onAuthStateChanged
    useInventory.js         # CRUD dispensa + CSV + Firestore sync (fallback localStorage)
    useAI.js                # chiamate Gemini + cache + streaming
    useVoiceBatch.js        # registrazione audio → Gemini → item dispensa
    useReceiptScan.js       # foto scontrino → Gemini vision → item dispensa
    useBatchCandidates.js   # lista candidati editabile condivisa dai due import
    useMealTracker.js       # CRUD pasti + Firestore sync (fallback localStorage)
    useSavedRecipes.js      # ricette salvate + Firestore sync
    useSavedShopping.js     # lista spesa + Firestore sync
  components/
    LoginScreen.jsx         # schermata login Google/Apple
    PantryTab.jsx           # UI dispensa (3 sezioni: credenza/frigo/freezer)
    ItemRow.jsx             # riga item con edit inline e badge scadenza
    VoiceBatchModal.jsx     # import massivo da voce (registra → verifica → aggiungi)
    ReceiptScanModal.jsx    # import massivo da foto scontrino (scatta → verifica → aggiungi)
    BatchReview.jsx         # schermata di verifica condivisa dai due import massivi
    AITab.jsx               # display output AI con streaming + markdown
    SavedRecipesTab.jsx     # ricette salvate
    SavedShoppingTab.jsx    # lista spesa con check
    MealTrackerTab.jsx      # calendario pasti mese/settimana + FAB
    MealFormModal.jsx       # modale aggiunta pasto (descrizione + categoria + ricetta)
    MealDetailSheet.jsx     # bottom-sheet dettaglio/rimozione pasto
    Modal.jsx               # wrapper modale generico (centered desktop / bottom-sheet mobile)
    Sidebar.jsx             # nav desktop
    BottomNav.jsx           # nav mobile fissa in basso
    SettingsTab.jsx         # profilo utente + API key + import/export CSV + toggle notifiche
  data/
    initialInventory.js     # costanti SECTIONS e SECTION_LABELS
    seasonal.js             # produce stagionale mese per mese (Lombardia)
    mealCategories.js       # categorie pasti (colazione/pranzo/cena/spuntino) + colori/emoji
  utils/
    date.js                 # formatDate, formatExpiry, expiryStatus
```

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

Per Apple Sign-In è necessario configurare un Service ID in Apple Developer Portal
e abilitare il provider in Firebase Console → Authentication → Sign-in method.

## Firestore — struttura dati

```
/users/{uid}/inventory/data      →  { credenza: [...], frigo: [...], freezer: [...] }
/users/{uid}/meals/data          →  { "YYYY-MM-DD": Meal[] }
/users/{uid}/savedRecipes/data   →  { items: SavedRecipe[] }
/users/{uid}/savedShopping/data  →  { items: ShoppingItem[] }
```

Wrapping `{ items: [...] }` per ricette/spesa: Firestore non accetta array root in
`setDoc`, lo stato React resta array piatto. `meals` è già una mappa, niente wrap.

Al primo login, i dati vengono migrati automaticamente da localStorage a Firestore
(per ogni doc mancante: `setDoc(ref, localData)`).

## LocalStorage — chiavi residue

| Chiave | Contenuto |
|---|---|
| `gemini-api-key` | API key Gemini (rimane locale per sicurezza) |
| `cucina-ai-cache-v1` | cache risposte AI |
| `cucina-session-ricette-v1` | sessione chat ricette |
| `cucina-session-spesa-v1` | sessione chat spesa |
| `cucina-smart-v1` | inventario fallback (solo quando non loggati) |
| `cucina-pasti-v1` | pasti fallback (solo quando non loggati) |
| `cucina-ricette-salvate-v1` | ricette salvate fallback (solo quando non loggati) |
| `cucina-spesa-salvata-v1` | lista spesa fallback (solo quando non loggati) |

## Auth flow (`src/hooks/useAuth.js`)

- `user === undefined` → Firebase sta inizializzando (mostra spinner)
- `user === null` → non loggato (mostra `LoginScreen`)
- `user === object` → loggato (mostra app)
- `signInWithGoogle()` / `signInWithApple()` → `signInWithPopup`
- `signOut()` → torna a `LoginScreen`

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

## Integrazione AI (`src/hooks/useAI.js`)

- SDK: `@google/genai` (pacchetto ufficiale GA, non il vecchio `@google/generative-ai`)
- Modello: `gemini-3-flash-preview` (costante `MODEL_NAME`)
- Streaming: `ai.models.generateContentStream({ model, contents, config: { systemInstruction } })`
- Chunk testo: `chunk.text` (stringa, non metodo) — nessun `maxOutputTokens` hardcoded
- Multi-turn: `contents` è un array `[{role:'user'|'model', parts:[{text}]}, ...]` — storia API in `apiHistoryRef`
- Tre funzioni esposte: `fetchRicette()`, `fetchSpesa()`, `sendFollowUp(text)`
- Stato restituito: `{ loading, messages, streaming, error, cached, ... }`
- Cache hash-based: invalida se cambia mese o inventario
- Prompt: italiano, Lombardia, stagionale, priorità agli item `[APERTO]` (aperti, da consumare presto)

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

## Firestore Security Rules

Le rules sono applicate direttamente dalla Firebase Console (Firestore Database → Rules).
Nessun file `firestore.rules` nel repo — applicare manualmente dopo ogni modifica.

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
    match /users/{userId}/meals/data {
      allow read: if request.auth != null
                  && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data is map;
    }
    match /users/{userId}/savedRecipes/data {
      allow read: if request.auth != null
                  && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.keys().hasAll(['items'])
                   && request.resource.data.items is list;
    }
    match /users/{userId}/savedShopping/data {
      allow read: if request.auth != null
                  && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.keys().hasAll(['items'])
                   && request.resource.data.items is list;
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

Ogni utente può leggere e scrivere solo i propri documenti `/users/{uid}/...`.
`isValidInventory` garantisce la struttura della dispensa; `meals` accetta una mappa
arbitraria (chiavi date dinamiche); ricette/spesa richiedono che il payload abbia
una chiave `items` con un array.

## Notifiche push

`src/hooks/usePushNotifications.js` — hook per permission + FCM token:
- Chiede il permesso browser + recupera il token FCM via `getToken(messaging, { vapidKey })`
- Salva `{ token, enabled, updatedAt }` in `/users/{uid}/pushToken/data`
- `onSnapshot` mantiene lo stato sincronizzato; token invalidi vengono rimossi dalla Cloud Function

`src/firebase-messaging-sw.template.js` — SW template:
- Processato dal plugin Vite (`vite.config.js`) che sostituisce `%%VITE_*%%` con i valori da `.env`
- Output finale: `firebase-messaging-sw.js` servito alla root in dev e incluso nel dist

`functions/index.js` — Cloud Function schedulata (09:00 Europe/Rome ogni giorno):
- Scorre tutti gli utenti con `enabled: true` in `pushToken/data`
- Trova item la cui `expiresAt` ricade nel range `[domani 00:00, domani 23:59]`
- Invia notifica FCM via Admin SDK; rimuove token invalidi automaticamente

### Setup one-time richiesto
1. Firebase Console → Impostazioni progetto → Cloud Messaging → **Web Push certificates**
   → Genera coppia di chiavi → copiare "Key pair" in `.env` come `VITE_FIREBASE_VAPID_KEY`
2. Upgrade progetto Firebase a **piano Blaze** (necessario per Cloud Functions schedulati)
3. Deploy functions: `cd functions && npm install && cd .. && firebase deploy --only functions`
4. Aggiungere regola Firestore per `pushToken`:
   ```
   match /users/{userId}/pushToken/data {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```

## Branch di sviluppo

Il branch di default per fix/feature è quello indicato a inizio sessione.
Non pushare su `main` direttamente.
