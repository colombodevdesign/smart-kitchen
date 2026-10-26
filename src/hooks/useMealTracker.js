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
    // Pending-write snapshots are skipped once the state is loaded (see below)
    let loaded = false
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites || !loaded) {
          loaded = true
          setMeals(snap.data())
        }
      } else if (!snap.metadata.fromCache) {
        loaded = true
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

  const save = useCallback((next) => {
    if (uidRef.current) setDoc(firestoreRef(uidRef.current), next).catch(console.error)
    return next
  }, [])

  // `planned: true` = a meal still to eat (Cucina › Pasti as a planner), with an
  // optional `time` and `reminder`; without it the meal is in the log.
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
      ...planFields(payload),
    }
    const clean = withoutEmpty(meal)
    setMeals(prev => save({ ...prev, [dateStr]: [...(prev[dateStr] ?? []), clean] }))
  }, [save])

  const removeMeal = useCallback((dateStr, id) => {
    setMeals(prev => {
      const updated = (prev[dateStr] ?? []).filter(m => m.id !== id)
      const next = { ...prev }
      if (updated.length === 0) delete next[dateStr]
      else next[dateStr] = updated
      return save(next)
    })
  }, [save])

  // Edits a meal; with `toDate` it also moves it to that day (same id).
  const updateMeal = useCallback((dateStr, id, patch, toDate = dateStr) => {
    setMeals(prev => {
      const meal = (prev[dateStr] ?? []).find(m => m.id === id)
      if (!meal) return prev
      const merged = { ...meal, ...patch }
      const updated = withoutEmpty({ ...merged, ...planFields(merged) })
      const next = { ...prev }
      if (toDate === dateStr) {
        next[dateStr] = prev[dateStr].map(m => (m.id === id ? updated : m))
      } else {
        const rest = prev[dateStr].filter(m => m.id !== id)
        if (rest.length === 0) delete next[dateStr]
        else next[dateStr] = rest
        next[toDate] = [...(prev[toDate] ?? []), updated]
      }
      return save(next)
    })
  }, [save])

  // A planned meal was eaten: it goes in the log and its reminder is dropped.
  const markEaten = useCallback((dateStr, id) => {
    updateMeal(dateStr, id, { planned: false })
  }, [updateMeal])

  return { meals, addMeal, removeMeal, updateMeal, markEaten }
}

// Planner fields are stored only on planned meals, so logged ones keep the old shape.
function planFields(payload) {
  if (payload?.planned !== true) return { planned: undefined, time: undefined, reminder: undefined }
  return {
    planned: true,
    time: /^\d{2}:\d{2}$/.test(payload.time ?? '') ? payload.time : null,
    reminder: payload.reminder?.lead ? { lead: payload.reminder.lead } : null,
  }
}

// Firestore rejects `undefined` values.
function withoutEmpty(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}
