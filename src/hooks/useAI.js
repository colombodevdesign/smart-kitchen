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

// `inventoryText`: the pantry the conversation last saw, so a follow-up can tell
// the model what changed since.
function saveSession(name, messages, apiHistory, systemPrompt, inventoryText) {
  try {
    localStorage.setItem(sessionKey(name), JSON.stringify({ messages, apiHistory, systemPrompt, inventoryText }))
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
// starts fresh each time it opens). `preferences`: the user's food preferences,
// part of every prompt and of the cache hash.
export function useAI(getInventoryText, name, { session = true, preferences = [] } = {}) {
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
  const inventoryRef = useRef(saved?.inventoryText ?? '')
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

  const call = useCallback(async (systemPrompt, userPrompt, cacheType, cacheHash, inventoryText) => {
    const run = ++runRef.current
    const cache = loadCache()
    if (cache[cacheType]?.hash === cacheHash) {
      // A follow-up continues from the cached answer as if it had just been generated.
      const output = cache[cacheType].output
      const history = [{ role: 'user', parts: [{ text: userPrompt }] }, { role: 'model', parts: [{ text: output }] }]
      systemPromptRef.current = systemPrompt
      apiHistoryRef.current = history
      inventoryRef.current = inventoryText
      if (session) saveSession(name, [{ role: 'model', text: output }], history, systemPrompt, inventoryText)
      setMessages([{ role: 'model', text: output }])
      setStreaming('')
      setLoading(false)
      setError('')
      setErrorCode('')
      setCached(true)
      return
    }

    systemPromptRef.current = systemPrompt
    apiHistoryRef.current = []
    inventoryRef.current = inventoryText
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
      if (fullOutput && session) saveSession(name, [{ role: 'model', text: fullOutput }], newHistory, systemPrompt, inventoryText)
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
      // The pantry may have changed since the conversation started: say so, with
      // the current list, otherwise the model keeps answering about the old one.
      const inventoryText = getInventoryText()
      let prompt = userText
      if (inventoryRef.current && inventoryText !== inventoryRef.current) {
        prompt = `[Dispensa aggiornata, usa questa d'ora in poi:\n${inventoryText}]\n\n${userText}`
        inventoryRef.current = inventoryText
      }
      const contents = [...apiHistoryRef.current, { role: 'user', parts: [{ text: prompt }] }]
      const fullOutput = await runStream(apiKey, contents, text => {
        if (runRef.current === run) setStreaming(prev => prev + text)
      })
      if (runRef.current !== run) return
      const newHistory = [...contents, { role: 'model', parts: [{ text: fullOutput }] }]
      apiHistoryRef.current = newHistory
      setMessages(prev => {
        const updated = [...prev, { role: 'model', text: fullOutput }]
        if (session) saveSession(name, updated, newHistory, systemPromptRef.current, inventoryRef.current)
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
  }, [runStream, name, session, getInventoryText])

  const prefsHash = preferences.map(p => `${p.kind}:${p.text}`).join('|')

  const fetchRicette = useCallback(() => {
    const inventoryText = getInventoryText()
    const prompts = ricettePrompts({
      inventoryText,
      seasonal: getSeasonal().join(', '),
      month: getMonthName(),
      preferences,
    })
    const cacheHash = hashString(PROMPT_VERSION + model + 'ricette' + new Date().getMonth() + inventoryText + prefsHash)
    call(prompts.system, prompts.user, 'ricette', cacheHash, inventoryText)
  }, [call, getInventoryText, model, preferences, prefsHash])

  const fetchSpesa = useCallback(() => {
    const inventoryText = getInventoryText()
    const prompts = spesaPrompts({
      inventoryText,
      seasonal: getSeasonal().join(', '),
      month: getMonthName(),
      preferences,
    })
    const cacheHash = hashString(PROMPT_VERSION + model + 'spesa' + new Date().getMonth() + inventoryText + prefsHash)
    call(prompts.system, prompts.user, 'spesa', cacheHash, inventoryText)
  }, [call, getInventoryText, model, preferences, prefsHash])

  // Per ingredient, the first answer has its own cache slot (reopening is free);
  // "Altre idee" (`exclude` = titles already shown) uses a second one.
  const fetchStagione = useCallback((ingredient, exclude = []) => {
    const inventoryText = getInventoryText()
    const prompts = stagionePrompts({ ingredient, inventoryText, month: getMonthName(), exclude, preferences })
    const cacheHash = hashString(PROMPT_VERSION + model + 'stagione' + ingredient + exclude.join('|') + new Date().getMonth() + inventoryText + prefsHash)
    call(prompts.system, prompts.user, `stagione:${ingredient}${exclude.length ? ':altre' : ''}`, cacheHash, inventoryText)
  }, [call, getInventoryText, model, preferences, prefsHash])

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
    inventoryRef.current = ''
    clearSession(name)
  }, [name])

  return {
    loading, messages, streaming, error, errorCode, cached,
    fetchRicette, fetchSpesa, fetchStagione, sendFollowUp, clearOutput,
  }
}
