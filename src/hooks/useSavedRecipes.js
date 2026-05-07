import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const STORAGE_KEY = 'cucina-ricette-salvate-v1'

function loadFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}

function firestoreRef(uid) {
  return doc(db, 'users', uid, 'savedRecipes', 'data')
}

export function useSavedRecipes(uid) {
  const [recipes, setRecipes] = useState([])
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  useEffect(() => {
    if (!uid) {
      setRecipes(loadFromLocalStorage())
      return
    }
    const ref = firestoreRef(uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites) setRecipes(snap.data().items ?? [])
      } else {
        const local = loadFromLocalStorage()
        setDoc(ref, { items: local }).catch(console.error)
        setRecipes(local)
      }
    })
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes)) } catch {}
  }, [recipes, uid])

  const persist = (next) => {
    if (uidRef.current) setDoc(firestoreRef(uidRef.current), { items: next }).catch(console.error)
  }

  const addRecipes = useCallback((items) => {
    const ts = Date.now()
    setRecipes(prev => {
      const next = [
        ...prev,
        ...items.map((r, i) => ({ id: `${ts}-${i}`, ...r, savedAt: ts })),
      ]
      persist(next)
      return next
    })
  }, [])

  const removeRecipe = useCallback((id) => {
    setRecipes(prev => {
      const next = prev.filter(r => r.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { recipes, addRecipes, removeRecipe }
}
