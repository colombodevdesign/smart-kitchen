import { useState, useCallback, useRef } from 'react'
import { GoogleGenAI } from '@google/genai'
import { getSeasonal, getMonthName } from '../data/seasonal'

const CACHE_KEY = 'cucina-ai-cache-v1'
const GEMINI_API_KEY_STORAGE = 'gemini-api-key'
const MODEL_NAME = 'gemini-3-flash-preview'

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

function getApiKey() {
  const key = localStorage.getItem(GEMINI_API_KEY_STORAGE)
  if (!key) throw new Error('API key non configurata. Vai in Impostazioni per inserirla.')
  return key
}

function parseError(e) {
  const msg = e.message || ''
  if (msg.includes('429') || msg.toLowerCase().includes('quota'))
    return 'Quota Gemini esaurita. Riprova tra qualche minuto o verifica il piano di fatturazione.'
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key'))
    return 'API key non valida. Controlla le Impostazioni.'
  return msg || 'Errore di connessione.'
}

export function useAI(getInventoryText) {
  const [messages, setMessages] = useState([])   // [{role:'user'|'model', text}]
  const [streaming, setStreaming] = useState('')  // testo del chunk corrente
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  // storia completa in formato API per il multi-turn
  const apiHistoryRef = useRef([])
  const systemPromptRef = useRef('')

  const runStream = useCallback(async (apiKey, contents, onChunk) => {
    const ai = new GoogleGenAI({ apiKey })
    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents,
      config: { systemInstruction: systemPromptRef.current },
    })
    let full = ''
    for await (const chunk of stream) {
      const text = chunk.text
      if (text) { full += text; onChunk(text) }
    }
    return full
  }, [])

  const call = useCallback(async (systemPrompt, userPrompt, cacheType, cacheHash) => {
    const cache = loadCache()
    if (cache[cacheType]?.hash === cacheHash) {
      setMessages([{ role: 'model', text: cache[cacheType].output }])
      setCached(true)
      return
    }

    systemPromptRef.current = systemPrompt
    apiHistoryRef.current = []
    setMessages([])
    setCached(false)
    setLoading(true)
    setStreaming('')
    setError('')

    try {
      const apiKey = getApiKey()
      const contents = [{ role: 'user', parts: [{ text: userPrompt }] }]
      const fullOutput = await runStream(apiKey, contents, text =>
        setStreaming(prev => prev + text)
      )
      apiHistoryRef.current = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      setMessages([{ role: 'model', text: fullOutput }])
      setStreaming('')
      if (fullOutput) saveCache({ ...loadCache(), [cacheType]: { hash: cacheHash, output: fullOutput } })
    } catch (e) {
      setError(parseError(e))
    } finally {
      setLoading(false)
    }
  }, [runStream])

  const sendFollowUp = useCallback(async (userText) => {
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setLoading(true)
    setStreaming('')
    setError('')

    try {
      const apiKey = getApiKey()
      const contents = [...apiHistoryRef.current, { role: 'user', parts: [{ text: userText }] }]
      const fullOutput = await runStream(apiKey, contents, text =>
        setStreaming(prev => prev + text)
      )
      apiHistoryRef.current = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      setMessages(prev => [...prev, { role: 'model', text: fullOutput }])
      setStreaming('')
    } catch (e) {
      setError(parseError(e))
    } finally {
      setLoading(false)
    }
  }, [runStream])

  const fetchRicette = useCallback(() => {
    const inventoryText = getInventoryText()
    const seasonal = getSeasonal().join(', ')
    const month = getMonthName()
    const cacheHash = hashString('ricette' + new Date().getMonth() + inventoryText)
    call(
      'Sei un cuoco italiano pratico. Rispondi in italiano. Usa ## per titoli ricette e - per liste.',
      `Dispensa:\n${inventoryText}\n\nSuggerisci 3 ricette fattibili con questi ingredienti (${month}, Lombardia). Priorità a [DA USARE PRESTO]. Stagionale del mese: ${seasonal}.\n\nPer ogni ricetta: ## nome, ingredienti usati, 3-4 passi, tempo stimato.`,
      'ricette', cacheHash
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
      'spesa', cacheHash
    )
  }, [call, getInventoryText])

  return {
    loading, messages, streaming, error, cached,
    fetchRicette, fetchSpesa, sendFollowUp,
    clearOutput: () => {
      setMessages([])
      setStreaming('')
      setCached(false)
      apiHistoryRef.current = []
    },
  }
}
