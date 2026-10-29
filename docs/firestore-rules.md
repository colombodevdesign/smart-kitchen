# Regole Firestore

Il testo delle regole è in [`firestore.rules`](../firestore.rules), alla radice del repo: è l'unica fonte. Il workflow
[`.github/workflows/firebase.yml`](../.github/workflows/firebase.yml) le pubblica da solo quando un merge su `master`
cambia quel file, **prima** delle Functions; il client lo pubblica Vercel nello stesso momento (le regole impiegano circa
30 secondi, meno della build). Setup una tantum e avvio manuale: [`docs/deploy.md`](deploy.md).

Ripiego manuale: `firebase deploy --only firestore:rules`, oppure Firebase Console → Firestore Database → Rules →
incolla il contenuto di `firestore.rules` → Publish.

## Compatibilità e ordine

Con il deploy manuale l'ordine è **Functions → client → regole**. Eccezione per i **promemoria dei pasti**
(`meals` in `notificationPrefs`): le regole nuove accettano anche i documenti vecchi, quindi pubblicale
**prima** del client, altrimenti salvare le impostazioni dei promemoria dà "Regole Firestore non aggiornate".
`mealReminders/data` (pasti già ricordati) lo scrive e legge solo la Function: nessuna regola, il client non
ci accede. Anche il **centro notifiche** (`notifications/{id}`) va pubblicato **prima** del client: lo
scrivono solo le Functions, il client legge i propri e aggiorna solo `readAt` (segna come letta); senza la
regola la campanella resta vuota. Anche **chat dell'assistente** (`chats/{id}`) e **preferenze alimentari**
(`preferences/data`) vanno pubblicate **prima** del client: senza regola la chat funziona solo finché la scheda
resta aperta (le scritture vengono rifiutate) e le preferenze non si salvano. Il vecchio doc `pushToken/data` (dispositivo
singolo) non è più usato: la sua regola va tolta solo dopo il deploy del client, perché quello precedente lo
scrive ancora. Il doc rimasto su Firestore si può cancellare a mano dalla Console.

Ogni utente legge e scrive solo i propri documenti `/users/{uid}/...`. Le regole non si possono provare
senza l'emulatore: dopo averle pubblicate, apri **Tu → Notifiche** e attiva/disattiva gli avvisi
(deve funzionare senza errori), poi usa "Invia notifica di prova". Per la chiave Gemini: salva una chiave in
**Tu → Chiave API Gemini** (il toast deve dire "nel tuo account"; se dice "solo su questo dispositivo" le regole
non sono ancora pubblicate).
