import { SECTIONS } from '../data/initialInventory.js'
import { FALLBACK_OPEN_DAYS } from '../data/foodCategories.js'
import { SOON_DAYS, daysUntil, expiryStatus, formatExpiry } from './date.js'

// Opened or fresh products with at most this many days left are worth using soon.
export const USE_SOON_DAYS = 7

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

const daysSince = (ts, now) => -daysUntil(ts, now)

// Products opened before `openedAt` existed count from when they were added.
export function openedSince(item) {
  return item.openedAt ?? item.added ?? null
}

// Only an AI analysis can say a product is not food (supplements, detergents…).
export function isFood(item) {
  return item.ai?.food !== false
}

// Estimated days of use left: { days, source, life } or null when nothing is known.
// The lowest of: printed expiry ('printed'), shelf life after opening counted from
// openedSince ('opened'), shelf life of fresh food without a printed date counted
// from when it was added ('fresh'). `life` is the total shelf life behind the
// estimate, used to break ties: 0 for a printed date, which is certain and so
// comes before an estimate with the same days left.
// functions/lib/notify.js (estimatedUseBy) applies the same rule: change both.
export function estimateRemaining(item, section, now = Date.now()) {
  const options = []
  if (item.expiresAt) options.push({ days: daysUntil(item.expiresAt, now), source: 'printed', life: 0 })
  if (isFood(item)) {
    const since = openedSince(item)
    if (item.urgent && since) {
      const life = item.ai?.openDays ?? FALLBACK_OPEN_DAYS[section] ?? FALLBACK_OPEN_DAYS.frigo
      options.push({ days: life - daysSince(since, now), source: 'opened', life })
    }
    if (!item.expiresAt && item.ai?.freshDays && item.added) {
      const life = item.ai.freshDays
      options.push({ days: life - daysSince(item.added, now), source: 'fresh', life })
    }
  }
  if (options.length === 0) return null
  return options.reduce((a, b) => (b.days < a.days ? b : a))
}

// Sort key shared by every "what to use first" list.
export function priorityInfo(item, section, now = Date.now()) {
  const est = estimateRemaining(item, section, now)
  return {
    expired: expiryStatus(item.expiresAt) === 'expired',
    remaining: est?.days ?? Infinity,
    life: est?.life ?? Infinity,
    name: item.name,
  }
}

// Printed-expired first, then fewest days left, then printed dates and the more
// perishable, then by name.
export function comparePriority(a, b) {
  return (b.expired - a.expired)
    || (a.remaining - b.remaining)
    || (a.life - b.life)
    || a.name.localeCompare(b.name, 'it')
}

function ageLabel(prefix, days, agoStyle) {
  if (days <= 0) return `${prefix} oggi`
  if (days === 1) return `${prefix} ieri`
  return agoStyle ? `${prefix} ${days} gg fa` : `${prefix} da ${days} gg`
}

// Badge shown next to a pantry item. Always text, never colour alone.
// tone: 'expired' | 'soon' | 'open' | 'ok'; null when there is nothing to show.
// With `age`, opened and fresh products say how long ago they were opened or
// bought ("Aperto da 9 gg", "Preso 6 gg fa"): real dates, not the AI estimate,
// which only picks the tone. Estimates never use the 'expired' tone.
export function itemBadge(item, { age = false, section = null, now = Date.now() } = {}) {
  const status = expiryStatus(item.expiresAt)
  if (status === 'expired') return { tone: 'expired', label: 'Scaduto' }
  if (status === 'soon')    return { tone: 'soon',    label: capitalize(formatExpiry(item.expiresAt)) }
  if (age && isFood(item)) {
    const est = estimateRemaining(item, section, now)
    const tone = est && est.days <= SOON_DAYS ? 'soon' : 'open'
    const since = openedSince(item)
    if (item.urgent && since) return { tone, label: ageLabel('Aperto', daysSince(since, now), false) }
    if (est?.source === 'fresh') return { tone, label: ageLabel('Preso', daysSince(item.added, now), true) }
  }
  if (item.urgent)          return { tone: 'open',    label: 'Aperto' }
  if (item.expiresAt) {
    const date = new Date(item.expiresAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    return { tone: 'ok', label: date }
  }
  return null
}

// Food that is expired, expiring soon, opened, or fresh and close to its estimated
// shelf life, most urgent first. `relevant` marks the ones to use within
// USE_SOON_DAYS (an opened sauce with weeks left is a candidate, not relevant).
// `excludeNames` (lowercase set) drops products that are already on a list.
export function getPantryCandidates(inventory, excludeNames = new Set(), now = Date.now()) {
  if (!inventory) return []
  const list = []
  for (const section of SECTIONS) {
    for (const item of (inventory[section] ?? [])) {
      if (!isFood(item)) continue
      const status = expiryStatus(item.expiresAt)
      const printed = status === 'expired' || status === 'soon'
      const est = estimateRemaining(item, section, now)
      const freshSoon = est?.source === 'fresh' && est.days <= SOON_DAYS
      if (!printed && !item.urgent && !freshSoon) continue
      if (excludeNames.has(item.name.trim().toLowerCase())) continue
      list.push({
        id: item.id,
        name: item.name,
        qty: item.qty || '',
        urgent: !!item.urgent,
        status,
        section,
        item,
        remaining: est?.days ?? Infinity,
        source: est?.source ?? null,
        relevant: printed || (!!est && est.days <= USE_SOON_DAYS),
        priority: priorityInfo(item, section, now),
      })
    }
  }
  return list.sort((a, b) => comparePriority(a.priority, b.priority))
}

export function getUseSoonItems(inventory, limit = Infinity) {
  return getPantryCandidates(inventory).filter(c => c.relevant).slice(0, limit)
}
