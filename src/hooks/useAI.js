import { useState, useCallback, useRef } from 'react'
import { GoogleGenAI } from '@google/genai'
import { getSeasonal, getMonthName } from '../data/seasonal'
import { MODEL_NAME } from '../ai/model.js'
import { PROMPT_VERSION, ricettePrompts, spesaPrompts } from '../ai/prompts.js'
import { AIError, classifyError } from '../ai/errors.js'
import { getApiKey as readApiKey } from '../utils/apiKey.js'

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
  const key = readApiKey()
  if (!key) throw new AIError('no-key', 'API key non configurata. Impostala in Tu.')
  return key
}

export function useAI(getInventoryText, name) {
  const saved = loadSession(name)

  const [messages, setMessages] = useState(saved?.messages ?? [])
  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
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
    setErrorCode('')

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AIError('offline', 'Sei offline. Riprova quando torni online.')
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
      const { code, message } = classifyError(e)
      setError(message)
      setErrorCode(code)
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
    setErrorCode('')

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AIError('offline', 'Sei offline. Riprova quando torni online.')
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
      const { code, message } = classifyError(e)
      setError(message)
      setErrorCode(code)
    } finally {
      setLoading(false)
    }
  }, [runStream, name])

  const fetchRicette = useCallback(() => {
    const inventoryText = getInventoryText()
    const prompts = ricettePrompts({
      inventoryText,
      seasonal: getSeasonal().join(', '),
      month: getMonthName(),
    })
    const cacheHash = hashString(PROMPT_VERSION + 'ricette' + new Date().getMonth() + inventoryText)
    call(prompts.system, prompts.user, 'ricette', cacheHash)
  }, [call, getInventoryText])

  const fetchSpesa = useCallback(() => {
    const inventoryText = getInventoryText()
    const prompts = spesaPrompts({
      inventoryText,
      seasonal: getSeasonal().join(', '),
      month: getMonthName(),
    })
    const cacheHash = hashString(PROMPT_VERSION + 'spesa' + new Date().getMonth() + inventoryText)
    call(prompts.system, prompts.user, 'spesa', cacheHash)
  }, [call, getInventoryText])

  return {
    loading, messages, streaming, error, errorCode, cached,
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
