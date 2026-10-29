// Everything the chat assistant knows about the user, rebuilt at every message
// (text for the model + a compact snapshot), and what changed between two
// snapshots ("Da allora" in the chat). Pure: no React, no storage.
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import { CATEGORY_BY_ID } from '../data/mealCategories.js'
import { getSeasonal, getMonthName } from '../data/seasonal.js'
import { preferencesNote } from '../ai/prompts.js'
import { todayStr } from './date.js'
import { inventoryText } from './pantry.js'
import { isPlanned, mealTime } from './meals.js'

// Days of meals around today that the snapshot follows (log behind, planner ahead).
const MEAL_WINDOW = 7
// Lines of "what changed" shown and sent; the rest are summed up in one line.
const MAX_CHANGES = 12

function shiftDay(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return todayStr(new Date(y, m - 1, d + days))
}

function dayLabel(dateStr, today) {
  if (dateStr === today) return 'oggi'
  if (dateStr === shiftDay(today, 1)) return 'domani'
  if (dateStr === shiftDay(today, -1)) return 'ieri'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function mealLine(meal, dateStr, today, times) {
  const cat = CATEGORY_BY_ID[meal.category]?.label
  const time = isPlanned(meal) ? mealTime(meal, times) : null
  const when = [dayLabel(dateStr, today), cat, time].filter(Boolean).join(', ')
  return `- ${when}: ${meal.text}`
}

function mealsInWindow(meals, today) {
  const from = shiftDay(today, -MEAL_WINDOW)
  const to = shiftDay(today, MEAL_WINDOW)
  const out = []
  for (const [dateStr, list] of Object.entries(meals ?? {})) {
    if (dateStr < from || dateStr > to) continue
    for (const meal of list ?? []) out.push({ dateStr, meal })
  }
  return out.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || (a.meal.createdAt ?? 0) - (b.meal.createdAt ?? 0))
}

function section(title, lines) {
  return lines.length ? `${title}\n${lines.join('\n')}` : `${title}\n(nessuno)`
}

export function buildUserContext({
  inventory, meals, savedRecipes = [], shopping = [], preferences = { items: [], dismissed: [] },
  mealTimes, now = new Date(),
}) {
  const today = todayStr(now)
  const prefs = preferences.items ?? []
  const around = mealsInWindow(meals, today)
  const planned = around.filter(({ dateStr, meal }) => isPlanned(meal) && dateStr >= today)
  const eaten = around.filter(({ dateStr, meal }) => !isPlanned(meal) && dateStr <= today)
  const toBuy = shopping.filter(i => !i.checked)
  const when = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const text = [
    `Adesso: ${when}, ore ${time}. Zona: Lombardia. Di stagione a ${getMonthName()}: ${getSeasonal().join(', ')}.`,
    `Dispensa:\n${inventoryText(inventory, now.getTime()) || '(vuota)'}`,
    section('Pasti in programma (da oggi, 7 giorni):', planned.map(({ dateStr, meal }) => mealLine(meal, dateStr, today, mealTimes))),
    section('Pasti mangiati negli ultimi 7 giorni:', eaten.map(({ dateStr, meal }) => mealLine(meal, dateStr, today, mealTimes))),
    section('Ricette salvate:', savedRecipes.slice(-30).map(r => `- ${r.title}`)),
    section('Lista della spesa (da comprare):', toBuy.map(i => `- ${i.qty ? `${i.name} ${i.qty}` : i.name}`)),
    preferencesNote(prefs).trim() || 'Preferenze alimentari: nessuna salvata.',
    preferences.dismissed?.length
      ? `Preferenze che ho già rifiutato di salvare (non riproporle): ${preferences.dismissed.join('; ')}.`
      : '',
  ].filter(Boolean).join('\n\n')

  const snapshot = {
    inv: Object.fromEntries(SECTIONS.flatMap(s => (inventory?.[s] ?? []).map(i => [
      i.id, { s, n: i.name, q: i.qty ?? '', e: i.expiresAt ?? null, o: !!i.urgent },
    ]))),
    shop: Object.fromEntries(shopping.map(i => [i.id, { n: i.name, c: !!i.checked }])),
    meals: Object.fromEntries(around.map(({ dateStr, meal }) => [
      meal.id, { d: dateStr, t: meal.text, p: isPlanned(meal), h: meal.time ?? null },
    ])),
    prefs: prefs.map(p => p.text),
  }
  return { text, snapshot }
}

