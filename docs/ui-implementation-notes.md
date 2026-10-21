# Nuova UI — note di implementazione

Companion del canvas di design ("Smart Kitchen — Nuova UI") e di `docs/design-brief.md`.
Le note partono dallo stato reale del codice (`src/`, `functions/`) e dicono cosa riusare,
cosa cambiare e cosa è nuovo. Dove il design e il codice divergono è segnato **DECIDERE**.

## 1. Decisioni da prendere prima di iniziare

| # | Tema | Stato attuale | Nel design | Raccomandazione |
|---|---|---|---|---|
| 1 | Swipe su `ItemRow` | Esiste già (`ItemRow.jsx`, `SWIPE_THRESHOLD = 80`): swipe **destra = elimina**, swipe **sinistra = aperto**, azione immediata al rilascio, nessun annulla | Swipe **sinistra** rivela due pulsanti (Aperto, Elimina) + toast "Annulla" | Tenere le direzioni attuali (nessun riapprendimento), aggiungere **toast Annulla** e un reveal parziale con pulsanti per accessibilità/scopribilità. Se si adotta il mock alla lettera, le direzioni cambiano |
| 2 | Vista mese pasti | Esiste già (`MealTrackerTab.jsx`, `viewMode` `'month'`/`'week'`) | Mese e settimana ridisegnati | Solo restyling, nessuna nuova logica |
| 3 | Etichetta "Hai X su Y ingredienti" (Salvate, dettaglio) | Non esiste: `SavedRecipe` ha solo testo markdown | Mostrata come stato | Richiede di estrarre gli ingredienti (prompt AI con output strutturato, come per `responseSchema` degli import) e di confrontarli con la dispensa. **Funzione nuova, non restyling**: tenerla fuori dalla prima release |
| 4 | Navigazione | 7 voci + due sotto-tab (`App.jsx` `TABS`) | 5 destinazioni: Oggi, Dispensa, Cucina, Spesa, Tu | Adottare; vedi §4 |
| 5 | Tema | Solo `prefers-color-scheme` | Selettore Sistema/Chiaro/Scuro | Aggiungere override con `data-theme` su `<html>`; vedi §7 |
| 6 | Notifiche per-utente | Un solo token, 09:00 fisso, solo "domani" (`functions/index.js`) | Orario, giorni di preavviso, elenco dispositivi, prova | Richiede backend e regole nuove; vedi §6 |

## 2. Mappa artboard → codice

| Artboard | Componente attuale | Intervento |
|---|---|---|
| Login | `LoginScreen.jsx` | Restyling |
| Oggi (mobile/desktop) | — | **Nuovo** `TodayTab.jsx`; dati derivati da `inventory` con `expiryStatus` (`utils/date.js`) |
| Dispensa | `PantryTab.jsx`, `ItemRow.jsx` | Restyling, segmented al posto delle 3 sezioni impilate, badge stato |
| Dispensa — swipe | `ItemRow.jsx` | Toast annulla + reveal; vedi §5 |
| Dispensa — vuota | `PantryTab.jsx` | Nuovo ramo "nessun elemento" |
| Aggiungi | add-row di `PantryTab.jsx` | **Nuovo** `AddSheet.jsx` (bottom sheet su mobile, `Modal.jsx` su desktop) |
| Verifica scontrino | `BatchReview.jsx`, `ReceiptScanModal.jsx`, `VoiceBatchModal.jsx` | Restyling; logica invariata |
| Cucina — Ricette AI | `AITab.jsx` | Restyling; output in schede (vedi §5) |
| Cucina — Salvate / dettaglio | `SavedRecipesTab.jsx` | Lista a schede + nuova vista dettaglio |
| Cucina — Pasti (settimana/mese) | `MealTrackerTab.jsx`, `MealFormModal.jsx`, `MealDetailSheet.jsx` | Restyling; colori categorie da aggiornare |
| Spesa | `SavedShoppingTab.jsx`, `PantrySuggestionsModal.jsx` | Restyling; "Idee AI" diventa tab interno |
| Ricette — errore/offline | `AITab.jsx` (stato `error`) | Stati espliciti + banner offline globale |
| Tu | `SettingsTab.jsx` | Riorganizzato in lista di righe |
| Tu — Notifiche | sezione "Notifiche" di `SettingsTab.jsx` | **Nuovo** `NotificationSettings.jsx` + backend |
| Sistema | `src/index.css` | Token, vedi §3 |

