# Brief per Claude Design — Nuova UI di "smart kitchen"

## 1. Cosa chiediamo

Proporre una **nuova interfaccia** per smart kitchen: direzione visiva, sistema di design
(colori, tipografia, spaziature, componenti) e mockup delle schermate principali, **mobile-first**
con adattamento tablet/desktop. Non serve rispettare la UI attuale: serve rispettare le
**funzioni** e il **modello dati** descritti sotto. Gradite 2–3 direzioni alternative a bassa
fedeltà prima di approfondirne una.

## 2. Il prodotto in breve

PWA React per gestire la dispensa di casa e decidere cosa cucinare, con suggerimenti AI
stagionali (Lombardia, in italiano). Login obbligatorio con Google; i dati si sincronizzano
in tempo reale tra dispositivi.

**Utente tipo**: persona o famiglia che cucina a casa, usa soprattutto lo **smartphone in cucina
o al supermercato**, spesso con le mani occupate o sporche. Vuole sapere "cosa sta per scadere?",
"cosa cucino stasera?", "cosa compro?" con il minor numero di tocchi possibile.

**Tono**: caldo, domestico, pratico. Non un'app da "dashboard finanziaria" né un ricettario
patinato. Testi UI in **italiano**, tono informale ma chiaro.

## 3. Stato attuale (da superare)

- Palette "warm brown": accento `#BA7517`, sfondo `#fafaf8`, rosso urgenza `#E24B4A`,
  verde successo `#1D9E75`; dark mode automatica (`prefers-color-scheme`).
- Font di sistema, icone SVG a tratto sottile, emoji per le categorie pasto.
- Contenuto centrato, max-width 720px.
- Navigazione: **bottom nav** su mobile (≤600px), **top header con tab scorrevoli** su tablet,
  **sidebar fissa** su desktop (≥1024px).
- Problemi noti: 7 voci di primo livello (Dispensa, Ricette AI, Ricette Salvate, Lista Spesa,
  Spesa Smart, Tracker Pasti, Impostazioni) con due coppie di "sotto-tab" poco chiare
  (*Genera AI / Salvate*, *Lista / Genera AI*); gerarchia visiva piatta; il valore "cosa sta per
  scadere" non è in evidenza; l'AI sembra una funzione nascosta invece del cuore del prodotto;
  aspetto generico, nessuna identità visiva.

## 4. Schermate e funzioni da progettare

### 4.1 Login
Logo/wordmark "smart kitchen", pulsante Google, breve claim. Primo impatto del brand.

### 4.2 Dispensa (schermata principale)
- Tre sezioni: **Credenza**, **Frigo**, **Freezer**.
- Ogni prodotto: nome, quantità (testo libero, es. "500g"), flag **"aperto"** (da consumare
  presto), **data di scadenza** opzionale → badge di stato: *scaduto*, *in scadenza*, *ok*, nessuna data.
- Azioni per riga: modifica inline, sposta tra sezioni, segna/rimuovi "aperto", elimina.
- Aggiunta rapida (nome + quantità), ricerca "Cerca prodotti…".
- **Import massivo** con due ingressi: **voce** (registra fino a 60s) e **foto scontrino**;
  entrambi finiscono nella stessa schermata di verifica (checkbox, nome, quantità,
  selettore credenza/frigo/freezer; per lo scontrino anche la riga originale come hint).
  Disabilitati se manca la API key Gemini → serve uno stato "da configurare" chiaro.
- Suggerimento "aggiungi alla spesa" per prodotti scaduti / in scadenza / aperti.
- Stati da disegnare: vuota, pochi elementi, centinaia di elementi, tutto in scadenza.

### 4.3 Ricette AI e Ricette salvate
- Un'azione primaria ("Cosa cucino stasera?") genera ricette in **streaming** (testo che compare
  progressivamente) usando la dispensa, con priorità agli item "aperti".
- Output markdown minimale: titoli, grassetti, liste. Va reso come **schede ricetta** leggibili,
  non come muro di testo.
- Conversazione di approfondimento (follow-up in chat) e **salvataggio** delle singole ricette.
- Elenco ricette salvate: titolo + contenuto, rimozione, collegamento dal tracker pasti.
- Stati: idle, loading/streaming, errore, risposta in cache ("già generato per questo mese/inventario").

### 4.4 Lista spesa e Spesa Smart
- **Lista spesa**: voci raggruppate per categoria, check/uncheck, aggiunta/modifica manuale,
  "svuota spuntati", e **"sposta in dispensa"** dei prodotti acquistati (con scelta della sezione).
- **Spesa Smart**: l'AI genera la lista settimanale (stessa interazione di 4.3), con salvataggio
  voci nella lista.
- Uso tipico: al supermercato, una mano sola, luce forte → target tattili grandi, alto contrasto.

