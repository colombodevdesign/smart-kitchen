// Codes: 'no-key' | 'quota' | 'invalid-key' | 'offline' | 'unknown'
export class AIError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function classifyError(e) {
  if (e instanceof AIError) return { code: e.code, message: e.message }
  const msg = e?.message || ''
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return { code: 'offline', message: 'Sei offline. Riprova quando torni online.' }
  if (msg.includes('429') || msg.toLowerCase().includes('quota'))
    return { code: 'quota', message: 'Quota Gemini esaurita. Riprova tra qualche minuto o verifica il piano di fatturazione.' }
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key'))
    return { code: 'invalid-key', message: 'API key non valida. Controllala in Tu.' }
  return { code: 'unknown', message: msg || 'Errore di connessione.' }
}
