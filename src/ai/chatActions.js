// Actions the chat assistant proposes and the user confirms with a tap. The
// model ends its answer, when it has something to propose, with a block
//   ```azioni
//   [{ "type": "spesa", ... }]
//   ```
// that is never shown: splitActions takes it out and keeps the valid entries.
import { SECTIONS } from '../data/initialInventory.js'
import { MEAL_CATEGORIES } from '../data/mealCategories.js'
import { PREFERENCE_KIND_IDS } from '../data/preferences.js'

export const ACTIONS_FENCE = '```azioni'
const BLOCK = /```azioni[^\n]*\n([\s\S]*?)(?:```|$)/g
const MEAL_IDS = MEAL_CATEGORIES.map(c => c.id)

const str = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// One proposed action, cleaned, or null when it can't be carried out.
export function validateAction(raw) {
  if (!raw || typeof raw !== 'object') return null
  switch (raw.type) {
    case 'spesa': {
      const items = (Array.isArray(raw.items) ? raw.items : [])
        .map(i => ({ name: str(i?.name, 80), qty: str(i?.qty, 40) }))
        .filter(i => i.name)
        .slice(0, 20)
      return items.length ? { type: 'spesa', items } : null
    }
    case 'pasto': {
      const date = str(raw.date, 10)
      const text = str(raw.text)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !text) return null
      const time = /^\d{2}:\d{2}$/.test(str(raw.time, 5)) ? str(raw.time, 5) : null
      return { type: 'pasto', date, text, category: MEAL_IDS.includes(raw.category) ? raw.category : null, time }
    }
    case 'rimuovi': {
      const name = str(raw.name, 80)
      if (!name) return null
      return { type: 'rimuovi', name, section: SECTIONS.includes(raw.section) ? raw.section : null }
    }
    case 'preferenza': {
      const text = str(raw.text)
      if (!text || !PREFERENCE_KIND_IDS.includes(raw.kind)) return null
      return { type: 'preferenza', kind: raw.kind, text, reason: str(raw.reason, 200) }
    }
    default:
      return null
  }
}

// Final answer → { text without the block, actions (status 'pending') }.
export function splitActions(full) {
  const actions = []
  for (const match of String(full ?? '').matchAll(BLOCK)) {
    let parsed
    try { parsed = JSON.parse(match[1]) } catch { continue }
    for (const raw of Array.isArray(parsed) ? parsed : [parsed]) {
      const action = validateAction(raw)
      if (action) actions.push({ ...action, status: 'pending' })
    }
  }
  const text = String(full ?? '').replace(BLOCK, '').trim()
  return { text, actions }
}

// Text to show while streaming: hides the block, also while its first
// backticks are still arriving.
export function visibleText(streaming) {
  const s = String(streaming ?? '')
  const at = s.indexOf(ACTIONS_FENCE)
  if (at >= 0) return s.slice(0, at).trimEnd()
  // The fence starts a line: a backtick closing inline code is not one.
  const tail = s.match(/(?:^|\n)(`{1,3}[a-z]*)$/)
  if (tail && ACTIONS_FENCE.startsWith(tail[1])) return s.slice(0, tail.index).trimEnd()
  return s
}
