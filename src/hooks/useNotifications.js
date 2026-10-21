import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { messagingPromise, db, callFunction } from '../firebase.js'
import { useToast } from '../components/ui/Toast.jsx'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const DEVICE_ID_KEY = 'sk-device-id'
const MIGRATED_KEY = 'sk-notif-migrated-'

export const DEFAULT_PREFS = { enabled: false, hour: 9, minute: 0, daysBefore: [1] }

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = crypto.randomUUID?.() ?? `d${Date.now()}${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return 'this-device'
  }
}

function describeDevice() {
  const ua = navigator.userAgent
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Dispositivo'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox|FxiOS/.test(ua) ? 'Firefox'
    : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : ''
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone
  return { platform: os, label: [os, standalone ? 'app installata' : browser].filter(Boolean).join(' · ') }
}

function deviceTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome' } catch { return 'Europe/Rome' }
}

async function ensureSwRegistered() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker non supportato')
  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  if (!existing) await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
  return navigator.serviceWorker.ready
}

async function fetchToken() {
  const messaging = await messagingPromise
  if (!messaging) throw new Error('Le notifiche push non sono supportate da questo browser.')
  const swReg = await ensureSwRegistered()
  return getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
}

function readableError(e) {
  if (e?.code === 'permission-denied' || e?.code === 'functions/permission-denied') {
    return 'Regole Firestore non aggiornate: pubblica quelle di docs/firestore-rules.md.'
  }
  if (e?.code === 'functions/not-found') {
    return 'La funzione di prova non è ancora stata pubblicata (deploy delle Functions).'
  }
  if (e?.code === 'functions/unauthenticated') return 'Accedi di nuovo per inviare la notifica di prova.'
  if (e?.code === 'unavailable' || e?.code === 'functions/unavailable') return 'Sei offline: riprova quando la connessione torna.'
  return e?.message || 'Qualcosa è andato storto. Riprova.'
}

// Per-user notification settings (users/{uid}/notificationPrefs/data) plus the
// devices registered for this user (users/{uid}/pushTokens/{deviceId}).
export function useNotifications(uid) {
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  const [prefsDoc, setPrefsDoc] = useState(undefined)   // undefined = loading, null = missing
  const [devices, setDevices] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const myId = useRef(deviceId()).current
  const devicesRef = useRef([])
  const healed = useRef(false)

  const prefsRef = useCallback(() => doc(db, 'users', uid, 'notificationPrefs', 'data'), [uid])

  useEffect(() => {
    if (!uid) { setPrefsDoc(null); setDevices([]); return }
    const onErr = (e) => setError(readableError(e))
    const offPrefs = onSnapshot(doc(db, 'users', uid, 'notificationPrefs', 'data'),
      snap => setPrefsDoc(snap.exists() ? snap.data() : null), onErr)
    const offDevices = onSnapshot(collection(db, 'users', uid, 'pushTokens'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      devicesRef.current = list
      setDevices(list)
    }, onErr)
    return () => { offPrefs(); offDevices() }
  }, [uid])

  const loading = prefsDoc === undefined || devices === undefined
  const prefs = { ...DEFAULT_PREFS, ...(prefsDoc ?? {}) }

  // The old doc and the new one can list the same token: show it once.
  const visibleDevices = (devices ?? []).filter((d, i, all) =>
    !(d.id === 'legacy' && all.some(o => o.id !== 'legacy' && o.token === d.token)))
  const mine = visibleDevices.find(d => d.id === myId)

  let thisDevice = 'missing'
  if (!supported) thisDevice = 'unsupported'
  else if (permission === 'denied') thisDevice = 'blocked'
  else if (mine?.status === 'active') thisDevice = 'active'
  else if (mine) thisDevice = 'stale'

  async function writeDevice(token) {
    const { label, platform } = describeDevice()
    await setDoc(doc(db, 'users', uid, 'pushTokens', myId), {
      token, label, platform, status: 'active', staleSince: null, updatedAt: Date.now(),
    }, { merge: true })
    const old = devicesRef.current.find(d => d.id === 'legacy' && d.token === token)
    if (old) await deleteDoc(doc(db, 'users', uid, 'pushTokens', 'legacy')).catch(() => {})
    return token
  }

  // First run after the update: carry a token saved by the old single-device
  // version over to the new structure, so nobody has to re-enable.
  useEffect(() => {
    if (!uid || loading || prefsDoc !== null || devices.length > 0) return
    let done = false
    try { done = !!localStorage.getItem(MIGRATED_KEY + uid) } catch {}
    if (done) return
    try { localStorage.setItem(MIGRATED_KEY + uid, '1') } catch {}
    getDoc(doc(db, 'users', uid, 'pushToken', 'data')).then(async snap => {
      const old = snap.exists() ? snap.data() : null
      if (!old?.enabled || !old.token) return
      await setDoc(doc(db, 'users', uid, 'pushTokens', 'legacy'), {
        token: old.token, label: 'Dispositivo precedente', platform: '', status: 'active', updatedAt: Date.now(),
      })
      await setDoc(prefsRef(), { ...DEFAULT_PREFS, enabled: true, tz: deviceTz(), updatedAt: Date.now() }, { merge: true })
    }).catch(() => {})
  }, [uid, loading, prefsDoc, devices, prefsRef])

  // Opening the app on a device where it is enabled quietly repairs its token
  // (rotated, or marked stale after a failed delivery).
  useEffect(() => {
    if (!uid || loading || !supported || permission !== 'granted' || !prefs.enabled || healed.current) return
    healed.current = true
    fetchToken().then(token => {
      if (!mine || mine.token !== token || mine.status !== 'active') return writeDevice(token)
    }).catch(() => {})
  }, [uid, loading, supported, permission, prefs.enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the time zone current when the user travels.
  useEffect(() => {
    if (!uid || loading || !prefs.enabled || prefsDoc?.tz === deviceTz()) return
    setDoc(prefsRef(), { tz: deviceTz() }, { merge: true }).catch(() => {})
  }, [uid, loading, prefs.enabled, prefsDoc?.tz, prefsRef])

  const run = useCallback(async (fn) => {
    setBusy(true)
    setError('')
    try { return await fn() } catch (e) { setError(readableError(e)) } finally { setBusy(false) }
  }, [])

  // Registers this device and switches the alerts on.
  const enable = useCallback(() => run(async () => {
    if (!uid || !supported) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') {
      setError('Permesso negato. Consenti le notifiche dalle impostazioni del browser e riprova.')
      return
    }
    const token = await writeDevice(await fetchToken())
    healed.current = true
    await setDoc(prefsRef(), { ...prefs, enabled: true, tz: deviceTz(), updatedAt: Date.now() }, { merge: true })
    // TODO(remove next release): the previous Cloud Function still reads this doc until it is redeployed.
    await setDoc(doc(db, 'users', uid, 'pushToken', 'data'), { token, enabled: true, updatedAt: Date.now() }, { merge: true })
  }), [uid, supported, run, prefsRef, prefs.hour, prefs.minute, prefs.daysBefore.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  // Switches the alerts off for every device; tokens are kept so turning them
  // back on is a single tap.
  const disable = useCallback(() => run(async () => {
    await setDoc(prefsRef(), { enabled: false, updatedAt: Date.now() }, { merge: true })
    // TODO(remove next release): see enable().
    await setDoc(doc(db, 'users', uid, 'pushToken', 'data'), { enabled: false, updatedAt: Date.now() }, { merge: true })
  }), [uid, run, prefsRef])

  const setSchedule = useCallback((patch) => run(async () => {
    const next = {}
    if (patch.hour != null) next.hour = Math.min(23, Math.max(0, Math.round(patch.hour)))
    if (patch.minute != null) next.minute = Math.min(45, Math.max(0, Math.round(patch.minute / 15) * 15))
    if (patch.daysBefore) {
      const days = [...new Set(patch.daysBefore)].filter(d => Number.isInteger(d) && d >= 0 && d <= 7).sort((a, b) => a - b)
      if (days.length === 0) return
      next.daysBefore = days
    }
    await setDoc(prefsRef(), { ...next, tz: deviceTz(), updatedAt: Date.now() }, { merge: true })
  }), [run, prefsRef])

  // Returns [{ deviceId, label, status: 'ok' | 'stale' | 'error' }]
  const sendTest = useCallback(async () => {
    setError('')
    try {
      const data = await callFunction('sendTestNotification')
      return data?.results ?? []
    } catch (e) {
      setError(readableError(e))
      return null
    }
  }, [])

  return {
    supported, permission, loading, busy, error,
    prefs, devices: visibleDevices, myId, thisDevice,
    enable, disable, setSchedule, sendTest,
  }
}

// Foreground pushes are not shown by the browser: surface them as a toast.
export function useForegroundPush(active) {
  const { show } = useToast()
  useEffect(() => {
    if (!active) return
    let off
    let cancelled = false
    messagingPromise.then(messaging => {
      if (!messaging || cancelled) return
      off = onMessage(messaging, payload => {
        const { title, body } = payload.notification ?? {}
        const message = [title, body].filter(Boolean).join(' · ')
        if (message) show({ message, ms: 8000 })
      })
    })
    return () => { cancelled = true; off?.() }
  }, [active, show])
}
