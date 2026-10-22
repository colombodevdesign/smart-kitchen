import { SECTIONS } from '../data/initialInventory.js'
import { expiryStatus, formatExpiry } from './date.js'

// Lower rank = needs attention first.
export function statusRank(c) {
  if (c.status === 'expired') return 0
  if (c.urgent && c.status !== 'soon') return 1
  if (c.status === 'soon') return 2
  return 3
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// Badge shown next to a pantry item. Always text, never colour alone.
// tone: 'expired' | 'soon' | 'open' | 'ok'; null when there is nothing to show.
export function itemBadge(item) {
  const status = expiryStatus(item.expiresAt)
  if (status === 'expired') return { tone: 'expired', label: 'Scaduto' }
  if (status === 'soon')    return { tone: 'soon',    label: capitalize(formatExpiry(item.expiresAt)) }
  if (item.urgent)          return { tone: 'open',    label: 'Aperto' }
  if (item.expiresAt) {
    const date = new Date(item.expiresAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    return { tone: 'ok', label: date }
  }
  return null
}

// Items that are expired, expiring soon or already opened, most urgent first.
// `excludeNames` (lowercase set) drops products that are already on a list.
export function getPantryCandidates(inventory, excludeNames = new Set()) {
  if (!inventory) return []
  const list = []
  for (const section of SECTIONS) {
    for (const item of (inventory[section] ?? [])) {
      const status = expiryStatus(item.expiresAt)
      const include = status === 'expired' || status === 'soon' || item.urgent
      if (!include) continue
      if (excludeNames.has(item.name.trim().toLowerCase())) continue
      list.push({
        id: item.id,
        name: item.name,
        qty: item.qty || '',
        urgent: !!item.urgent,
        status,
        section,
        item,
      })
    }
  }
  return list.sort((a, b) => statusRank(a) - statusRank(b))
}

export function getUseSoonItems(inventory, limit = Infinity) {
  return getPantryCandidates(inventory).slice(0, limit)
}
