import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteToken, getToken, onMessage } from 'firebase/messaging'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { messagingPromise, db, callFunction } from '../firebase.js'
import { useToast } from '../components/ui/Toast.jsx'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const DEVICE_ID_KEY = 'sk-device-id'
const OFF_HERE_KEY = 'sk-notif-off-here'
const SEEN_EVERY_MS = 12 * 3600 * 1000
const OPEN_PARAM = 'apri'
const NID_PARAM = 'n'
const OPEN_TARGETS = ['scadenze', 'pasti', 'impostazioni']

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

function offHere() {
  try { return localStorage.getItem(OFF_HERE_KEY) === '1' } catch { return false }
}

function setOffHere(on) {
  try { on ? localStorage.setItem(OFF_HERE_KEY, '1') : localStorage.removeItem(OFF_HERE_KEY) } catch {}
}

function deviceTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome' } catch { return 'Europe/Rome' }
}

async function ensureSwRegistered() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker non supportato')
  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  if (!existing) await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
  else existing.update().catch(() => {})
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
  // Expiry alerts or meal reminders: either one needs this device registered.
  const anyOn = prefs.enabled || prefs.meals?.enabled === true

  // Two docs with the same token are one device: show it once (this device's doc wins).
  const visibleDevices = (devices ?? []).filter((d, i, all) =>
    (all.find(o => o.token === d.token && o.id === myId) ?? all.find(o => o.token === d.token)) === d)
  const mine = visibleDevices.find(d => d.id === myId)

  let thisDevice = 'missing'
  if (!supported) thisDevice = 'unsupported'
  else if (permission === 'denied') thisDevice = 'blocked'
  else if (mine?.status === 'active') thisDevice = 'active'
  else if (mine) thisDevice = 'stale'

  async function writeDevice(token) {
    const { label, platform } = describeDevice()
    const now = Date.now()
    await setDoc(doc(db, 'users', uid, 'pushTokens', myId), {
      token, label, platform, status: 'active', staleSince: null, updatedAt: now, lastSeenAt: now,
    }, { merge: true })
    // Same token under another id (old 'legacy' copy, or this browser before its
    // id was reset) would be the same device twice.
    const dupes = devicesRef.current.filter(d => d.id !== myId && d.token === token)
    await Promise.all(dupes.map(d => deleteDoc(doc(db, 'users', uid, 'pushTokens', d.id)).catch(() => {})))
    return token
  }

  // Opening the app on a device where it is enabled quietly repairs its token
  // (rotated, or marked stale after a failed delivery) and records when it was
  // last opened, so old devices can be told apart in the list. Skipped where the
  // user removed this device.
  useEffect(() => {
    if (!uid || loading || !supported || permission !== 'granted' || !anyOn || healed.current || offHere()) return
    healed.current = true
    fetchToken().then(token => {
      if (!mine || mine.token !== token || mine.status !== 'active') return writeDevice(token)
      if (!(Date.now() - (mine.lastSeenAt ?? 0) < SEEN_EVERY_MS)) {
        return setDoc(doc(db, 'users', uid, 'pushTokens', myId), { lastSeenAt: Date.now() }, { merge: true })
      }
    }).catch(() => {})
  }, [uid, loading, supported, permission, anyOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the time zone current when the user travels.
  useEffect(() => {
    if (!uid || loading || !anyOn || prefsDoc?.tz === deviceTz()) return
    setDoc(prefsRef(), { tz: deviceTz() }, { merge: true }).catch(() => {})
  }, [uid, loading, anyOn, prefsDoc?.tz, prefsRef])

  const run = useCallback(async (fn) => {
    setBusy(true)
    setError('')
    try { return await fn() } catch (e) { setError(readableError(e)) } finally { setBusy(false) }
  }, [])

  // Asks for the permission and registers this device; false if it was refused.
  async function registerHere() {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') {
      setError('Permesso negato. Consenti le notifiche dalle impostazioni del browser e riprova.')
      return false
    }
    setOffHere(false)
    await writeDevice(await fetchToken())
    healed.current = true
    return true
  }

  // Registers this device and switches the alerts on.
  const enable = useCallback(() => run(async () => {
    if (!uid || !supported) return
    if (!(await registerHere())) return
    await setDoc(prefsRef(), { ...prefs, enabled: true, tz: deviceTz(), updatedAt: Date.now() }, { merge: true })
  }), [uid, supported, run, prefsRef, prefs.hour, prefs.minute, prefs.daysBefore.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  // Meal reminders on (Promemoria dei pasti): same device registration, without
  // touching the expiry alerts. `meals` = the full meal settings to store.
  const enableMeals = useCallback((meals) => run(async () => {
    if (!uid || !supported) return false
    if (!(await registerHere())) return false
    await setDoc(prefsRef(), { meals: { ...meals, enabled: true }, tz: deviceTz(), updatedAt: Date.now() }, { merge: true })
    return true
  }), [uid, supported, run, prefsRef]) // eslint-disable-line react-hooks/exhaustive-deps

  // Switches the alerts off for every device; tokens are kept so turning them
  // back on is a single tap.
  const disable = useCallback(() => run(async () => {
    await setDoc(prefsRef(), { enabled: false, updatedAt: Date.now() }, { merge: true })
  }), [run, prefsRef])

  // Stops sending to one device. For this device the push subscription is dropped
  // too, and it is not re-registered on the next launch until the user turns it
  // back on here.
  const removeDevice = useCallback((id) => run(async () => {
    if (!uid) return
    const token = devicesRef.current.find(d => d.id === id)?.token
    const sameDevice = devicesRef.current.filter(d => d.id === id || (token && d.token === token))
    await Promise.all(sameDevice.map(d => deleteDoc(doc(db, 'users', uid, 'pushTokens', d.id))))
    if (sameDevice.some(d => d.id === myId)) {
      setOffHere(true)
      const messaging = await messagingPromise
      if (messaging) await deleteToken(messaging).catch(() => {})
    }
  }), [uid, myId, run])

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
    enable, disable, enableMeals, setSchedule, sendTest, removeDevice,
  }
}

// { open, nid } from `?apri=<view>&n=<id>`, removed from the address bar; null without it.
function readOpenParam() {
  const params = new URLSearchParams(window.location.search)
  const open = params.get(OPEN_PARAM)
  if (open === null) return null
  const nid = params.get(NID_PARAM)
  params.delete(OPEN_PARAM)
  params.delete(NID_PARAM)
  const query = params.toString()
  window.history.replaceState(window.history.state, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
  return OPEN_TARGETS.includes(open) ? { open, nid } : null
}

// Tapping a notification opens a view of the app: through `?apri=<view>` when the
// app was closed, or a message from the service worker when it was already open.
// onOpen(view, nid): `nid` is the notification centre entry, to mark it read.
export function useNotificationOpen(active, onOpen) {
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  useEffect(() => {
    if (!active) return
    const fromUrl = readOpenParam()
    if (fromUrl) onOpenRef.current(fromUrl.open, fromUrl.nid)
    if (!('serviceWorker' in navigator)) return
    const onMsg = (e) => {
      if (e.data?.type === 'sk-open' && OPEN_TARGETS.includes(e.data.open)) onOpenRef.current(e.data.open, e.data.nid ?? null)
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [active])
}

// Foreground pushes are not shown by the browser: surface them as a toast.
export function useForegroundPush(active, onOpen) {
  const { show } = useToast()
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  useEffect(() => {
    if (!active) return
    let off
    let cancelled = false
    messagingPromise.then(messaging => {
      if (!messaging || cancelled) return
      off = onMessage(messaging, payload => {
        const { title, body } = payload.notification ?? {}
        const message = [title, body].filter(Boolean).join(' · ')
        if (!message) return
        const open = payload.data?.open
        const nid = payload.data?.nid ?? null
        if (OPEN_TARGETS.includes(open) && onOpenRef.current) {
          show({ message, ms: 8000, actionLabel: 'Vedi', onAction: () => onOpenRef.current(open, nid) })
        } else {
          show({ message, ms: 8000 })
        }
      })
    })
    return () => { cancelled = true; off?.() }
  }, [active, show])
}
