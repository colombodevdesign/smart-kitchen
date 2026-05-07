import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const STORAGE_KEY = 'cucina-spesa-salvata-v1'

function loadFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}

function firestoreRef(uid) {
  return doc(db, 'users', uid, 'savedShopping', 'data')
}

export function useSavedShopping(uid) {
  const [items, setItems] = useState([])
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  useEffect(() => {
    if (!uid) {
      setItems(loadFromLocalStorage())
      return
    }
    const ref = firestoreRef(uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites) setItems(snap.data().items ?? [])
      } else {
        const local = loadFromLocalStorage()
        setDoc(ref, { items: local }).catch(console.error)
        setItems(local)
      }
    })
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid) return
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
        ...newItems.map((item, i) => ({ id: `${ts}-${i}`, ...item, savedAt: ts, checked: false })),
      ]
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

  return { items, addItems, removeItem, toggleChecked, clearChecked }
}
