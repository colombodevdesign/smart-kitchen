import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { getApiKey, storeApiKey } from '../utils/apiKey.js'

const WRITE_TIMEOUT_MS = 5000

function firestoreRef(uid) {
  return doc(db, 'users', uid, 'settings', 'gemini')
}

// Keeps the Gemini key in sync between localStorage (what the AI hooks read) and
// users/{uid}/settings/gemini. Removal is stored as apiKey: '' (not a deleted doc)
// so that "no doc" still means "first login, upload the local key".
// The returned `version` changes whenever the stored key changes, to re-render readers of hasApiKey().
export function useApiKeySync(uid) {
  const [version, setVersion] = useState(0)
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  useEffect(() => {
    if (!uid) return
    const ref = firestoreRef(uid)
    return onSnapshot(ref, (snap) => {
      if (snap.metadata.hasPendingWrites) return
      if (snap.exists()) {
        const remote = typeof snap.data().apiKey === 'string' ? snap.data().apiKey : ''
        if (remote !== getApiKey()) {
          storeApiKey(remote)
          setVersion(v => v + 1)
        }
      } else if (!snap.metadata.fromCache) {
        // Confirmed by the server: first login with a key already stored here, upload it
        const local = getApiKey()
        if (local) setDoc(ref, { apiKey: local, updatedAt: Date.now() }).catch(() => {})
      }
    }, () => {})
  }, [uid])

  // Saves locally first, then to the account. Resolves to 'synced' | 'local' (account write failed or not logged in).
  const saveApiKey = useCallback(async (key) => {
    storeApiKey(key)
    setVersion(v => v + 1)
    const currentUid = uidRef.current
    if (!currentUid) return 'local'
    try {
      // Offline writes stay queued and never settle: don't hold the UI for them.
      await Promise.race([
        setDoc(firestoreRef(currentUid), { apiKey: key, updatedAt: Date.now() }),
        new Promise(resolve => setTimeout(resolve, WRITE_TIMEOUT_MS)),
      ])
      return 'synced'
    } catch {
      return 'local'
    }
  }, [])

  return { apiKeyVersion: version, saveApiKey }
}
