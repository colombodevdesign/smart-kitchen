import { useState, useEffect, useCallback } from 'react'
import { INITIAL_INVENTORY } from '../data/initialInventory.js'

const STORAGE_KEY = 'cucina-smart-v1'
const API_KEY_STORAGE = 'cucina-smart-apikey'

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return JSON.parse(JSON.stringify(INITIAL_INVENTORY))
}

function loadApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || ''
}

export function useInventory() {
  const [inventory, setInventory] = useState(loadInventory)
  const [apiKey, setApiKeyState] = useState(loadApiKey)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory))
    } catch {}
  }, [inventory])

  const saveApiKey = useCallback((key) => {
    setApiKeyState(key)
    localStorage.setItem(API_KEY_STORAGE, key)
  }, [])

  const addItem = useCallback((section, name, qty) => {
    const id = section[0] + Date.now()
    setInventory(prev => ({
      ...prev,
      [section]: [...prev[section], { id, name: name.trim(), qty: qty.trim(), urgent: false, added: Date.now() }],
    }))
  }, [])

  const removeItem = useCallback((section, id) => {
    setInventory(prev => ({
      ...prev,
      [section]: prev[section].filter(i => i.id !== id),
    }))
  }, [])

  const updateItem = useCallback((section, id, patch) => {
    setInventory(prev => ({
      ...prev,
      [section]: prev[section].map(i => i.id === id ? { ...i, ...patch } : i),
    }))
  }, [])

  const toggleUrgent = useCallback((section, id) => {
    setInventory(prev => ({
      ...prev,
      [section]: prev[section].map(i => i.id === id ? { ...i, urgent: !i.urgent } : i),
    }))
  }, [])

  const exportCSV = useCallback(() => {
    const rows = [['sezione', 'nome', 'quantità', 'da usare presto', 'aggiunto il']]
    for (const [section, items] of Object.entries(inventory)) {
      for (const item of items) {
        rows.push([
          section,
          item.name,
          item.qty || '',
          item.urgent ? 'sì' : 'no',
          new Date(item.added).toLocaleDateString('it-IT'),
        ])
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cucina-smart-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [inventory])

  const getInventoryText = useCallback(() => {
    return Object.entries(inventory)
      .flatMap(([section, items]) =>
        items.map(i =>
          `${section[0].toUpperCase() + section.slice(1)}: ${i.name}${i.qty ? ' (' + i.qty + ')' : ''}${i.urgent ? ' [DA USARE PRESTO]' : ''}`
        )
      ).join('\n')
  }, [inventory])

  return {
    inventory,
    apiKey,
    saveApiKey,
    addItem,
    removeItem,
    updateItem,
    toggleUrgent,
    exportCSV,
    getInventoryText,
  }
}
