import { useState, useEffect, useCallback } from 'react'
import { getToken } from 'firebase/messaging'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { messagingPromise, db } from '../firebase.js'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

function tokenRef(uid) {
  return doc(db, 'users', uid, 'pushToken', 'data')
}

// Registers the service worker if not already registered
async function ensureSwRegistered() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker non supportato')
  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  if (existing) return existing
  return navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
}

export function usePushNotifications(uid) {
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'denied'
  )
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sync enabled state from Firestore
  useEffect(() => {
    if (!uid) { setLoading(false); return }
    return onSnapshot(tokenRef(uid), (snap) => {
      setEnabled(snap.exists() && snap.data()?.enabled === true)
      setLoading(false)
    })
  }, [uid])

  const enable = useCallback(async () => {
    if (!uid || !supported) return
    setLoading(true)
    setError('')
    try {
      const messaging = await messagingPromise
      if (!messaging) throw new Error('Notifiche push non supportate su questo browser.')

      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setError('Permesso negato. Abilita le notifiche nelle impostazioni del browser.')
        return
      }

      await ensureSwRegistered()
      const swReg = await navigator.serviceWorker.ready

      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
      await setDoc(tokenRef(uid), { token, enabled: true, updatedAt: Date.now() })
    } catch (e) {
      setError(e.message || 'Errore durante la registrazione delle notifiche.')
    } finally {
      setLoading(false)
    }
  }, [uid, supported])

  const disable = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError('')
    try {
      await setDoc(tokenRef(uid), { token: '', enabled: false, updatedAt: Date.now() })
    } catch (e) {
      setError(e.message || 'Errore.')
    } finally {
      setLoading(false)
    }
  }, [uid])

  return { supported, permission, enabled, loading, error, enable, disable }
}
