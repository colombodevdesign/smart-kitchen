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

// Empty string removes the key.
export function storeApiKey(key) {
  try {
    if (key) localStorage.setItem(GEMINI_API_KEY_STORAGE, key)
    else localStorage.removeItem(GEMINI_API_KEY_STORAGE)
  } catch {}
}
