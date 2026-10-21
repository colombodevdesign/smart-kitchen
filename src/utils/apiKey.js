export const GEMINI_API_KEY_STORAGE = 'gemini-api-key'

export function getApiKey() {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function hasApiKey() {
  return !!getApiKey()
}
