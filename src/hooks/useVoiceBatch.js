import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY_STORAGE = 'gemini-api-key'
const MODEL_NAME = 'gemini-3-flash-preview'
const MAX_DURATION_MS = 60_000

const PROMPT = `Sei un assistente per gestire una dispensa italiana. L'utente ti invia un audio in cui elenca i prodotti appena comprati. Estrai un elenco strutturato.

Regole:
- Un oggetto per prodotto distinto. Se l'utente dice "due cartoni di latte", produci UN solo oggetto con name="latte" e qty="2 cartoni".
- qty: stringa libera in italiano ("2 cartoni", "300g", "1L"). Se non specificato, stringa vuota.
- section: scegli tra "credenza", "frigo", "freezer" secondo la conservazione tipica italiana.
  - frigo: latticini, salumi, uova, verdure fresche delicate, condimenti aperti
  - freezer: tutto ciò che è esplicitamente surgelato/gelato
  - credenza: pasta, riso, scatolame, oli, conserve, biscotti, prodotti secchi, frutta/verdura non deperibile
- Ignora disfluenze ("ehm", "allora", "cioè"), false partenze, correzioni: tieni l'ultima versione.
- Nome prodotto in italiano, minuscolo.
- Se non capisci nessun prodotto, restituisci [].
Restituisci SOLO JSON conforme allo schema.`

const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name:    { type: 'string' },
      qty:     { type: 'string' },
      section: { type: 'string', enum: ['credenza', 'frigo', 'freezer'] },
    },
    required: ['name', 'section'],
  },
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const m of MIME_CANDIDATES) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch {}
  }
  return ''
}

function normalizeMime(m) {
  if (!m) return 'audio/webm'
  return m.split(';')[0].trim() || 'audio/webm'
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Errore lettura audio'))
    reader.onload = () => {
      const result = reader.result || ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

function permissionError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Permesso microfono negato. Abilitalo nelle impostazioni del browser.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'Nessun microfono disponibile.'
  if (name === 'NotReadableError')
    return 'Microfono già in uso da un\'altra app.'
  return err?.message || 'Impossibile accedere al microfono.'
}

function parseApiError(err) {
  const msg = err?.message || ''
  if (msg.includes('429') || msg.toLowerCase().includes('quota'))
    return 'Quota Gemini esaurita. Riprova tra qualche minuto.'
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key'))
    return 'API key non valida. Controlla le Impostazioni.'
  if (msg.toLowerCase().includes('unsupported') || msg.includes('400'))
    return 'Il modello non ha accettato l\'audio. Riprova o segnala il problema.'
  return msg || 'Errore di connessione con Gemini.'
}

/**
 * Voice batch recording + Gemini transcription hook.
 * State machine: 'idle' → 'recording' → 'processing' → 'ready' | 'error' → (reset) → 'idle'
 * - When status === 'ready', `items` holds the parsed candidates.
 * - When status === 'error', `error.message` holds the user-facing string.
 * - Recording auto-stops after MAX_DURATION_MS and proceeds to processing automatically.
 */
export function useVoiceBatch() {
  const [status, setStatus] = useState('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const mimeRef = useRef('')
  const startedAtRef = useRef(0)
  const tickRef = useRef(null)
  const autoStopRef = useRef(null)
  const cancelledRef = useRef(false)

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()) } catch {}
      streamRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const processBlob = useCallback(async (blob) => {
    if (cancelledRef.current) {
      setStatus('idle')
      return
    }
    if (!blob || blob.size === 0) {
      setError({ message: 'Registrazione vuota. Riprova.' })
      setStatus('error')
      return
    }
    const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE)
    if (!apiKey) {
      setError({ message: 'API key non configurata. Vai in Impostazioni per inserirla.' })
      setStatus('error')
      return
    }
    try {
      const base64 = await blobToBase64(blob)
      const ai = new GoogleGenAI({ apiKey })
      const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts: [
          { text: PROMPT },
          { inlineData: { mimeType: normalizeMime(mimeRef.current), data: base64 } },
        ]}],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })
      const text = res?.text ?? ''
      let parsed
      try { parsed = JSON.parse(text) }
      catch { throw new Error('Risposta non in formato JSON valido.') }
      if (!Array.isArray(parsed)) parsed = []
      const clean = parsed
        .filter(it => it && typeof it.name === 'string' && it.name.trim())
        .map(it => ({
          name: it.name.trim(),
          qty: typeof it.qty === 'string' ? it.qty.trim() : '',
          section: ['credenza', 'frigo', 'freezer'].includes(it.section) ? it.section : 'credenza',
        }))
      setItems(clean)
      setStatus('ready')
    } catch (err) {
      setError({ message: parseApiError(err) })
      setStatus('error')
    }
  }, [])

  const finalizeRecording = useCallback(() => {
    // Called from recorder.onstop. Tears down stream/timer and kicks off processing.
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()) } catch {}
      streamRef.current = null
    }
    const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' })
    chunksRef.current = []
    recorderRef.current = null
    if (cancelledRef.current) {
      setStatus('idle')
      return
    }
    setStatus('processing')
    processBlob(blob)
  }, [processBlob])

  const start = useCallback(async () => {
    if (status === 'recording' || status === 'processing') return
    setError(null)
    setItems([])
    cancelledRef.current = false

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError({ message: 'Il browser non supporta la registrazione audio.' })
      setStatus('error')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError({ message: 'Il browser non supporta MediaRecorder.' })
      setStatus('error')
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setError({ message: permissionError(err) })
      setStatus('error')
      return
    }

    const mime = pickMimeType()
    let recorder
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    } catch (err) {
      try { stream.getTracks().forEach(t => t.stop()) } catch {}
      setError({ message: err?.message || 'Impossibile avviare il registratore.' })
      setStatus('error')
      return
    }

    streamRef.current = stream
    recorderRef.current = recorder
    chunksRef.current = []
    mimeRef.current = mime || recorder.mimeType || ''

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = finalizeRecording

    startedAtRef.current = Date.now()
    setElapsedMs(0)
    setStatus('recording')
    recorder.start()

    tickRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current)
    }, 200)

    autoStopRef.current = setTimeout(() => {
      const r = recorderRef.current
      if (r && r.state === 'recording') {
        try { r.stop() } catch {}
      }
    }, MAX_DURATION_MS)
  }, [status, finalizeRecording])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return
    if (recorder.state === 'recording') {
      try { recorder.stop() } catch {}
    }
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      try { recorder.stop() } catch {}
    }
    cleanup()
    setStatus('idle')
    setElapsedMs(0)
    setError(null)
    setItems([])
  }, [cleanup])

  const reset = useCallback(() => {
    cancelledRef.current = false
    setError(null)
    setItems([])
    setElapsedMs(0)
    setStatus('idle')
  }, [])

  return {
    status,        // 'idle' | 'recording' | 'processing' | 'ready' | 'error'
    elapsedMs,
    error,
    items,
    start,
    stop,
    cancel,
    reset,
    maxDurationMs: MAX_DURATION_MS,
  }
}
