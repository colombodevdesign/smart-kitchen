import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'
import { MOCK_MODE } from './mock/mode.js'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// In demo mode (see src/mock) Firebase is never initialised: no env vars needed,
// and nothing can reach the real project.
const app = MOCK_MODE ? null : initializeApp(firebaseConfig)
export const auth = MOCK_MODE ? null : getAuth(app)
export const db = MOCK_MODE ? null : getFirestore(app)

// Messaging is only available in browsers that support service workers
export const messagingPromise = MOCK_MODE
  ? Promise.resolve(null)
  : isSupported().then(yes => yes ? getMessaging(app) : null)

// Callable Cloud Functions. The functions SDK is loaded on first use: it is only
// needed for the "notifica di prova" button.
export async function callFunction(name, data) {
  if (MOCK_MODE) throw new Error('Non disponibile in modalità demo.')
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const res = await httpsCallable(getFunctions(app), name)(data)
  return res.data
}
