// Contabilità dei token Gemini (puro, provato con node --test).
// Ogni chiamata aggiorna users/{uid}/aiUsage/{YYYY-MM-DD} (giorno UTC), vedi usageLog.js.

// usageMetadata dell'SDK → contatori interi. `thoughts` (token di ragionamento) si paga come output;
// `cached` è la parte dell'input servita dalla cache implicita (già inclusa in `input`).
export function normalizeUsage(meta) {
  const n = v => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0)
  const input = n(meta?.promptTokenCount)
  return {
    input,
    output: n(meta?.candidatesTokenCount),
    thoughts: n(meta?.thoughtsTokenCount),
    cached: Math.min(n(meta?.cachedContentTokenCount), input),
  }
}

export function dayKey(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10)
}

// Chiave della mappa `byKey`: niente punti (i nomi dei modelli ne hanno), il dettaglio sta nei campi.
export function usageKey(feature, model) {
  return `${feature}__${String(model).replace(/[^a-zA-Z0-9_-]/g, '_')}`
}
