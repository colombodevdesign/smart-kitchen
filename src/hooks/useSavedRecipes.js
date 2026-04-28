import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cucina-ricette-salvate-v1'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}

export function useSavedRecipes() {
  const [recipes, setRecipes] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes)) } catch {}
  }, [recipes])

  const addRecipes = useCallback((items) => {
    const ts = Date.now()
    setRecipes(prev => [
      ...prev,
      ...items.map((r, i) => ({ id: `${ts}-${i}`, ...r, savedAt: ts })),
    ])
  }, [])

  const removeRecipe = useCallback((id) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
  }, [])

  return { recipes, addRecipes, removeRecipe }
}
