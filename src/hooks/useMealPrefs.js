import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { DEFAULT_MEAL_TIMES } from '../data/mealCategories.js'

const STORAGE_KEY = 'sk-meal-prefs'

export const DEFAULT_MEAL_PREFS = { enabled: false, lead: '30', times: DEFAULT_MEAL_TIMES, dinnerNudge: false }

function withDefaults(meals) {
  return { ...DEFAULT_MEAL_PREFS, ...(meals ?? {}), times: { ...DEFAULT_MEAL_TIMES, ...(meals?.times ?? {}) } }
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

function deviceTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome' } catch { return 'Europe/Rome' }
}

// Meal planner settings: usual time of each meal, default reminder lead, meal
// reminders and the 17:00 "plan your dinner" nudge. They live in
// notificationPrefs/data.meals (read by the Functions); without an account
// (demo) in localStorage. Read-only callers (Cucina) only need `prefs`.
export function useMealPrefs(uid) {
  const [stored, setStored] = useState(() => (uid ? null : loadLocal()))

  useEffect(() => {
    if (uid === undefined) return
    if (!uid) { setStored(loadLocal()); return }
    return onSnapshot(doc(db, 'users', uid, 'notificationPrefs', 'data'),
      snap => setStored(snap.exists() ? (snap.data().meals ?? null) : null),
      () => {})
  }, [uid])

  const prefs = withDefaults(stored)

  // Resolves to true when saved; throws the Firestore error otherwise.
  const setMealPrefs = useCallback(async (patch) => {
    const next = withDefaults({ ...prefs, ...patch, times: { ...prefs.times, ...(patch.times ?? {}) } })
    if (!uid) {
      setStored(next)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return true
    }
    await setDoc(doc(db, 'users', uid, 'notificationPrefs', 'data'),
      { meals: next, tz: deviceTz(), updatedAt: Date.now() }, { merge: true })
    return true
  }, [uid, prefs.enabled, prefs.lead, prefs.dinnerNudge, JSON.stringify(prefs.times)]) // eslint-disable-line react-hooks/exhaustive-deps

  return { prefs, setMealPrefs }
}
