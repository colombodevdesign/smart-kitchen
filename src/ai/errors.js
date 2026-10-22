// Codes: 'no-key' | 'quota' | 'billing' | 'invalid-key' | 'offline' | 'unknown'
export class AIError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Where the user tops up Gemini credits or creates a new key.
export const AI_STUDIO_URL = 'https://aistudio.google.com/'

// The SDK puts the API's JSON body in `message`, and for some errors that body's
// own message is JSON again: unwrap up to two levels → { code, status, message }.
export function apiErrorInfo(e) {
  let message = e?.message || ''
  let code = typeof e?.status === 'number' ? e.status : null
  let status = ''
  for (let i = 0; i < 2; i++) {
    let body
    try { body = JSON.parse(message) } catch { break }
    const err = body?.error
    if (!err || typeof err !== 'object') break
    if (typeof err.code === 'number' && err.code) code = err.code
    if (err.status) status = err.status
    message = typeof err.message === 'string' ? err.message.trim() : ''
  }
  return { code, status, message }
}

export function classifyError(e) {
  if (e instanceof AIError) return { code: e.code, message: e.message }
  const { code, status, message } = apiErrorInfo(e)
  const raw = e?.message || ''
  const lower = raw.toLowerCase()
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return { code: 'offline', message: 'Sei offline. Riprova quando torni online.' }
  if (code === 402 || lower.includes('prepayment'))
    return {
      code: 'billing',
      message: 'Il credito Gemini è esaurito. Ricaricalo (o attiva la ricarica automatica) su AI Studio, oppure usa la chiave di un progetto senza fatturazione.',
    }
  if (code === 429 || status === 'RESOURCE_EXHAUSTED' || raw.includes('429') || lower.includes('quota'))
    return { code: 'quota', message: 'Quota Gemini esaurita. Riprova tra qualche minuto o verifica il piano di fatturazione.' }
  if (raw.includes('API_KEY_INVALID') || raw.includes('API key') || code === 401 || code === 403 || status === 'PERMISSION_DENIED')
    return { code: 'invalid-key', message: 'API key non valida. Controllala in Tu.' }
  return { code: 'unknown', message: message || 'Errore di connessione.' }
}
