import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Messaging is only available in browsers that support service workers
export const messagingPromise = isSupported().then(yes => yes ? getMessaging(app) : null)

// Callable Cloud Functions. The functions SDK is loaded on first use: it is only
// needed for the "notifica di prova" button.
export async function callFunction(name, data) {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const res = await httpsCallable(getFunctions(app), name)(data)
  return res.data
}
