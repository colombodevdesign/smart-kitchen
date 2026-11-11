import { useCallback } from 'react'
import { useSyncedDoc } from './useSyncedDoc.js'

const STORAGE_KEY = 'cucina-spesa-salvata-v1'

function normalizeItem(raw) {
  const savedAt = raw.savedAt ?? Date.now()
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category ?? 'Generale',
    qty: raw.qty ?? '',
    savedAt,
    updatedAt: raw.updatedAt ?? savedAt,
    checked: raw.checked ?? false,
    source: raw.source ?? 'ai',
  }
}

function loadFromLocalStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
    return raw.map(normalizeItem)
  } catch { return [] }
}

export function useSavedShopping(uid) {
  // Synced without overwriting newer data from other devices: see useSyncedDoc.
  const [stored, updateDoc] = useSyncedDoc(uid, {
    path: ['savedShopping', 'data'],
    normalize: raw => ({ items: (Array.isArray(raw?.items) ? raw.items : []).map(normalizeItem) }),
    keep: ['items'],
    loadLocal: () => ({ items: loadFromLocalStorage() }),
    saveLocal: (next) => localStorage.setItem(STORAGE_KEY, JSON.stringify(next.items)),
  })
  const items = stored.items
  // Same contract as a state setter over the list: fn(prev) => next.
  const setItems = useCallback(fn => updateDoc(d => {
    const next = fn(d.items)
    return next === d.items ? d : { ...d, items: next }
  }), [updateDoc])

  const addItems = useCallback((newItems) => {
    const ts = Date.now()
    setItems(prev => {
      const next = [
        ...prev,
        ...newItems.map((item, i) => ({
          id: `${ts}-${i}`,
          name: item.name,
          category: item.category ?? 'Generale',
          qty: item.qty ?? '',
          savedAt: ts,
          updatedAt: ts,
          checked: false,
          source: item.source ?? 'ai',
        })),
      ]
      return next
    })
  }, [])

  const addItem = useCallback(({ name, category = 'Generale', qty = '', source = 'manual' }) => {
    const trimmed = name?.trim()
    if (!trimmed) return
    const ts = Date.now()
    setItems(prev => {
      const next = [
        ...prev,
        {
          id: `m-${ts}`,
          name: trimmed,
          category: category?.trim() || 'Generale',
          qty: qty?.trim() ?? '',
          savedAt: ts,
          updatedAt: ts,
          checked: false,
          source,
        },
      ]
      return next
    })
  }, [])

  const updateItem = useCallback((id, patch) => {
    const allowed = {}
    if (patch.name !== undefined)     allowed.name = patch.name.trim()
    if (patch.qty !== undefined)      allowed.qty = patch.qty.trim()
    if (patch.category !== undefined) allowed.category = patch.category.trim() || 'Generale'
    if (Object.keys(allowed).length === 0) return
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...allowed, updatedAt: Date.now() } : i)
      return next
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      return next
    })
  }, [])

  const toggleChecked = useCallback((id) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      return next
    })
  }, [])

  const clearChecked = useCallback(() => {
    setItems(prev => {
      const next = prev.filter(i => !i.checked)
      return next
    })
  }, [])

  return { items, addItems, addItem, updateItem, removeItem, toggleChecked, clearChecked }
}
