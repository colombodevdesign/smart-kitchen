import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { extractIngredients } from '../ai/extractIngredients.js'
import { getApiKey } from '../utils/apiKey.js'

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
    if (uid === undefined) return // auth still resolving: don't touch state yet
    if (!uid) {
      setRecipes(loadFromLocalStorage())
      return
    }
    const ref = firestoreRef(uid)
    // Pending-write snapshots are skipped once the state is loaded (see below)
    let loaded = false
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        if (!snap.metadata.hasPendingWrites || !loaded) {
          loaded = true
          setRecipes(snap.data().items ?? [])
        }
      } else if (!snap.metadata.fromCache) {
        loaded = true
        const local = loadFromLocalStorage()
        setDoc(ref, { items: local }).catch(console.error)
        setRecipes(local)
      }
    })
    return unsub
  }, [uid])

  useEffect(() => {
    if (uid || uid === undefined) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes)) } catch {}
  }, [recipes, uid])

  const persist = (next) => {
    if (uidRef.current) setDoc(firestoreRef(uidRef.current), { items: next }).catch(console.error)
  }

  const updateRecipe = useCallback((id, patch) => {
    setRecipes(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
      persist(next)
      return next
    })
  }, [])

  // Reads ingredients with Gemini (one batched call) and stores them on the
  // recipes. Optional: without an API key, offline or on any error the recipes
  // simply stay without an ingredient list ("Analizza ingredienti" retries).
  const analyzeIngredients = useCallback(async (list) => {
    const apiKey = getApiKey()
    if (!apiKey || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false
    try {
      const byId = await extractIngredients(apiKey, list.map(r => ({ id: r.id, content: r.content })))
      let any = false
      for (const [id, ingredients] of Object.entries(byId)) {
        if (ingredients.length > 0) { updateRecipe(id, { ingredients }); any = true }
      }
      return any
    } catch (e) {
      console.warn('Estrazione ingredienti non riuscita', e)
      return false
    }
  }, [updateRecipe])

  const addRecipes = useCallback((items) => {
    const ts = Date.now()
    const created = items.map((r, i) => ({ id: `${ts}-${i}`, ...r, savedAt: ts }))
    setRecipes(prev => {
      const next = [...prev, ...created]
      persist(next)
      return next
    })
    analyzeIngredients(created)
  }, [analyzeIngredients])

  const removeRecipe = useCallback((id) => {
    setRecipes(prev => {
      const next = prev.filter(r => r.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { recipes, addRecipes, removeRecipe, updateRecipe, analyzeIngredients }
}