## 3. Token (`src/index.css`)

Strategia a basso rischio: **prima** cambiare solo i valori delle variabili esistenti
(nessun componente da toccare, l'app si "ridipinge"), **poi** aggiungere i nuovi ruoli.

Mappatura variabili esistenti → nuovi valori:

| Variabile | Chiaro | Scuro |
|---|---|---|
| `--bg` | `#F3F5F0` | `#101A14` |
| `--surface` | `#FFFFFF` | `#18251D` |
| `--surface-hover` | `#E9EEE6` | `#1F3026` |
| `--border` | `#D5DDD1` | `#2E4236` |
| `--border-strong` | `#9AAA9F` | `#5C7466` |
| `--text` | `#17251D` | `#EAF1EA` |
| `--text-muted` | `#55655B` | `#A3B5A8` |
| `--text-hint` | `#55655B` | `#A3B5A8` |
| `--accent` | `#1E5A43` | `#5FC79A` |
| `--accent-hover` | `#17493A` | `#7FD6AC` |
| `--accent-light` | `#DDEADF` | `#214A38` |
| `--urgent` | `#A82A1C` | `#B83222` |
| `--urgent-light` | `#F9DDD8` | `#3A1A17` |
| `--urgent-text` | `#8F1F14` | `#FFB4A8` |
| `--success-light` | `#DDEADF` | `#1A3326` |
| `--success-text` | `#1E5A43` | `#8FDDB6` |

Variabili nuove da aggiungere:

```css
:root {
  --highlight: #F0B93A;          /* accento giallo: AI e "da usare presto" */
  --highlight-ink: #2A1D00;      /* testo su --highlight */
  --on-accent: #FFFFFF;          /* testo su --accent (scuro: #0B1F15) */
  --hero: #1E5A43;               /* card "Da usare presto", uguale in scuro */
  --warn-light: #FBE8B8;  --warn-text: #6B4300;   /* in scadenza  (scuro: #3B2C0B / #F5CF7A) */
  --info-light: #DCE7F3;  --info-text: #1B4A78;   /* aperto       (scuro: #172C44 / #A9CBF0) */
  --radius-sm: 12px; --radius-md: 16px; --radius-lg: 24px; --radius-pill: 999px;
  --tap: 44px;                   /* target minimo */
}
```

Note:
- `--text-hint` oggi (`#a0a09a`) non supera il contrasto 4.5:1: nel nuovo set coincide con `--text-muted`.
- Le categorie pasto (`data/mealCategories.js`) oggi sono quattro marroni vicini: nel design sono giallo, verde, blu, arancio (scuro: `#F0B93A`, `#5FC79A`, `#8FA9E8`, `#E8895A`). Il giallo (colazione) non va usato come testo.
- Cambiare `--radius-*` globalmente allarga anche gli elementi piccoli: verificare badge e input uno per uno.
- `<meta name="theme-color">` in `index.html` e `manifest.json` (`#BA7517`, `#fafaf8`) vanno portati a `#1E5A43` / `#F3F5F0`; le icone PWA sono da rivedere.

### Font
Bricolage Grotesque (titoli, 600/700) e DM Sans (testo, 400/500/700). L'app è una PWA:
caricarli da Google Fonts rompe l'aspetto offline. Preferire **self-hosting** in `public/fonts/`
(woff2, `font-display: swap`) con `@font-face` in `index.css`, e tenere lo stack di sistema come fallback.

## 4. Navigazione (`App.jsx`, `BottomNav.jsx`, `Sidebar.jsx`)

Oggi `activeTab` è una stringa con 7 valori e due "gruppi" calcolati (`inRicetteGroup`, `inSpesaGroup`).
Proposta: **5 destinazioni** di primo livello e sotto-viste locali.

```js
const TABS = [
  { id: 'oggi',     label: 'Oggi' },
  { id: 'dispensa', label: 'Dispensa' },
  { id: 'cucina',   label: 'Cucina' },   // sub: 'ricette' | 'salvate' | 'pasti'
  { id: 'spesa',    label: 'Spesa' },    // sub: 'lista' | 'idee'
  { id: 'tu',       label: 'Tu' },       // sub: 'profilo' | 'notifiche'
]
```

- Le sotto-viste vivono come stato locale del contenitore (`CucinaTab`, `SpesaTab`) con un `Segmented` condiviso; niente router, come oggi.
- `AITab` (Ricette e Spesa) resta invariato come logica; i due `useAI` in `App.jsx` restano.
- Le schermate di dettaglio (ricetta, notifiche) sono stato del contenitore (`detail: null | { type, id }`), con tasto indietro; sulla PWA gestire anche il back del dispositivo con `history.pushState`/`popstate` per non uscire dall'app.
- `BottomNav`: altezza da `56px` a `84px` (incl. safe area), pill di stato attivo, etichette 12px. Va **nascosta** nelle viste di dettaglio.
- `Sidebar` (≥1024px): stesse 5 voci + CTA "Aggiungi prodotti" in fondo. L'header con tab scorrevoli su tablet può sparire se la sidebar viene mostrata già dai 768px (oggi compare solo da 1024px): da valutare.
- Il FAB "+" compare in Oggi e Dispensa e apre `AddSheet`.

## 5. Schermate: dettagli

**Oggi.** Card "Da usare presto": prodotti con `expiryStatus` `expired`/`soon` o `urgent`, max 3, ordinati come in `PantrySuggestionsModal.jsx` (`statusRank`) — riusare quella funzione estraendola in `utils/`. Il CTA riusa `ricette.fetchRicette` ma deve passare gli item in scadenza come priorità: oggi il prompt di `useAI.js` già privilegia gli `[APERTO]`; estenderlo a "scaduti/in scadenza". "Di stagione" da `data/seasonal.js`. "Stasera" da `useMealTracker`.

**Dispensa.** Le tre sezioni diventano un segmented (stato locale). Badge: `Scaduta`/`Scade oggi`/`Domani`/data/`Aperto` da `formatExpiry` + `expiryStatus`; sempre testo oltre al colore. Ordinamento per urgenza dentro la sezione. Stato vuoto per sezione.

**Swipe.** Vedi decisione 1. Implementazione: oggi usa `ref` e manipola `style` direttamente (`onTouchMove`); per il reveal parziale basta fermare il card a `-144px` se il rilascio è tra 40 e 80px e mostrare i due pulsanti reali (accessibili da tastiera: i bottoni devono esistere nel DOM anche senza swipe, visibili al focus o in un menu "⋯"). Il toast Annulla richiede di tenere l'ultimo item rimosso in stato e re-inserirlo con `addItem` mantenendo `id` e `added`; timeout 5s. Su desktop niente swipe: azioni nel menu della riga.

**Aggiungi.** `AddSheet` unifica add-row, voce e scontrino. Il bottone voce/scontrino resta disabilitato senza `gemini-api-key`: nello sheet mostrare il motivo con link a Tu → Chiave API.

**Ricette AI.** `AITab` oggi renderizza markdown minimale (`##` → `<h3>`, `**`, `-`). Il design usa schede: spezzare l'output con `parseRecipes` (già in `App.jsx`) e renderizzare una card per ricetta, con la card in streaming evidenziata. I chip degli ingredienti in scadenza richiedono dati strutturati (vedi decisione 3); in prima release si possono omettere.

**Salvate e dettaglio.** `SavedRecipe.content` è markdown: il dettaglio può renderizzare le sezioni `## Ingredienti` / `## Procedimento` se il prompt le produce in modo coerente; altrimenti mostrare il testo come in `AITab`. Gli stati ingrediente (in dispensa / scade / manca) e "Aggiungi mancanti alla spesa" dipendono dalla decisione 3.

**Pasti.** Solo restyling di `MealTrackerTab`; il FAB attuale si sposta in "Aggiungi la cena" per slot vuoto. Aggiornare i colori delle categorie (§3).

**Spesa.** La card "stanno finendo" è `PantrySuggestionsModal` portata in linea (stessa logica di candidati). "Sposta in dispensa" = `handleMoveToPantry` esistente.

**Stati d'errore e offline.** Nuovo hook `useOnline` (`navigator.onLine` + eventi `online`/`offline`), banner globale sotto l'header/safe area. L'errore AI distingue "manca la chiave" (leggere `localStorage['gemini-api-key']`) da errore di rete/API.

## 6. Profilo e notifiche

### Front-end
`SettingsTab.jsx` → `ProfileTab.jsx` (righe) + `NotificationSettings.jsx`. Il toggle `role="switch"` e `usePushNotifications` esistono già e vanno riusati. Da correggere: `disable()` oggi **sovrascrive il token con `''`**, perdendolo; dovrebbe scrivere solo `enabled: false`.

### Dati (nuovi)
```
/users/{uid}/notificationPrefs/data
  { enabled: bool, hour: 0-23, minute: 0|15|30|45, tz: 'Europe/Rome',
    daysBefore: [0, 1],        // 0 = oggi, 1 = domani, ...
    updatedAt: number }

/users/{uid}/pushTokens/{deviceId}      // sostituisce pushToken/data (un doc per dispositivo)
  { token, label, platform, status: 'active'|'stale', lastOkAt, staleSince, updatedAt }
```
`deviceId` generato e salvato in `localStorage`. Migrazione: al primo accesso, se esiste `pushToken/data`, copiarlo in `pushTokens/{deviceId}`.

**Regole Firestore** (da applicare a mano in console, come da CLAUDE.md):
```
match /users/{userId}/notificationPrefs/data {
  allow read, write: if request.auth != null && request.auth.uid == userId
    && request.resource.data.hour is int && request.resource.data.daysBefore is list;
}
match /users/{userId}/pushTokens/{deviceId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```
Il campo `status`/`staleSince` dovrebbe essere scritto solo dalla Function (Admin SDK bypassa le regole); lato client restringere la scrittura a `token`, `label`, `platform`, `updatedAt`.

### Cloud Function (`functions/index.js`)
- Schedule da `0 9 * * *` a **ogni 15 minuti** (`*/15 * * * *`).
- A ogni tick: `collectionGroup('notificationPrefs')` con `enabled == true`; per ciascuno calcolare l'ora locale con `tz` e inviare solo se coincide con `hour:minute` (arrotondato al quarto d'ora). Evitare di scorrere tutti gli utenti come ora (`listDocuments`).
- Finestre: per ogni `d` in `daysBefore`, intervallo `[00:00, 23:59]` del giorno locale `oggi + d`. Il codice attuale usa l'ora del server, non quella dell'utente.
- Testo: raggruppare per giorno ("Oggi: Latte intero · Domani: Zucchine, +2"); max 3 nomi per riga.
- Invio a tutti i token `active`; su `registration-token-not-registered` marcare `status: 'stale'`, `staleSince` (non cancellare, serve alla UI). Cancellare solo dopo 30 giorni.
- Nuova callable `sendTestNotification` (`onCall`, richiede `auth`): invia ai token dell'utente e restituisce l'esito **per dispositivo**. Alimenta "Invia notifica di prova" e "Verificato ora".

