import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { PREFERENCE_KIND_IDS, preferenceKey } from '../data/preferences.js'

const STORAGE_KEY = 'sk-preferences'
const EMPTY = { items: [], dismissed: [] }
// Suggestions the user turned down, so the chat doesn't propose them again.
const MAX_DISMISSED = 50

function normalize(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : []
  return {
    items: items
      .filter(p => p?.text && PREFERENCE_KIND_IDS.includes(p.kind))
      .map(p => ({ id: p.id, kind: p.kind, text: p.text, source: p.source ?? 'manual', createdAt: p.createdAt ?? 0 })),
    dismissed: Array.isArray(raw?.dismissed) ? raw.dismissed.filter(d => typeof d === 'string') : [],
  }
}

function loadFromLocalStorage() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))) } catch { return EMPTY }
}

function firestoreRef(uid) {
  return doc(db, 'users', uid, 'preferences', 'data')
}

// Food preferences used by every AI prompt. Same sync pattern as useSavedShopping.
export function usePreferences(uid) {
  const [prefs, setPrefs] = useState(EMPTY)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  useEffect(() => {
    if (uid === undefined) return
    if (!uid) {
      setPrefs(loadFromLocalStorage())
      return
    }
    const ref = firestoreRef(uid)
    let loaded = false
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites || !loaded) {
          loaded = true
          setPrefs(normalize(snap.data()))
        }
      } else if (!snap.metadata.fromCache) {
        loaded = true
        const local = loadFromLocalStorage()
        setDoc(ref, local).catch(console.error)
        setPrefs(local)
      }
    })
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid || uid === undefined) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch {}
  }, [prefs, uid])

  const update = useCallback((fn) => {
    setPrefs(prev => {
      const next = fn(prev)
      if (next === prev) return prev
      if (uidRef.current) setDoc(firestoreRef(uidRef.current), next).catch(console.error)
      return next
    })
  }, [])

  // Returns false when the same preference is already saved.
  const add = useCallback(({ kind, text, source = 'manual' }) => {
    const clean = String(text ?? '').trim()
    if (!clean || !PREFERENCE_KIND_IDS.includes(kind)) return false
    const key = preferenceKey(clean)
    if (prefsRef.current.items.some(p => preferenceKey(p.text) === key)) return false
    update(prev => {
      if (prev.items.some(p => preferenceKey(p.text) === key)) return prev
      const ts = Date.now()
      return {
        items: [...prev.items, { id: `p-${ts}`, kind, text: clean, source, createdAt: ts }],
        dismissed: prev.dismissed.filter(d => d !== key),
      }
    })
    return true
  }, [update])

  const remove = useCallback((id) => {
    update(prev => ({ ...prev, items: prev.items.filter(p => p.id !== id) }))
  }, [update])

  const dismiss = useCallback((text) => {
    const key = preferenceKey(text)
    if (!key) return
    update(prev => prev.dismissed.includes(key)
      ? prev
      : { ...prev, dismissed: [...prev.dismissed, key].slice(-MAX_DISMISSED) })
  }, [update])

  return { items: prefs.items, dismissed: prefs.dismissed, add, remove, dismiss }
}
