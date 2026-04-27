export function formatDate(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts) / 86400000)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'ieri'
  if (diff < 7) return `${diff} giorni fa`
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
