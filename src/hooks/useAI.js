import { useState, useCallback, useRef } from 'react'
import { GoogleGenAI } from '@google/genai'
import { getSeasonal, getMonthName } from '../data/seasonal'
import { MODEL_NAME, MODEL_PRO, PRO_CONFIG } from '../ai/model.js'
import { PROMPT_VERSION, ricettePrompts, spesaPrompts, stagionePrompts } from '../ai/prompts.js'
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

// Recipes (and their follow-ups) get the stronger model; the shopping list stays on Lite.
const STRONG = ['ricette', 'stagione']

// `session: false` keeps nothing between launches (the seasonal-recipes modal
// starts fresh each time it opens).
export function useAI(getInventoryText, name, { session = true } = {}) {
  const saved = session ? loadSession(name) : null
  const strong = STRONG.includes(name)
  const model = strong ? MODEL_PRO : MODEL_NAME

  const [messages, setMessages] = useState(saved?.messages ?? [])
  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [cached, setCached] = useState(false)

  const apiHistoryRef = useRef(saved?.apiHistory ?? [])
  const systemPromptRef = useRef(saved?.systemPrompt ?? '')
  // Bumped by every request and by clearOutput: a superseded stream stops updating state.
  const runRef = useRef(0)

  const runStream = useCallback(async (apiKey, contents, onChunk) => {
    const ai = new GoogleGenAI({ apiKey })
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: { ...(strong ? PRO_CONFIG : {}), systemInstruction: systemPromptRef.current },
    })
    let full = ''
    for await (const chunk of stream) {
      const text = chunk.text
      if (text) { full += text; onChunk(text) }
    }
    return full
  }, [model, strong])

  const call = useCallback(async (systemPrompt, userPrompt, cacheType, cacheHash) => {
    const run = ++runRef.current
    const cache = loadCache()
    if (cache[cacheType]?.hash === cacheHash) {
      setMessages([{ role: 'model', text: cache[cacheType].output }])
      setStreaming('')
      setLoading(false)
      setError('')
      setErrorCode('')
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
      const fullOutput = await runStream(apiKey, contents, text => {
        if (runRef.current === run) setStreaming(prev => prev + text)
      })
      if (fullOutput) saveCache({ ...loadCache(), [cacheType]: { hash: cacheHash, output: fullOutput } })
      if (runRef.current !== run) return
      const newHistory = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      apiHistoryRef.current = newHistory
      setMessages([{ role: 'model', text: fullOutput }])
      setStreaming('')
      if (fullOutput && session) saveSession(name, [{ role: 'model', text: fullOutput }], newHistory, systemPrompt)
    } catch (e) {
      if (runRef.current !== run) return
      const { code, message } = classifyError(e)
      setError(message)
      setErrorCode(code)
    } finally {
      if (runRef.current === run) setLoading(false)
    }
  }, [runStream, name, session])

  const sendFollowUp = useCallback(async (userText) => {
    const run = ++runRef.current
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
      const fullOutput = await runStream(apiKey, contents, text => {
        if (runRef.current === run) setStreaming(prev => prev + text)
      })
      if (runRef.current !== run) return
      const newHistory = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      apiHistoryRef.current = newHistory
      setMessages(prev => {
        const updated = [...prev, { role: 'model', text: fullOutput }]
        if (session) saveSession(name, updated, newHistory, systemPromptRef.current)
        return updated
      })
      setStreaming('')
    } catch (e) {
      if (runRef.current !== run) return
      const { code, message } = classifyError(e)
      setError(message)
      setErrorCode(code)
    } finally {
      if (runRef.current === run) setLoading(false)
    }
  }, [runStream, name, session])

  const fetchRicette = useCallback(() => {
    const inventoryText = getInventoryText()
    const prompts = ricettePrompts({
      inventoryText,
      seasonal: getSeasonal().join(', '),
      month: getMonthName(),
    })
    const cacheHash = hashString(PROMPT_VERSION + model + 'ricette' + new Date().getMonth() + inventoryText)
    call(prompts.system, prompts.user, 'ricette', cacheHash)
  }, [call, getInventoryText, model])

  const fetchSpesa = useCallback(() => {
    const inventoryText = getInventoryText()
    const prompts = spesaPrompts({
      inventoryText,
      seasonal: getSeasonal().join(', '),
      month: getMonthName(),
    })
    const cacheHash = hashString(PROMPT_VERSION + model + 'spesa' + new Date().getMonth() + inventoryText)
    call(prompts.system, prompts.user, 'spesa', cacheHash)
  }, [call, getInventoryText, model])

  // Per ingredient, the first answer has its own cache slot (reopening is free);
  // "Altre idee" (`exclude` = titles already shown) uses a second one.
  const fetchStagione = useCallback((ingredient, exclude = []) => {
    const inventoryText = getInventoryText()
    const prompts = stagionePrompts({ ingredient, inventoryText, month: getMonthName(), exclude })
    const cacheHash = hashString(PROMPT_VERSION + model + 'stagione' + ingredient + exclude.join('|') + new Date().getMonth() + inventoryText)
    call(prompts.system, prompts.user, `stagione:${ingredient}${exclude.length ? ':altre' : ''}`, cacheHash)
  }, [call, getInventoryText, model])

  // Drops the conversation and any request still running.
  const clearOutput = useCallback(() => {
    runRef.current++
    setMessages([])
    setStreaming('')
    setLoading(false)
    setError('')
    setErrorCode('')
    setCached(false)
    apiHistoryRef.current = []
    clearSession(name)
  }, [name])

  return {
    loading, messages, streaming, error, errorCode, cached,
    fetchRicette, fetchSpesa, fetchStagione, sendFollowUp, clearOutput,
  }
}
