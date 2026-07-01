import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const STORAGE_KEY = 'cucina-pasti-v1'
const EMPTY_MEALS = {}

function loadFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? EMPTY_MEALS } catch { return EMPTY_MEALS }
}

function firestoreRef(uid) {
  return doc(db, 'users', uid, 'meals', 'data')
}

export function useMealTracker(uid) {
  const [meals, setMeals] = useState(EMPTY_MEALS)
  const uidRef = useRef(uid)
  useEffect(() => { uidRef.current = uid }, [uid])

  useEffect(() => {
    if (uid === undefined) return // auth still resolving: don't touch state yet
    if (!uid) {
      setMeals(loadFromLocalStorage())
      return
    }
    const ref = firestoreRef(uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites) setMeals(snap.data())
      } else if (!snap.metadata.fromCache) {
        const local = loadFromLocalStorage()
        setDoc(ref, local).catch(console.error)
        setMeals(local)
      }
    })
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid || uid === undefined) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meals)) } catch {}
  }, [meals, uid])

  const addMeal = useCallback((dateStr, payload) => {
    const text = (payload?.text ?? '').trim()
    if (!text) return
    const meal = {
      id: `${Date.now()}`,
      text,
      category: payload.category ?? null,
      recipeId:    payload.recipeId    ?? null,
      recipeTitle: payload.recipeTitle ?? null,
      createdAt: Date.now(),
    }
    setMeals(prev => {
      const next = { ...prev, [dateStr]: [...(prev[dateStr] ?? []), meal] }
      if (uidRef.current) setDoc(firestoreRef(uidRef.current), next).catch(console.error)
      return next
    })
  }, [])

  const removeMeal = useCallback((dateStr, id) => {
    setMeals(prev => {
      const updated = (prev[dateStr] ?? []).filter(m => m.id !== id)
      const next = { ...prev }
      if (updated.length === 0) delete next[dateStr]
      else next[dateStr] = updated
      if (uidRef.current) setDoc(firestoreRef(uidRef.current), next).catch(console.error)
      return next
    })
  }, [])

  const updateMeal = useCallback((dateStr, id, patch) => {
    setMeals(prev => {
      const list = (prev[dateStr] ?? []).map(m => m.id === id ? { ...m, ...patch } : m)
      const next = { ...prev, [dateStr]: list }
      if (uidRef.current) setDoc(firestoreRef(uidRef.current), next).catch(console.error)
      return next
    })
  }, [])

  return { meals, addMeal, removeMeal, updateMeal }
}
