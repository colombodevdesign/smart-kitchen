import { useCallback } from 'react'
import { useSyncedDoc } from './useSyncedDoc.js'
import { SECTIONS } from '../data/initialInventory.js'
import { inventoryText } from '../utils/pantry.js'
import { analysisKey } from '../ai/analyzePantry.js'

const STORAGE_KEY = 'cucina-smart-v1'
const EMPTY_INVENTORY = { credenza: [], frigo: [], freezer: [] }

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

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return EMPTY_INVENTORY
}

// The sections always exist, even if a document from an older version lacks one.
function normalizeInventory(raw) {
  const out = { ...(raw ?? {}) }
  for (const s of SECTIONS) if (!Array.isArray(out[s])) out[s] = []
  return out
}

export function useInventory(uid) {
  // Synced without overwriting newer data from other devices: see useSyncedDoc.
  const [inventory, setInventory] = useSyncedDoc(uid, {
    path: ['inventory', 'data'],
    normalize: normalizeInventory,
    keep: SECTIONS,
    loadLocal: loadFromLocalStorage,
    saveLocal: (next) => localStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
  })
  const persist = useCallback((next) => setInventory(() => next), [setInventory])

  const addItem = useCallback((section, name, qty, expiryDateStr) => {
    const id = section[0] + Date.now()
    const expiresAt = expiryDateStr ? new Date(expiryDateStr + 'T23:59:59').getTime() : null
    setInventory(prev => {
      const next = {
        ...prev,
        [section]: [...prev[section], { id, name: name.trim(), qty: qty.trim(), urgent: false, added: Date.now(), expiresAt }],
      }
      return next
    })
  }, [setInventory])

  const addBatch = useCallback((items) => {
    const valid = (items ?? []).filter(it =>
      it && typeof it.name === 'string' && it.name.trim() && SECTIONS.includes(it.section)
    )
    if (valid.length === 0) return
    const base = Date.now()
    setInventory(prev => {
      const next = { ...prev }
      for (const s of SECTIONS) next[s] = [...prev[s]]
      valid.forEach((it, i) => {
        const ts = base + i
        next[it.section].push({
          id: it.section[0] + ts,
          name: it.name.trim(),
          qty: (it.qty ?? '').trim(),
          urgent: false,
          added: ts,
          expiresAt: null,
        })
      })
      return next
    })
  }, [setInventory])

  const removeItem = useCallback((section, id) => {
    setInventory(prev => {
      const next = { ...prev, [section]: prev[section].filter(i => i.id !== id) }
      return next
    })
  }, [setInventory])

  // Re-inserts an item removed a moment ago, keeping its id and timestamps (undo).
  const restoreItem = useCallback((section, item) => {
    setInventory(prev => {
      if (prev[section].some(i => i.id === item.id)) return prev
      const next = { ...prev, [section]: [...prev[section], item] }
      return next
    })
  }, [setInventory])

  const updateItem = useCallback((section, id, patch) => {
    setInventory(prev => {
      const next = { ...prev, [section]: prev[section].map(i => i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i) }
      return next
    })
  }, [setInventory])

  const moveItem = useCallback((fromSection, id, toSection) => {
    if (fromSection === toSection) return
    setInventory(prev => {
      const item = prev[fromSection].find(i => i.id === id)
      if (!item) return prev
      const next = {
        ...prev,
        [fromSection]: prev[fromSection].filter(i => i.id !== id),
        [toSection]: [...prev[toSection], { ...item, updatedAt: Date.now() }],
      }
      return next
    })
  }, [setInventory])

  // Opening records when, so the remaining shelf life can be estimated.
  const toggleUrgent = useCallback((section, id) => {
    setInventory(prev => {
      const next = {
        ...prev,
        [section]: prev[section].map(i => i.id === id
          ? { ...i, urgent: !i.urgent, openedAt: i.urgent ? null : Date.now(), updatedAt: Date.now() }
          : i),
      }
      return next
    })
  }, [setInventory])

  // Stores the AI metadata from usePantryAnalysis: { [id]: { key, name, category, food, openDays, freshDays } }.
  // A result is dropped if the item was renamed or moved meanwhile (its key no
  // longer matches); a category chosen by the user is kept.
  const applyAnalysis = useCallback((results) => {
    setInventory(prev => {
      let changed = false
      const next = { ...prev }
      for (const s of SECTIONS) {
        next[s] = (prev[s] ?? []).map(item => {
          const r = results[item.id]
          if (!r || r.key !== analysisKey(item, s)) return item
          changed = true
          const ai = item.ai?.manual ? { ...r, category: item.ai.category, manual: true } : r
          return { ...item, ai }
        })
      }
      if (!changed) return prev
      return next
    })
  }, [setInventory])

  // Category picked by hand in the item menu; '' goes back to the AI's choice
  // (clearing the key makes usePantryAnalysis analyse the item again).
  const setCategory = useCallback((section, id, category) => {
    setInventory(prev => {
      const next = {
        ...prev,
        [section]: prev[section].map(i => {
          if (i.id !== id) return i
          const { manual, ...rest } = i.ai ?? {}
          const ai = category ? { ...rest, category, manual: true } : { ...rest, key: '' }
          return { ...i, ai }
        }),
      }
      return next
    })
  }, [setInventory])

  const clearInventory = useCallback(async () => {
    persist(EMPTY_INVENTORY)
    localStorage.removeItem(STORAGE_KEY)
  }, [persist])

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
            let expiresAt = null
            if (fields[5]) {
              const ep = fields[5].split('/')
              if (ep.length === 3) {
                const parsed = new Date(+ep[2], +ep[1] - 1, +ep[0])
                if (!isNaN(parsed.getTime())) expiresAt = parsed.getTime()
              }
            }
            const id = section[0] + (Date.now() + counter++)
            newInventory[section].push({ id, name: name.trim(), qty: qty.trim(), urgent, added, expiresAt })
          }
          persist(newInventory)
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Errore lettura file'))
      reader.readAsText(file, 'utf-8')
    })
  }, [persist])

  const exportCSV = useCallback(() => {
    const rows = [['sezione', 'nome', 'quantità', 'aperto', 'aggiunto il', 'scade il']]
    for (const [section, items] of Object.entries(inventory)) {
      for (const item of items) {
        rows.push([
          section,
          item.name,
          item.qty || '',
          item.urgent ? 'sì' : 'no',
          new Date(item.added).toLocaleDateString('it-IT'),
          item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('it-IT') : '',
        ])
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cucina-smart-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [inventory])

  const getInventoryText = useCallback(() => inventoryText(inventory), [inventory])

  return {
    inventory,
    addItem,
    addBatch,
    removeItem,
    restoreItem,
    updateItem,
    moveItem,
    toggleUrgent,
    applyAnalysis,
    setCategory,
    exportCSV,
    importCSV,
    clearInventory,
    getInventoryText,
  }
}
