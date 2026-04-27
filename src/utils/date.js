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
  const days = Math.floor((ts - Date.now()) / 86400000)
  if (days < 0) return 'scaduto'
  if (days === 0) return 'scade oggi'
  if (days === 1) return 'scade domani'
  if (days <= 3) return `scade tra ${days} gg`
  return `scade ${new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
}

export function expiryStatus(ts) {
  if (!ts) return null
  const days = Math.floor((ts - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 3) return 'soon'
  return 'ok'
}