### 4.5 Tracker pasti
- Calendario **mese / settimana**, pasti per giorno.
- Categorie: Colazione ☕, Pranzo 🍝, Cena 🌙, Spuntino 🍎 (+ pasti senza categoria, dot neutro).
- Aggiunta pasto (testo libero + categoria + ricetta salvata opzionale) via FAB; dettaglio e
  rimozione in bottom-sheet.

### 4.6 Impostazioni
Profilo utente, API key Gemini (resta in locale), import/export CSV, svuota dispensa,
toggle notifiche push (scadenze del giorno dopo), logout.

### 4.7 Elementi trasversali
Modali (centrate su desktop / bottom-sheet su mobile), toast/errori, skeleton di caricamento,
indicatore di sincronizzazione/offline, icona PWA e splash.

## 5. Obiettivi di design

1. **Scadenze al centro**: cosa sta per scadere deve essere visibile appena si apre l'app
   (es. una zona "da usare presto" in cima o nella home).
2. **AI come ponte naturale**: dal prodotto in scadenza alla ricetta ("usa questi 3 ingredienti")
   in un tocco; l'AI non deve sembrare un tab separato e oscuro.
3. **Meno livelli di navigazione**: riprogettare l'IA (information architecture). Proposta da
   valutare: 4–5 destinazioni (es. *Oggi/Home*, *Dispensa*, *Cucina* [ricette AI+salvate+pasti],
   *Spesa*, *Tu*). Siete liberi di proporre un'altra struttura, motivandola.
4. **Azioni rapide**: aggiungere un prodotto (testo, voce, scontrino) deve essere raggiungibile
   da ogni punto con un gesto (es. FAB/azione primaria contestuale).
5. **Identità**: carattere riconoscibile, calore e freschezza (stagionalità, cibo vero), senza
   cliché da "app di ricette".
6. **Chiarezza di stato**: sempre evidenti *scaduto / in scadenza / aperto / ok*, senza
   affidarsi solo al colore.

## 6. Vincoli tecnici (per realizzabilità)

- Stack: **React 18 + Vite + CSS Modules**, nessuna libreria di routing, nessun UI kit.
  Le proposte devono essere implementabili con CSS custom (variabili CSS) e SVG/icone inline;
  evitare dipendenze pesanti.
- **PWA standalone** su iOS e Android: considerare safe-area (notch, home indicator), niente hover
  come unica interazione, input ≥16px per evitare lo zoom iOS.
- **Light e dark mode** obbligatorie, entrambe curate (seguono il sistema).
- Breakpoint attuali: mobile ≤600px, tablet 601–1023px, desktop ≥1024px.
- **Accessibilità**: contrasto WCAG AA, target tattili ≥44px, stati non solo cromatici,
  supporto `prefers-reduced-motion`, focus visibile.
- Streaming AI: il layout deve reggere contenuto che cresce senza salti.
- Contenuti lunghi: nomi prodotto lunghi, quantità libere, centinaia di voci.
- Lingua: italiano; prevedere testi più lunghi dell'inglese.

## 7. Deliverable richiesti

1. **Moodboard / direzione visiva** (2–3 alternative), con motivazione.
2. **Design tokens**: palette (light + dark, con ruoli semantici: superficie, testo, accento,
   urgenza, successo, avviso), scala tipografica e font consigliato (web-safe o Google Fonts),
   spaziature, raggi, ombre, motion.
3. **Libreria componenti** minima: bottoni, input, chip/badge di stato, riga prodotto,
   card ricetta, riga lista spesa, cella calendario, modale/bottom-sheet, navigazione, FAB, toast.
4. **Mockup** (mobile prima, poi desktop) di: Login, Home/Dispensa, Aggiunta rapida e verifica
   import massivo, Generazione ricette (idle/streaming/risultato), Lista spesa, Tracker pasti
   (mese e settimana), Impostazioni.
5. **Mappa di navigazione** nuova e confronto con quella attuale.
6. **Note di implementazione**: cosa si può fare solo con CSS, eventuali nuove variabili da
   introdurre in `src/index.css`, ordine di migrazione consigliato per schermata.

## 8. Fuori scope

Nessuna modifica a logica, modello dati Firestore o integrazione Gemini. Nessun nuovo backend.
Eventuali nuove funzioni suggerite dal design vanno elencate separatamente come "idee", non
incluse nei mockup base.

## 9. Riferimenti nel repo

- Entry e navigazione: `src/App.jsx`, `src/components/Sidebar.jsx`, `src/components/BottomNav.jsx`
- Variabili e tema: `src/index.css`
- Schermate: `src/components/PantryTab.jsx`, `ItemRow.jsx`, `AITab.jsx`,
  `SavedShoppingTab.jsx`, `MealTrackerTab.jsx`, `BatchReview.jsx`, `SettingsTab.jsx`
- Categorie pasti e colori: `src/data/mealCategories.js`
- Architettura e modelli dati: `CLAUDE.md`
