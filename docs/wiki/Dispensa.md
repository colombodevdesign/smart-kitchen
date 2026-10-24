# Dispensa

I prodotti sono divisi in **Credenza**, **Frigo** e **Freezer**. Ogni prodotto ha un nome e, a scelta, una quantità e una scadenza.

## Scadenze e priorità

Ogni prodotto ha una stima dei giorni rimasti, calcolata come il minimo tra:

- la scadenza stampata, se l'hai inserita;
- i giorni di conservazione dopo l'apertura, se il prodotto è segnato come **Aperto**;
- i giorni di freschezza dall'acquisto, per i freschi senza data.

I prodotti sono ordinati per priorità («Da usare prima»): prima gli scaduti, poi quelli con meno giorni rimasti. In «Oggi» e nel conteggio «da usare presto» compaiono solo quelli entro 7 giorni.

I badge sulle righe seguono lo stesso criterio: arancio per «scade presto» (entro 3 giorni), blu per «Aperto», verde per le scadenze lontane.

## Analisi AI in background

Dopo qualche secondo dall'ultima modifica, l'app analizza in silenzio i prodotti nuovi o rinominati: assegna una categoria, un nome generico («fagioli» per «Fagioli alla Bud Spencer») e le durate tipiche di conservazione. Non blocca mai l'uso dell'app e senza chiave Gemini non fa nulla.

## Modificare un prodotto

Tocca (o clicca) una riga per aprire la scheda: nome, quantità, scadenza (con scorciatoie Domani / +3 giorni / +1 sett.), interruttore **Aperto**, **Sposta in** un'altra sezione, Elimina. Su mobile puoi anche scorrere la riga per segnarla come aperta o eliminarla.

## Viste

- **Mobile e tablet:** un segmented per scegliere la sezione, righe in un unico elenco.
- **Desktop (≥ 1024px):** tre colonne affiancate. Con «Espandi» una sezione occupa tutto lo spazio e ospita l'aggiunta rapida; le altre diventano schede-anteprima a destra.
- **Trascina fra le card** (solo con il mouse): trascina una riga su un'altra card per spostarla. Compare «Annulla» per ripensarci.
- **Per categoria:** raggruppa i prodotti di una sezione (Latticini, Verdura…), con i gruppi richiudibili.
- Ricerca e ordinamento dai pulsanti in alto a destra.