### Limiti da conoscere
- "Riattiva" funziona solo **sul dispositivo corrente**: un browser non può rigenerare il token di un altro dispositivo. Per l'iPad la UI deve dire "Apri l'app su quel dispositivo e tocca Riattiva", non mostrare un pulsante che non può funzionare da qui.
- Il campo "Non raggiungibile da 12 giorni" deriva da `staleSince`.
- Piano **Blaze** già richiesto; più invocazioni schedulate (96/giorno) restano nel free tier, ma va ricontrollato.
- iOS: le push web funzionano solo con la PWA installata (iOS 16.4+).

## 7. Tema scuro

Oggi `@media (prefers-color-scheme: dark)` ridefinisce le variabili. Per il selettore manuale:

```css
:root { /* chiaro */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* scuro */ } }
:root[data-theme="dark"] { /* scuro (stessi valori) */ }
```
Salvare la scelta in `localStorage['theme']` (`system|light|dark`), applicarla all'avvio in `main.jsx` prima del render per evitare il flash, e aggiornare `<meta name="theme-color">` di conseguenza. Per evitare di duplicare il blocco scuro, definirlo una volta con un selettore combinato.

Differenze da ricordare (i colori non si invertono meccanicamente):
- Pulsante primario: sfondo `--accent` chiaro (`#5FC79A`) con testo **scuro** (`--on-accent`).
- Gli stati usano fondi scuri e testo chiaro, non l'inverso.
- Le card "hero" restano verdi scure in entrambi i temi.
- Toast: in chiaro è scuro, in scuro è chiaro.

