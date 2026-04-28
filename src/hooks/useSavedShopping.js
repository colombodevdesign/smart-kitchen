import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cucina-spesa-salvata-v1'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] } catch { return [] }
}

export function useSavedShopping() {
  const [items, setItems] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items])

  const addItems = useCallback((newItems) => {
    const ts = Date.now()
    setItems(prev => [
      ...prev,
      ...newItems.map((item, i) => ({ id: `${ts}-${i}`, ...item, savedAt: ts, checked: false })),
    ])
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const toggleChecked = useCallback((id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }, [])

  const clearChecked = useCallback(() => {
    setItems(prev => prev.filter(i => !i.checked))
  }, [])

  return { items, addItems, removeItem, toggleChecked, clearChecked }
}
