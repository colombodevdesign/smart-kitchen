import { GoogleGenAI } from '@google/genai'
import { classifyError } from './errors.js'

// Checks a key with a free, model-independent call (list one model): nothing is
// billed and a renamed model can't cause a false negative.
// Resolves to { ok: true } or { ok: false, code, message }.
export async function validateApiKey(apiKey) {
  try {
    const ai = new GoogleGenAI({ apiKey })
    await ai.models.list({ config: { pageSize: 1 } })
    return { ok: true }
  } catch (e) {
    const { code, message } = classifyError(e)
    return {
      ok: false,
      code,
      // classifyError's invalid-key text points the user to Tu, where they already are.
      message: code === 'invalid-key' ? 'Chiave non valida. Controlla di averla copiata per intero.' : message,
    }
  }
}
