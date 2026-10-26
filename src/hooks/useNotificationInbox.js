import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'

const STORAGE_KEY = 'sk-inbox'
const MAX_ITEMS = 60

function loadLocal() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
    return list.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

function saveLocal(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

// Notification centre: the history the Functions write next to every push
// (users/{uid}/notifications, newest first). The app can only mark entries read.
// Without an account (demo) the entries live in localStorage. Also keeps the app
// icon badge in step with the unread count, where the platform has one.
export function useNotificationInbox(uid) {
  const [items, setItems] = useState(() => (uid ? [] : loadLocal()))
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (uid === undefined) return
    if (!uid) { setItems(loadLocal()); return }
    const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(MAX_ITEMS))
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {})
  }, [uid])

  const unread = items.filter(n => !n.readAt).length

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return
    const p = unread ? navigator.setAppBadge(unread) : navigator.clearAppBadge()
    p?.catch?.(() => {})
  }, [unread])

  const apply = useCallback((ids) => {
    const now = Date.now()
    const next = itemsRef.current.map(n => (ids.includes(n.id) && !n.readAt ? { ...n, readAt: now } : n))
    setItems(next)
    if (!uid) saveLocal(next)
    return now
  }, [uid])

  const markRead = useCallback((id) => {
    if (!id) return
    const now = apply([id])
    // Also when the entry is older than the loaded page (opened from an old push).
    if (uid) updateDoc(doc(db, 'users', uid, 'notifications', id), { readAt: now }).catch(() => {})
  }, [uid, apply])

  const markAllRead = useCallback(() => {
    const ids = itemsRef.current.filter(n => !n.readAt).map(n => n.id)
    if (ids.length === 0) return
    const now = apply(ids)
    if (!uid) return
    const batch = writeBatch(db)
    for (const id of ids) batch.update(doc(db, 'users', uid, 'notifications', id), { readAt: now })
    batch.commit().catch(() => {})
  }, [uid, apply])

  return { items, unread, markRead, markAllRead }
}
