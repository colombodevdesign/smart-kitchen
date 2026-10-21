# Regole Firestore

Le regole si applicano a mano da Firebase Console → Firestore Database → Rules (nel repo non c'è
`firestore.rules`). **Vanno pubblicate prima di deployare le Functions e il client**: senza le regole per
`notificationPrefs` e `pushTokens` le notifiche mostrano "Regole Firestore non aggiornate".

Ordine di deploy consigliato: **regole → Functions → client**. Rollback: revert del client; le regole nuove
non rompono quello vecchio.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /{document=**} {
      allow read, write: if false;
    }

    match /users/{userId}/inventory/data {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isValidInventory(request.resource.data);
    }

    match /users/{userId}/meals/data {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && request.resource.data is map;
    }

    match /users/{userId}/savedRecipes/data {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId)
                   && request.resource.data.keys().hasAll(['items'])
                   && request.resource.data.items is list;
    }

    match /users/{userId}/savedShopping/data {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId)
                   && request.resource.data.keys().hasAll(['items'])
                   && request.resource.data.items is list;
    }

    // Preferenze di notifica. Lettura e scrittura sono regole separate:
    // in lettura request.resource non esiste.
    // `lastRunDay` lo scrive la Function (Admin SDK), ma il client salva con
    // merge e quindi lo rimanda: deve essere ammesso tra le chiavi.
    match /users/{userId}/notificationPrefs/data {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isValidPrefs(request.resource.data);
    }

    // Un documento per dispositivo. Il client scrive solo token "attivi":
    // `stale` lo imposta la Function (Admin SDK, che ignora le regole).
    match /users/{userId}/pushTokens/{deviceId} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId) && isValidDevice(request.resource.data);
      allow delete: if isOwner(userId);
    }

    // TODO(remove next release): doc del vecchio client a dispositivo singolo,
    // ancora scritto in doppia copia finché la Function non è stata ridistribuita.
    match /users/{userId}/pushToken/data {
      allow read, write: if isOwner(userId);
    }
  }

  function isValidInventory(data) {
    return data.keys().hasAll(['credenza', 'frigo', 'freezer'])
        && data.credenza is list
        && data.frigo    is list
        && data.freezer  is list;
  }

  function isValidPrefs(data) {
    return data.keys().hasOnly(['enabled', 'hour', 'minute', 'tz', 'daysBefore', 'updatedAt', 'lastRunDay'])
        && data.get('enabled', false) is bool
        && data.get('hour', 9) is int
        && data.get('hour', 9) >= 0 && data.get('hour', 9) <= 23
        && data.get('minute', 0) in [0, 15, 30, 45]
        && data.get('tz', 'Europe/Rome') is string
        && data.get('daysBefore', [1]) is list
        && data.get('daysBefore', [1]).size() <= 8;
  }

  function isValidDevice(data) {
    return data.token is string
        && data.token.size() > 0
        && data.get('status', 'active') == 'active'
        && data.get('label', '').size() <= 80;
  }
}
```

Ogni utente legge e scrive solo i propri documenti `/users/{uid}/...`. Le regole non si possono provare
senza l'emulatore: dopo averle pubblicate, apri **Tu → Avvisi di scadenza** e attiva/disattiva gli avvisi
(deve funzionare senza errori), poi usa "Invia notifica di prova".
