import { useCallback } from 'react'
import { useSyncedDoc } from './useSyncedDoc.js'

const STORAGE_KEY = 'cucina-pasti-v1'
const EMPTY_MEALS = {}

function loadFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? EMPTY_MEALS } catch { return EMPTY_MEALS }
}

export function useMealTracker(uid) {
  // Synced without overwriting newer data from other devices: see useSyncedDoc.
  // Days left without meals disappear from the document (no `keep`).
  const [meals, setMeals] = useSyncedDoc(uid, {
    path: ['meals', 'data'],
    normalize: raw => raw ?? EMPTY_MEALS,
    loadLocal: loadFromLocalStorage,
    saveLocal: (next) => localStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
  })

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
    setMeals(prev => ({ ...prev, [dateStr]: [...(prev[dateStr] ?? []), clean] }))
  }, [setMeals])

  const removeMeal = useCallback((dateStr, id) => {
    setMeals(prev => {
      const updated = (prev[dateStr] ?? []).filter(m => m.id !== id)
      const next = { ...prev }
      if (updated.length === 0) delete next[dateStr]
      else next[dateStr] = updated
      return next
    })
  }, [setMeals])

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
      return next
    })
  }, [setMeals])

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