## 8. Ordine di migrazione consigliato

Ogni passo è una PR indipendente, l'app resta funzionante.

1. **Token e font** (`index.css`, `index.html`, `manifest.json`): ridipinge tutto senza toccare i componenti.
2. **Navigazione a 5** (`App.jsx`, `BottomNav`, `Sidebar`, contenitori Cucina/Spesa/Tu con `Segmented`).
3. **Dispensa**: badge, segmented, stato vuoto, toast annulla swipe.
4. **AddSheet** + restyling di voce/scontrino/`BatchReview`.
5. **Oggi** (`TodayTab`) con estrazione di `statusRank`/helpers in `utils/`.
6. **Cucina**: schede ricetta, Salvate, dettaglio (senza "Hai X su Y"), Pasti.
7. **Spesa**.
8. **Tema manuale** (`data-theme`, selettore in Tu).
9. **Stati offline/errore** (`useOnline`, banner).
10. **Notifiche** in tre PR: front-end con dati nuovi → regole + migrazione token → Function + callable di prova. Questo è il passo con rischio operativo: richiede deploy delle functions e regole manuali.
11. Funzione opzionale "Hai X su Y" (decisione 3).

Aggiornare `CLAUDE.md` ad ogni passo che cambia struttura (nuovi componenti, nuovi path Firestore, nuove regole).

## 9. Accessibilità: cosa non perdere

- Target ≥ 44px; icone-pulsante con `aria-label`; interruttori con `role="switch"` + `aria-checked`.
- Stato sempre in testo oltre che in colore; in scuro verificare i badge (fondo scuro + testo chiaro).
- Segmented e chip toggle: `aria-pressed`; gruppo con `role="group"` e etichetta.
- Swipe: sempre una via alternativa non gestuale (menu riga / pulsanti).
- Streaming AI: contenitore con `aria-live="polite"` e `aria-busy` durante la generazione; non spostare il layout sotto.
- `prefers-reduced-motion`: disattivare molla e transizioni dello swipe e del cursore.
- Safe area: `env(safe-area-inset-*)` su header, bottom nav, sheet e barre azioni fisse.
- Input ≥ 16px su mobile (già presente in `index.css`) per evitare lo zoom iOS.

## 10. Fuori scope di questo design

Login con altri provider, condivisione dispensa tra utenti, ricerca testuale avanzata, tabella nutrizionale,
lista spesa condivisa. Se servono, partono da qui come nuovi brief.
