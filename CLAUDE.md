# smart-kitchen — CLAUDE.md

Reference rapido per sessioni future. Aggiorna quando cambia l'architettura.

## Progetto

App React single-page per gestione dispensa con suggerimenti AI stagionali.
Stack: React 18 + Vite 5 + CSS Modules + Firebase (Auth + Firestore) + Motion (`motion/react`, solo per la Dispensa desktop).
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
  mock/                     # modalità demo: mode.js (flag di build), data.js (utente finto, dati di esempio, seed/reset)
  firebase.js               # app, auth, db, messagingPromise, callFunction (import dinamico di firebase/functions)
  App.jsx                   # auth guard + orchestrazione stato + 5 destinazioni + AddFlow
  nav/tabs.js               # TABS (oggi, dispensa, cucina, spesa, tu) e sotto-sezioni
  nav/shortcuts.js          # SHORTCUT_GROUPS: elenco mostrato in ShortcutsHelp (i binding veri stanno in App.jsx)
  ai/
    model.js                # MODEL_NAME (Lite) + MODEL_PRO e PRO_CONFIG (unico punto dove cambiare modelli)
    prompts.js              # prompt ricette/spesa/stagione, PROMPT_VERSION (entra nell'hash della cache)
    errors.js               # classifyError → no-key | quota | billing | invalid-key | offline | unknown
    validateKey.js          # validateApiKey: verifica la chiave Gemini (models.list, gratuito) prima di salvarla
    extractIngredients.js   # estrazione batch degli ingredienti delle ricette (generateContent + responseSchema)
    analyzePantry.js        # metadata nascosti dei prodotti (categoria, durate), ANALYSIS_VERSION, analysisKey
  hooks/
    useAuth.js              # Firebase Auth (Google), onAuthStateChanged
    useNavigation.js        # {tab, sub, detail} + history.pushState/popstate (nessun router)
    useInventory.js         # CRUD dispensa + CSV + Firestore sync (fallback localStorage), restoreItem, applyAnalysis, setCategory
    usePantryAnalysis.js    # analisi AI in background dei prodotti senza item.ai valido
    useMealTracker.js       # pasti + sync
    useSavedRecipes.js      # ricette salvate + sync + estrazione ingredienti in background
    useSavedShopping.js     # lista spesa + sync
    useApiKeySync.js        # chiave Gemini: localStorage ↔ users/{uid}/settings/gemini
    useAI.js                # Gemini: ricette/spesa/follow-up, streaming, cache
    useVoiceBatch.js        # voce → item dispensa
    useReceiptScan.js       # scontrino → item dispensa
    useBatchCandidates.js   # lista candidati editabile condivisa dai due import
    useNotifications.js     # preferenze + dispositivi push, enable/disable, notifica di prova; useForegroundPush
    useKeyboardShortcuts.js # scorciatoie a tasto singolo (document keydown), vedi "Scorciatoie da tastiera"
    usePantryDrag.js        # Dispensa desktop: drag di una riga su un'altra card (copia in portal, hit-test su [data-section])
    useOnline.js            # navigator.onLine + eventi
    useCollapsedGroups.js   # gruppi ripiegati di "Per categoria", ricordati in localStorage
    useMediaQuery.js
  components/
    ui/                     # Icon, GroupHeader, Segmented, StatusBadge, Chip, EmptyState, Toast(+useToast), PageHeader, OfflineBanner, RecipeCard
    TodayTab, ExpiringList, SeasonalRecipesModal, PantryTab, PantryColumns, PantryComposer, ItemRow, CucinaTab, AITab, SavedRecipesTab, RecipeDetail, MealTrackerTab,
    SpesaTab, SavedShoppingTab, PantrySuggestionsModal, TuTab, ProfileTab, NotificationSettings,
    AddFlow, AddSheet, VoiceBatchModal, ReceiptScanModal, BatchReview, ShortcutsHelp,
    MealFormModal, MealDetailSheet, Modal, BottomNav, Sidebar, LoginScreen
  data/
    initialInventory.js     # SECTIONS, SECTION_LABELS
    seasonal.js             # produce stagionale per mese (Lombardia)
    mealCategories.js       # categorie pasti {id, label, icon}; i colori sono token --cat-*
    foodCategories.js       # categorie alimentari dell'analisi AI, FOOD_GROUPS (i gruppi di "Per categoria") e ordine per sezione, FALLBACK_OPEN_DAYS
  utils/
    date.js                 # SOON_DAYS, daysUntil (giorni di calendario), toDateStr, formatExpiry, expiryStatus
    pantry.js               # estimateRemaining, priorityInfo/comparePriority, itemBadge, getUseSoonItems, getPantryCandidates
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

