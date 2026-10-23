import { useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../data/initialInventory.js'
import { analysisKey, analyzePantry } from '../ai/analyzePantry.js'
import { getApiKey } from '../utils/apiKey.js'

const DEBOUNCE_MS = 1500
const CHUNK = 50

// Analyses in the background every pantry item whose item.ai is missing or stale
// (see analysisKey) and stores the result with applyAnalysis. Optional, like the
// ingredient extraction of saved recipes: without an API key, offline or on any
// error the items simply stay unanalysed and the app falls back to defaults.
// An item that fails is not retried until the app is reloaded.
export function usePantryAnalysis(inventory, applyAnalysis) {
  const inFlight = useRef(new Set())
  const failed = useRef(new Set())
  const keyOk = !!getApiKey()

  // Re-check when the tab comes back or the connection returns.
  const [wake, setWake] = useState(0)
  useEffect(() => {
    const bump = () => { if (document.visibilityState === 'visible') setWake(n => n + 1) }
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('online', bump)
    return () => {
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('online', bump)
    }
  }, [])

  useEffect(() => {
    if (!keyOk || !inventory) return
    const pending = []
    for (const section of SECTIONS) {
      for (const item of inventory[section] ?? []) {
        const key = analysisKey(item, section)
        const tag = `${item.id}|${key}`
        if (item.ai?.key === key || inFlight.current.has(tag) || failed.current.has(tag)) continue
        pending.push({ id: item.id, name: item.name, qty: item.qty, section, key, tag })
      }
    }
    if (pending.length === 0) return

    const timer = setTimeout(async () => {
      const apiKey = getApiKey()
      if (!apiKey || navigator.onLine === false || document.visibilityState === 'hidden') return
      // All of them at once: applying the first chunk re-runs this effect, which
      // must not queue the later chunks a second time.
      pending.forEach(e => inFlight.current.add(e.tag))
      for (let i = 0; i < pending.length; i += CHUNK) {
        const chunk = pending.slice(i, i + CHUNK)
        try {
          const byId = await analyzePantry(apiKey, chunk)
          const results = {}
          for (const e of chunk) {
            if (byId[e.id]) results[e.id] = { ...byId[e.id], key: e.key }
            else failed.current.add(e.tag)
          }
          applyAnalysis(results)
        } catch (err) {
          console.warn('Analisi della dispensa non riuscita', err)
          chunk.forEach(e => failed.current.add(e.tag))
        } finally {
          chunk.forEach(e => inFlight.current.delete(e.tag))
        }
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inventory, applyAnalysis, keyOk, wake])
}
