import { useState, useCallback } from 'react'
import { getSeasonal, getMonthName } from '../data/seasonal'

const CACHE_KEY = 'cucina-ai-cache-v1'

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return h.toString(36)
}

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) ?? {} } catch { return {} }
}

function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch {}
}

export function useAI(getInventoryText) {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  const call = useCallback(async (systemPrompt, userPrompt, cacheType, cacheHash) => {
    const cache = loadCache()
    if (cache[cacheType]?.hash === cacheHash) {
      setOutput(cache[cacheType].output)
      setCached(true)
      return
    }

    setCached(false)
    setLoading(true)
    setOutput('')
    setError('')

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error('Quota Gemini esaurita. Riprova tra qualche minuto o verifica il piano di fatturazione.')
        throw new Error(err?.error?.message || `Errore API: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullOutput = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const evt = JSON.parse(data)
            const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              fullOutput += text
              setOutput(prev => prev + text)
            }
          } catch {}
        }
      }

      if (fullOutput) {
        saveCache({ ...loadCache(), [cacheType]: { hash: cacheHash, output: fullOutput } })
      }
    } catch (e) {
      setError(e.message || 'Errore di connessione.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRicette = useCallback(() => {
    const inventoryText = getInventoryText()
    const seasonal = getSeasonal().join(', ')
    const month = getMonthName()
    const cacheHash = hashString('ricette' + new Date().getMonth() + inventoryText)
    call(
      'Sei un cuoco italiano pratico. Rispondi in italiano. Usa ## per titoli ricette e - per liste.',
      `Dispensa:\n${inventoryText}\n\nSuggerisci 3 ricette fattibili con questi ingredienti (${month}, Lombardia). Priorità a [DA USARE PRESTO]. Stagionale del mese: ${seasonal}.\n\nPer ogni ricetta: ## nome, ingredienti usati, 3-4 passi, tempo stimato.`,
      'ricette',
      cacheHash
    )
  }, [call, getInventoryText])

  const fetchSpesa = useCallback(() => {
    const inventoryText = getInventoryText()
    const seasonal = getSeasonal().join(', ')
    const month = getMonthName()
    const cacheHash = hashString('spesa' + new Date().getMonth() + inventoryText)
    call(
      'Sei un esperto di spesa italiana stagionale. Rispondi in italiano. Usa ## per categorie e - per liste.',
      `Dispensa:\n${inventoryText}\n\nCrea lista della spesa per 7 giorni (${month}, Lombardia). Non duplicare ciò che ho già. Stagionale del mese: ${seasonal}.\n\nOrganizza per categoria.`,
      'spesa',
      cacheHash
    )
  }, [call, getInventoryText])

  return {
    loading, output, error, cached,
    fetchRicette, fetchSpesa,
    clearOutput: () => { setOutput(''); setCached(false) },
  }
}