## Modalità demo (deploy non di produzione)

Per testare le feature sulle preview di Vercel senza login Google e senza autorizzare ogni dominio in Firebase:
`vite.config.js` (`resolveMockMode`) imposta la costante di build `import.meta.env.VITE_MOCK_MODE` (letta da `src/mock/mode.js`).
- **Attiva** se `VERCEL_GIT_COMMIT_REF` è un branch diverso da `master` (costante `PRODUCTION_BRANCH`), oppure con `VITE_MOCK_MODE=true` nel `.env` locale.
- **Mai attiva** se `VERCEL_ENV === 'production'`, anche se `VITE_MOCK_MODE=true` fosse impostata su Vercel. `VITE_MOCK_MODE=false` la disattiva su un branch non-master.
- Nel bundle di produzione il codice mock è eliminato (costante `false`): verificabile con `grep "Utente demo" dist/assets/*.js`.
- `useAuth` restituisce un utente finto **senza `uid`**: tutti gli hook dati (`useInventory`, `useMealTracker`, `useSavedRecipes`,
  `useSavedShopping`) restano sul ramo localStorage e Firestore non viene mai toccato. `firebase.js` non inizializza Firebase
  (`auth`/`db` sono `null`, `messagingPromise` è `null`), quindi le preview non richiedono variabili `VITE_FIREBASE_*`.
- `main.jsx` chiama `seedMockData()`: scrive i dati di esempio (scadenze relative a oggi) nelle chiavi localStorage di fallback,
  una volta per scheda (un ricarico mantiene le modifiche, una scheda nuova riparte da zero). Banner "Modalità demo" con "Ripristina dati"
  (stessa azione del pulsante "Esci" in Tu). Per cambiare i dati di esempio si modifica solo `src/mock/data.js`.
- Limiti: niente notifiche push né sync tra dispositivi; la chiave Gemini va inserita in Tu (resta in localStorage di quel dominio).

## Navigazione

Cinque destinazioni: Oggi, Dispensa, Cucina (Ricette AI / Salvate / Pasti), Spesa (Lista / Idee AI), Tu.
`useNavigation` tiene `{tab, sub, detail}`; le viste di dettaglio (ricetta, notifiche, "In scadenza" su Oggi) aggiungono una voce
alla history, quindi il tasto indietro del telefono le chiude. A ≥1024px Cucina e Spesa mostrano lo split a
due colonne. `BottomNav` e il FAB si nascondono quando `nav.detail` è attivo (`data-detail`).

Transizioni (solo CSS, nessuna libreria): `useNavigation` espone `motion` (`tab` cambiando destinazione, `detail` aprendo/chiudendo un dettaglio,
poi `none` dopo 600 ms) e `App` lo mette in `data-motion` su `.page` (`display: contents`). In `App.module.css`, ciò che monta o si de-nasconde in quella finestra
entra con dissolvenza + leggero zoom: sono i **figli della radice di ogni pagina**, non la radice, perché un antenato con `transform` farebbe scorrere con la pagina gli
elementi `position: fixed`; quelli (FAB, barra di `RecipeDetail`) hanno `data-fixed` e fanno solo fade. Il cambio tab è in `startTransition` e BottomNav/Sidebar usano
`useOptimisticValue`: l'evidenziatore parte subito al tocco e la pagina cambia 120 ms dopo (`PAGE_DELAY_MS`), così il render pesante non cade a metà dello scorrimento (su iPhone lo rendeva scattoso). Le sotto-sezioni di Cucina/Spesa restano montate con `hidden`
e usano `.view` (`Containers.module.css`): `display: none → block` rilancia l'animazione. Token in `index.css`: `--ease-ios` e `--dur-slide` (0,3 s), usati dagli indicatori che scorrono (BottomNav, Sidebar, Segmented);
una molla con coda lunga (0,6 s) sembrava lenta e scattosa, non reintrodurla. `Modal` resta montato 240 ms dopo la chiusura per l'animazione
di uscita (`data-closing`) e su iOS segue `visualViewport` (`data-keyboard`, `--vv-top`/`--vv-h`) così con la tastiera aperta il foglio si ridimensiona sopra di essa.
`AddSheet` non mette il focus sul campo sui dispositivi touch (`pointer: coarse`): altrimenti la tastiera sale da sola all'apertura.

