// Items closer to expiry than this many calendar days count as "soon".
export const SOON_DAYS = 3

// Whole calendar days from `now` to `ts` (negative if in the past). Counting
// calendar days instead of 24h blocks keeps the result right for both the
// end-of-day timestamps written by the app and the midnight ones from CSV.
export function daysUntil(ts, now = Date.now()) {
  const a = new Date(ts)
  const b = new Date(now)
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((dayA - dayB) / 86400000)
}

export function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function todayStr(now = new Date()) {
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
}

export function formatDate(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts) / 86400000)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'ieri'
  if (diff < 7) return `${diff} giorni fa`
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export function formatExpiry(ts) {
  if (!ts) return null
  const days = daysUntil(ts)
  if (days < 0) return 'scaduto'
  if (days === 0) return 'scade oggi'
  if (days === 1) return 'scade domani'
  if (days <= SOON_DAYS) return `scade tra ${days} gg`
  return `scade ${new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
}

export function expiryStatus(ts) {
  if (!ts) return null
  const days = daysUntil(ts)
  if (days < 0) return 'expired'
  if (days <= SOON_DAYS) return 'soon'
  return 'ok'
}
