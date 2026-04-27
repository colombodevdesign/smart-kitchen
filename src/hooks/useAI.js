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

function sessionKey(name) { return `cucina-session-${name}-v1` }

function loadSession(name) {
  try { return JSON.parse(localStorage.getItem(sessionKey(name))) ?? null } catch { return null }
}

function saveSession(name, messages, apiHistory, systemPrompt) {
  try {
    localStorage.setItem(sessionKey(name), JSON.stringify({ messages, apiHistory, systemPrompt }))
  } catch {}
}

function clearSession(name) {
  try { localStorage.removeItem(sessionKey(name)) } catch {}
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

export function useAI(getInventoryText, name) {
  const saved = loadSession(name)

  const [messages, setMessages] = useState(saved?.messages ?? [])
  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  const apiHistoryRef = useRef(saved?.apiHistory ?? [])
  const systemPromptRef = useRef(saved?.systemPrompt ?? '')

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
      const newHistory = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      apiHistoryRef.current = newHistory
      setMessages([{ role: 'model', text: fullOutput }])
      setStreaming('')
      if (fullOutput) {
        saveCache({ ...loadCache(), [cacheType]: { hash: cacheHash, output: fullOutput } })
        saveSession(name, [{ role: 'model', text: fullOutput }], newHistory, systemPrompt)
      }
    } catch (e) {
      setError(parseError(e))
    } finally {
      setLoading(false)
    }
  }, [runStream, name])

  const sendFollowUp = useCallback(async (userText) => {
    const newMessages = (prev) => [...prev, { role: 'user', text: userText }]
    setMessages(newMessages)
    setLoading(true)
    setStreaming('')
    setError('')

    try {
      const apiKey = getApiKey()
      const contents = [...apiHistoryRef.current, { role: 'user', parts: [{ text: userText }] }]
      const fullOutput = await runStream(apiKey, contents, text =>
        setStreaming(prev => prev + text)
      )
      const newHistory = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      apiHistoryRef.current = newHistory
      setMessages(prev => {
        const updated = [...prev, { role: 'model', text: fullOutput }]
        saveSession(name, updated, newHistory, systemPromptRef.current)
        return updated
      })
      setStreaming('')
    } catch (e) {
      setError(parseError(e))
    } finally {
      setLoading(false)
    }
  }, [runStream, name])

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
      clearSession(name)
    },
  }
}