Dispensa su mobile/tablet: segmented senza conteggi, righe `ItemRow` (variante `card`, con swipe) dentro **un solo contenitore** arrotondato con filetti
(`.list` in `PantryTab.module.css`), stato vuoto illustrato (`EmptyState art="shapes"`); la schermata di verifica degli import (`BatchReview`) è una card per
prodotto con riga originale/checkbox, nome + quantità e segmented con i nomi delle sezioni. Ogni riga (`ItemRow` variante `card`) è **un solo bersaglio** (≥64px) che apre `ItemEditSheet` (nome, quantità, scadenza con scorciatoie
Nessuna/Domani/+3 giorni/+1 sett., interruttore «Aperto», «Sposta in», Elimina/Salva; stato `editing` in `PantryTab`); i chip «+ quantità» / «+ scadenza» sono solo indicazioni.
Lo swipe (Aperto/Elimina) resta; il menu «⋯» non c'è più su mobile. `Modal` accetta `autoFocus={false}` (la scheda non apre la tastiera da sola).

Dispensa su desktop (≥1024px, `PantryColumns`): tre colonne (Credenza / Frigo / Freezer) oppure una sezione **espansa**
(pulsante "Espandi" nell'intestazione, "Riduci" per tornare) con le altre due ripiegate in schede-anteprima a destra (clic = espandi quella).
La sezione espansa ospita `PantryComposer`: l'aggiunta di un prodotto è contestuale (niente selettore sezione), Invio aggiunge e
tiene il cursore sul nome; "Scontrino"/"Voce" aprono i flussi di import già indirizzati a quella sezione. Nelle tre colonne non c'è
aggiunta rapida (resta il pulsante in sidebar). Lo stato `expanded` vive in `PantryTab`.
Ogni sezione è una card (icona in tondo, titolo, "N prodotti"); le righe sono `ItemRow` con `variant`: `card` (default, mobile/tablet/ricerca, con swipe),
`flat` (dentro la card delle tre colonne: righe piatte separate da filetti) e `table` (sezione espansa: colonne Prodotto / Quantità / Scadenza da `--table-cols`).
In tutte le varianti la riga è **un solo pulsante** che apre `ItemEditSheet` (come su mobile): niente modifica in riga, niente menu "⋯" né icone
di azione; Aperto, Sposta ed Elimina stanno nella scheda (percorso da tastiera: Invio sulla riga → scheda → «Sposta in»).
Quantità e scadenza sono facoltative: se mancano la riga mostra i chip tratteggiati "+ quantità" / "+ scadenza", solo indicazioni.
**Drag fra le card** (`hooks/usePantryDrag.js`, solo mouse: `(hover: hover) and (pointer: fine)`, quindi niente drag su iPad): oltre 5px di movimento
la pressione diventa un drag; la riga resta nella lista attenuata e una copia segue il puntatore in un portal a posizione fissa (le card con `layout`
e i gruppi richiudibili di «Per categoria» hanno transform/`overflow: hidden` che taglierebbero la riga). La copia trema (`@keyframes wobble`
sul figlio interno, mai sull'elemento posizionato; ferma con `prefers-reduced-motion`). Il bersaglio è la card `[data-section]` sotto il puntatore
(una card senza altre sotto arriva fino al fondo della finestra; con la sezione espansa valgono le anteprime): si evidenzia con «Rilascia per spostare
in …». Il rilascio chiama `onDropMove` → `PantryTab.handleDropMove` (`moveItem` + toast «… spostato in … · Annulla»); stessa card o Esc = nessuno
spostamento; il click che segue il rilascio viene ignorato.
Sopra il titolo, su desktop, `PageHeader` mostra il riepilogo ("16 prodotti · 6 da usare presto").
Le card sono gli stessi elementi in tutti i layout e Motion (`layout`, FLIP a molla) le anima tra griglia ed espansione; il contenuto del corpo
cambia con un crossfade (`AnimatePresence mode="popLayout"`, chiave = modalità), le righe entrano/escono con `layout="position"`. I figli di una card
con `layout` devono avere a loro volta `layout="position"`, altrimenti il testo si deforma durante la transizione. `LazyMotion` carica `domMax` (serve per i layout animation) da `src/motionFeatures.js`, un chunk a parte: se non si carica (offline) le card
si vedono senza animazione. `MotionConfig reducedMotion="user"` sta dentro `PantryColumns`; mobile e tablet non usano Motion.

## Scorciatoie da tastiera

Solo tasti singoli, senza Ctrl/⌘/Alt: sono identici su Windows e Mac e non collidono con il browser.
`useKeyboardShortcuts(bindings, enabled)` ascolta `keydown` su `document` e ignora l'evento se si sta
scrivendo in un campo, se c'è un `[role="dialog"][aria-modal]` aperto o se c'è un modificatore.
I binding sono in `App.jsx`: `1`–`5` destinazioni (ordine di `TABS`), `N` aggiungi, `S` scontrino, `V` voce
(entrambi richiedono la chiave Gemini, altrimenti toast), `C` "Cosa cucino", `P` aggiungi un pasto (apre Cucina › Pasti e il form sul giorno selezionato, via `mealRequested` → `MealTrackerTab`), `\` cerca in Dispensa
(`searchRequested` → `PantryTab`), `?` aiuto, `Esc` chiude il dettaglio. `N`, `S`, `V` e il pulsante «Aggiungi prodotti» della sidebar aggiungono nella sezione che si sta guardando in Dispensa
(sezione espansa su desktop, segmented su tablet; `PantryTab` la comunica con `onViewChange` → `pantryView` in `App`); altrove, in
ricerca o con le tre colonne, il default è Frigo. **Se aggiungi o cambi un binding,
aggiorna anche `nav/shortcuts.js`** (è la lista dell'aiuto). La sidebar ha il link «Scorciatoie da tastiera» (con badge `?`, piccolo) sopra «Aggiungi prodotti»; nessun altro badge.

Layout mobile (≤600px): `.app` è una colonna flex con la bottom nav **in flusso** (non fixed), quindi l'area
scrollabile `.main` finisce già sopra la nav. Conseguenze: le barre `position: sticky` dentro `.main` usano
`bottom: 0` (il padding di `.main` dà il margine), mentre solo gli elementi `position: fixed` (FAB) usano
`--float-bottom`. L'header è ridotto a una striscia alta quanto `env(safe-area-inset-top)` (su iOS standalone la
pagina è disegnata sotto la status bar, `black-translucent`): il logo compare solo da tablet in su. Da iOS 26 il sistema sfoca ~40pt sotto il bordo alto delle web app installate (non
disattivabile): solo con `display-mode: standalone` `.main` ha 16px di padding in più in alto per stare fuori
dalla fascia (in una scheda del browser non serve). I toast
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
/users/{uid}/settings/gemini          →  { apiKey, updatedAt }   (apiKey '' = rimossa)
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
| `gemini-api-key` | API key Gemini: cache locale letta dagli hook AI, sincronizzata con `settings/gemini` |
| `theme` | preferenza tema: `system` \| `light` \| `dark` |
| `sk-device-id` | id di questo dispositivo per `pushTokens/{deviceId}` |
| `sk-notif-off-here` | `'1'` se l'utente ha rimosso questo dispositivo: l'auto-riparazione non lo ri-registra |
| `sk-pantry-sort` | ordinamento scelto in Dispensa (assente = «Da usare prima», il default) |
| `sk-pantry-collapsed` | chiavi (`<sezione>:<gruppo>`) dei gruppi ripiegati in Dispensa › Per categoria |
| `sk-expiring-banner-dismissed` | data (`YYYY-MM-DD`) in cui è stato chiuso il banner «stanno per scadere» di Spesa; riappare il giorno dopo |
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
  expiresAt: number | null,
  openedAt?: number | null,  // impostato da toggleUrgent; gli aperti senza openedAt contano da `added`
  ai?: {             // metadata nascosti dell'analisi AI (vedi "Priorità della dispensa")
    key: string,     // analysisKey(item, section): versione|nome|sezione; se non coincide si rianalizza
    name: string,    // nome generico ("fagioli" per "Fagioli alla Bud Spencer"), usato dal match ingredienti
    category: string,// id di data/foodCategories.js
    food: boolean,   // false = non alimentare: escluso da Oggi, "In scadenza", prompt e match
    openDays: number | null,  // giorni di conservazione dopo l'apertura, nella sezione in cui sta
    freshDays: number | null, // giorni dall'acquisto per i freschi senza data stampata
    manual?: true,   // categoria scelta a mano dalla scheda di modifica (ItemEditSheet): la rianalisi la mantiene
  }
}
```

## Priorità della dispensa

Ogni prodotto ha una **stima dei giorni rimasti** (`estimateRemaining` in `utils/pantry.js`): il minimo tra
scadenza stampata, `openDays − giorni da openedAt` (se aperto) e `freshDays − giorni da added` (fresco senza
data). Senza analisi gli aperti usano `FALLBACK_OPEN_DAYS` per sezione. `comparePriority` ordina: scaduti
stampati, poi meno giorni rimasti, a parità date stampate e prodotti più deperibili, poi nome. La usano
"Da usare prima" e "Per categoria" in Dispensa, `getPantryCandidates` (Oggi, "In scadenza", suggerimenti spesa).
- Candidati: scaduti/in scadenza stampati, tutti gli aperti, freschi con stima ≤ `SOON_DAYS`; mai i non alimentari.
  `relevant` = stampati o stima ≤ `USE_SOON_DAYS` (7): solo questi vanno su Oggi e nel conteggio "da usare presto".
  "In scadenza" mette gli altri aperti (le salse) in fondo, in "Aperti, nessuna fretta".
- `itemBadge(item, { age: true, section })` mostra l'età reale ("Aperto da 9 gg", "Preso 6 gg fa"); la stima
  sceglie solo il tono (`soon` se ≤ `SOON_DAYS`), mai `expired`. Senza `age` (righe Dispensa) resta "Aperto".
- Analisi: `usePantryAnalysis` (in `App`) dopo 1,5 s di quiete manda in una chiamata (blocchi da 50, `MODEL_NAME`)
  i prodotti con `ai?.key !== analysisKey(item, section)`: nuovi, rinominati o spostati. Mai bloccante: senza
  chiave, offline o tab nascosta non fa nulla; un errore si riprova solo al ricaricamento. `applyAnalysis` scarta i
  risultati di prodotti cambiati nel frattempo. Per rianalizzare tutto si alza `ANALYSIS_VERSION`.
- La stessa regola, solo per prodotti analizzati senza data stampata, è duplicata in `functions/lib/notify.js`
  (`estimatedOffset`, CommonJS): cambiare entrambe.

### Dispensa › Per categoria

`groupByCategory(pairs, section)` in `utils/pantry.js` raggruppa i prodotti di **una sezione** (già in ordine di priorità): prima
«Da usare presto» (gli stessi prodotti di Oggi e del conteggio «da usare presto», ognuno compare una sola volta), poi i gruppi
`FOOD_GROUPS` di `data/foodCategories.js` nell'ordine di `SECTION_GROUP_ORDER` per quella sezione (i non elencati seguono, «Altro» è
sempre ultimo), infine «Da analizzare». I gruppi derivano da `item.ai.category`: cambiarli non richiede di rianalizzare (la scheda di
modifica continua a offrire le 17 categorie). Le intestazioni (`ui/GroupHeader`) si ripiegano; lo stato per `<sezione>:<gruppo>` sta in
`useCollapsedGroups` (`sk-pantry-collapsed`) ed è condiviso da mobile e desktop.

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
| Input | `MediaRecorder`, max 60s | `<input type="file" capture="environment">` (foto) o file scelto (immagine o PDF) |
| Stati | `idle → recording → processing → ready \| error` | `idle → processing → ready \| error` |

- Entrambi chiamano `generateContent` (non streaming) con `responseMimeType: 'application/json'`
  e un `responseSchema` che vincola `{ name, qty, section }`; lo scontrino aggiunge `raw`
  (riga originale) mostrato come hint sopra al nome nella verifica.
- La foto viene ridimensionata a 1600px lato lungo e ricodificata in JPEG su canvas prima
  dell'invio; l'immagine processata resta come anteprima nella modale.
  I **PDF** (anche multipagina, max 14 MB) vanno al modello così come sono (`inlineData` `application/pdf`), senza canvas né
  anteprima: la modale mostra una tessera con il nome del file (`source` di `useReceiptScan`).
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
  pagano come output) dove la qualità si vede: ricette e relativi follow-up e ricette di stagione (`useAI` con `name` `ricette` o `stagione`) e
  scontrino (`useReceiptScan`). `MODEL_NAME` (`gemini-3.5-flash-lite`) per spesa, voce ed `extractIngredients`.
  Il nome del modello entra nell'hash della cache di `useAI`: cambiando modello le risposte vengono rigenerate.
