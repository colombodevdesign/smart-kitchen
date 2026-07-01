import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const STORAGE_KEY = 'cucina-spesa-salvata-v1'

function normalizeItem(raw) {
  const savedAt = raw.savedAt ?? Date.now()
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category ?? 'Generale',
    qty: raw.qty ?? '',
    savedAt,
    updatedAt: raw.updatedAt ?? savedAt,
    checked: raw.checked ?? false,
    source: raw.source ?? 'ai',
  }
}

function loadFromLocalStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
    return raw.map(normalizeItem)
  } catch { return [] }
}

function firestoreRef(uid) {
  return doc(db, 'users', uid, 'savedShopping', 'data')
}

export function useSavedShopping(uid) {
  const [items, setItems] = useState([])
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  useEffect(() => {
    if (uid === undefined) return // auth still resolving: don't touch state yet
    if (!uid) {
      setItems(loadFromLocalStorage())
      return
    }
    const ref = firestoreRef(uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites) {
          setItems((snap.data().items ?? []).map(normalizeItem))
        }
      } else if (!snap.metadata.fromCache) {
        const local = loadFromLocalStorage()
        setDoc(ref, { items: local }).catch(console.error)
        setItems(local)
      }
    })
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid || uid === undefined) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items, uid])

  const persist = (next) => {
    if (uidRef.current) setDoc(firestoreRef(uidRef.current), { items: next }).catch(console.error)
  }

  const addItems = useCallback((newItems) => {
    const ts = Date.now()
    setItems(prev => {
      const next = [
        ...prev,
        ...newItems.map((item, i) => ({
          id: `${ts}-${i}`,
          name: item.name,
          category: item.category ?? 'Generale',
          qty: item.qty ?? '',
          savedAt: ts,
          updatedAt: ts,
          checked: false,
          source: item.source ?? 'ai',
        })),
      ]
      persist(next)
      return next
    })
  }, [])

  const addItem = useCallback(({ name, category = 'Generale', qty = '', source = 'manual' }) => {
    const trimmed = name?.trim()
    if (!trimmed) return
    const ts = Date.now()
    setItems(prev => {
      const next = [
        ...prev,
        {
          id: `m-${ts}`,
          name: trimmed,
          category: category?.trim() || 'Generale',
          qty: qty?.trim() ?? '',
          savedAt: ts,
          updatedAt: ts,
          checked: false,
          source,
        },
      ]
      persist(next)
      return next
    })
  }, [])

  const updateItem = useCallback((id, patch) => {
    const allowed = {}
    if (patch.name !== undefined)     allowed.name = patch.name.trim()
    if (patch.qty !== undefined)      allowed.qty = patch.qty.trim()
    if (patch.category !== undefined) allowed.category = patch.category.trim() || 'Generale'
    if (Object.keys(allowed).length === 0) return
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...allowed, updatedAt: Date.now() } : i)
      persist(next)
      return next
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      persist(next)
      return next
    })
  }, [])

  const toggleChecked = useCallback((id) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      persist(next)
      return next
    })
  }, [])

  const clearChecked = useCallback(() => {
    setItems(prev => {
      const next = prev.filter(i => !i.checked)
      persist(next)
      return next
    })
  }, [])

  return { items, addItems, addItem, updateItem, removeItem, toggleChecked, clearChecked }
}
