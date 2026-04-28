import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cucina-pasti-v1'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {} } catch { return {} }
}

export function useMealTracker() {
  const [meals, setMeals] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meals)) } catch {}
  }, [meals])

  const addMeal = useCallback((dateStr, text) => {
    const id = `${Date.now()}`
    setMeals(prev => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] ?? []), { id, text }],
    }))
  }, [])

  const removeMeal = useCallback((dateStr, id) => {
    setMeals(prev => {
      const updated = (prev[dateStr] ?? []).filter(m => m.id !== id)
      if (updated.length === 0) {
        const next = { ...prev }
        delete next[dateStr]
        return next
      }
      return { ...prev, [dateStr]: updated }
    })
  }, [])

  return { meals, addMeal, removeMeal }
}