- Prompt in `src/ai/prompts.js`. **Formato ricetta**: `## Titolo`, una riga meta (tempo/porzioni), poi
  `### Ingredienti` e `### Procedimento`. Le sezioni interne usano `###` perché `parseRecipes` spezza le
  ricette su `## `; il testo prima del primo `##` viene scartato. Se cambi il formato, alza `PROMPT_VERSION`.
- Marcatori nell'inventario inviato: `[scad]`/`[oggi]`/`[Ngg]` (scade presto), `[APERTO]` (solo aperti con stima
  ≤ 7 gg: un ketchup aperto non lo riceve) e `[presto]` (freschi senza data con stima ≤ 3 gg); priorità: scade
  presto > aperto/presto; i già scaduti vanno controllati prima di usarli. I non alimentari non vengono inviati.
- Streaming: `generateContentStream`, `chunk.text` (stringa). Multi-turn con `apiHistoryRef`.
- "Di stagione" su Oggi: i chip sono bottoni (il "+N" mostra tutti gli ingredienti del mese). Il tocco apre
  `SeasonalRecipesModal`, che con `useAI(…, 'stagione', { session: false })` genera 3 ricette con quell'ingrediente
  e la dispensa (`stagionePrompts`, modello forte). Cache per ingrediente (`stagione:<nome>`, riaprire è gratis); "Altre idee"
  passa i titoli già visti in `exclude` (entra nell'hash) e usa lo slot `stagione:<nome>:altre`. Le ricette si salvano con `savedRecipes.addRecipes`.
- Ogni richiesta di `useAI` ha un numero (`runRef`): uno stream superato (nuova richiesta o `clearOutput`) non
  aggiorna più lo stato, ma il risultato finisce comunque in cache.
- Funzioni esposte da `useAI`: `fetchRicette()`, `fetchSpesa()`, `fetchStagione(ingrediente, exclude)`,
  `sendFollowUp(text)`, `clearOutput()`; stato `{ loading, messages,
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

## Chiave API (Tu)

`ProfileTab` valida la chiave con `ai/validateKey.js` prima di salvarla: se è valida la salva (localStorage + account, via
`useApiKeySync`), chiude la modale e mostra un toast ("solo su questo dispositivo" se la scrittura su Firestore fallisce,
ad es. regole non ancora pubblicate); se fallisce la modale resta aperta con il messaggio sotto il campo (`role="alert"`). Campo vuoto = rimuove la chiave.
La rimozione scrive `apiKey: ''` e non cancella il doc: doc assente = primo accesso, la chiave locale viene caricata.

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
  (giorni di calendario locali, DST-safe), compresi quelli analizzati senza data stampata la cui scadenza
  stimata cade quel giorno (`estimatedOffset`), invia **un solo** messaggio di riepilogo ("3 prodotti scadono
  domani", oppure "da usare" se il gruppo contiene stime, + nomi) a tutti i token attivi (deduplicati per valore) con `sendEach`. Il messaggio ha
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
