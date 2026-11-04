import { doc, setDoc, increment } from 'firebase/firestore'
import { db } from '../firebase.js'
import { normalizeUsage, dayKey, usageKey } from './usage.js'

// L'uid lo imposta App: così le chiamate Gemini non devono conoscerlo.
// Senza account (demo) non si registra nulla.
let currentUid = null
export function setUsageUser(uid) {
  currentUid = uid || null
}

// Aggiunge una chiamata ai contatori del giorno. Mai bloccante e mai un errore per l'utente:
// la scrittura non si attende (offline resta in coda nella cache di Firestore).
export function recordUsage(feature, model, usageMetadata) {
  if (!currentUid || !db || !usageMetadata) return
  try {
    const u = normalizeUsage(usageMetadata)
    const day = dayKey()
    setDoc(doc(db, 'users', currentUid, 'aiUsage', day), {
      day,
      updatedAt: Date.now(),
      byKey: {
        [usageKey(feature, model)]: {
          feature,
          model,
          calls: increment(1),
          input: increment(u.input),
          output: increment(u.output),
          thoughts: increment(u.thoughts),
          cached: increment(u.cached),
        },
      },
    }, { merge: true }).catch(() => {})
  } catch { /* la contabilità è opzionale */ }
}