// What changed from `prev` to `next` (snapshots of buildUserContext), as short
// Italian lines. No previous snapshot (first message) = nothing to report.
export function diffSnapshots(prev, next, now = new Date()) {
  if (!prev || !next) return []
  const today = todayStr(now)
  const lines = []
  const label = (s) => SECTION_LABELS[s] ?? s

  const pi = prev.inv ?? {}
  const ni = next.inv ?? {}
  for (const [id, item] of Object.entries(ni)) {
    const old = pi[id]
    if (!old) { lines.push(`Aggiunto in ${label(item.s)}: ${item.q ? `${item.n} (${item.q})` : item.n}`); continue }
    if (old.s !== item.s) lines.push(`Spostato in ${label(item.s)}: ${item.n}`)
    if (old.n !== item.n) lines.push(`Rinominato: ${old.n} → ${item.n}`)
    if (!old.o && item.o) lines.push(`Segnato come aperto: ${item.n}`)
    if (old.q !== item.q) lines.push(`Quantità di ${item.n}: ${old.q || '—'} → ${item.q || '—'}`)
    if (old.e !== item.e) lines.push(`Scadenza cambiata: ${item.n}`)
  }
  for (const [id, item] of Object.entries(pi)) {
    if (!ni[id]) lines.push(`Non c’è più: ${item.n}`)
  }

  const ps = prev.shop ?? {}
  const ns = next.shop ?? {}
  for (const [id, item] of Object.entries(ns)) {
    const old = ps[id]
    if (!old && !item.c) lines.push(`Aggiunto alla spesa: ${item.n}`)
    else if (old && !old.c && item.c) lines.push(`Comprato: ${item.n}`)
  }
  for (const [id, item] of Object.entries(ps)) {
    if (!ns[id] && !item.c) lines.push(`Tolto dalla spesa: ${item.n}`)
  }

  const pm = prev.meals ?? {}
  const nm = next.meals ?? {}
  for (const [id, meal] of Object.entries(nm)) {
    const old = pm[id]
    const day = dayLabel(meal.d, today)
    if (!old) lines.push(meal.p ? `Pasto in programma ${day}: ${meal.t}` : `Pasto registrato ${day}: ${meal.t}`)
    else if (old.p && !meal.p) lines.push(`Mangiato: ${meal.t}`)
    else if (old.d !== meal.d || old.h !== meal.h) lines.push(`Pasto spostato a ${day}${meal.h ? ` alle ${meal.h}` : ''}: ${meal.t}`)
  }
  for (const [id, meal] of Object.entries(pm)) {
    // Meals that only slid out of the window as days passed are not news.
    if (!nm[id] && meal.d >= shiftDay(today, -MEAL_WINDOW)) lines.push(`Tolto dai pasti: ${meal.t}`)
  }

  const pp = new Set(prev.prefs ?? [])
  const np = new Set(next.prefs ?? [])
  for (const t of np) if (!pp.has(t)) lines.push(`Nuova preferenza: ${t}`)
  for (const t of pp) if (!np.has(t)) lines.push(`Preferenza tolta: ${t}`)

  if (lines.length <= MAX_CHANGES) return lines
  const extra = lines.length - (MAX_CHANGES - 1)
  return [...lines.slice(0, MAX_CHANGES - 1), `…e altre ${extra} modifiche`]
}
