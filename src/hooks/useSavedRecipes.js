import { useCallback } from 'react'
import { useSyncedDoc } from './useSyncedDoc.js'
import { extractIngredients } from '../ai/extractIngredients.js'
import { getApiKey } from '../utils/apiKey.js'

const STORAGE_KEY = 'cucina-ricette-salvate-v1'

function loadFromLocalStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}

export function useSavedRecipes(uid) {
  // Synced without overwriting newer data from other devices: see useSyncedDoc.
  const [stored, updateDoc] = useSyncedDoc(uid, {
    path: ['savedRecipes', 'data'],
    normalize: raw => ({ items: Array.isArray(raw?.items) ? raw.items : [] }),
    keep: ['items'],
    loadLocal: () => ({ items: loadFromLocalStorage() }),
    saveLocal: (next) => localStorage.setItem(STORAGE_KEY, JSON.stringify(next.items)),
  })
  const recipes = stored.items
  // Same contract as a state setter over the list: fn(prev) => next.
  const setRecipes = useCallback(fn => updateDoc(d => {
    const next = fn(d.items)
    return next === d.items ? d : { ...d, items: next }
  }), [updateDoc])

  const updateRecipe = useCallback((id, patch) => {
    setRecipes(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r)
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
      return next
    })
    analyzeIngredients(created)
  }, [analyzeIngredients])

  const removeRecipe = useCallback((id) => {
    setRecipes(prev => {
      const next = prev.filter(r => r.id !== id)
      return next
    })
  }, [])

  return { recipes, addRecipes, removeRecipe, updateRecipe, analyzeIngredients }
}
