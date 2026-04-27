import { useState, useCallback } from 'react'
import { GoogleGenAI } from '@google/genai'
import { getSeasonal, getMonthName } from '../data/seasonal'

const CACHE_KEY = 'cucina-ai-cache-v1'
const GEMINI_API_KEY_STORAGE = 'gemini-api-key'
const MODEL_NAME = 'gemini-2.5-flash'

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
      const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE)
      if (!apiKey) throw new Error('API key non configurata. Vai in Impostazioni per inserirla.')

      const ai = new GoogleGenAI({ apiKey })

      const stream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: userPrompt,
        config: { systemInstruction: systemPrompt },
      })

      let fullOutput = ''
      for await (const chunk of stream) {
        const text = chunk.text
        if (text) {
          fullOutput += text
          setOutput(prev => prev + text)
        }
      }

      if (fullOutput) {
        saveCache({ ...loadCache(), [cacheType]: { hash: cacheHash, output: fullOutput } })
      }
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        setError('Quota Gemini esaurita. Riprova tra qualche minuto o verifica il piano di fatturazione.')
      } else if (msg.includes('API_KEY_INVALID') || msg.includes('API key')) {
        setError('API key non valida. Controlla le Impostazioni.')
      } else {
        setError(msg || 'Errore di connessione.')
      }
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
