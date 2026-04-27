import { useState, useEffect, useCallback } from 'react'
import { INITIAL_INVENTORY } from '../data/initialInventory.js'

const STORAGE_KEY = 'cucina-smart-v1'

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return JSON.parse(JSON.stringify(INITIAL_INVENTORY))
}

export function useInventory() {
  const [inventory, setInventory] = useState(loadInventory)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory))
    } catch {}
  }, [inventory])

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

  const importCSV = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          let text = e.target.result
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
          const lines = text.split(/\r?\n/).filter(l => l.trim())
          if (lines.length < 2) throw new Error('File CSV vuoto o non valido')
          const newInventory = { credenza: [], frigo: [], freezer: [] }
          let counter = 0
          for (const line of lines.slice(1)) {
            const fields = parseCSVLine(line)
            if (fields.length < 4) continue
            const [section, name, qty, urgentStr, dateStr] = fields
            if (!Object.prototype.hasOwnProperty.call(newInventory, section)) continue
            const urgent = urgentStr === 'sì'
            let added = Date.now()
            if (dateStr) {
              const parts = dateStr.split('/')
              if (parts.length === 3) {
                const parsed = new Date(+parts[2], +parts[1] - 1, +parts[0])
                if (!isNaN(parsed.getTime())) added = parsed.getTime()
              }
            }
            const id = section[0] + (Date.now() + counter++)
            newInventory[section].push({ id, name: name.trim(), qty: qty.trim(), urgent, added })
          }
          setInventory(newInventory)
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Errore lettura file'))
      reader.readAsText(file, 'utf-8')
    })
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
    addItem,
    removeItem,
    updateItem,
    toggleUrgent,
    exportCSV,
    importCSV,
    getInventoryText,
  }
}
