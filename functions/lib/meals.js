// Meal reminders: pushes for planned meals (Cucina › Pasti) and the 17:00
// "plan your dinner" nudge. Pure builders plus processMeals, which takes the
// Firestore and Messaging instances as arguments so it can be tested with fakes.
// The reminder-time rule is also in src/utils/meals.js: change both.
const { DEFAULT_TZ, localDateStr, localToUtc } = require('./schedule')

const DEFAULT_TIMES = { colazione: '08:00', pranzo: '12:30', spuntino: '16:30', cena: '19:30' }
const MORNING_TIME = '09:00'
const NUDGE_TIME = '17:00'
// A reminder goes out at the first tick at or after its time (ticks every 15 min);
// 20 min of look-back tolerate a late tick, and `sent` stops a second send.
const LOOKBACK_MS = 20 * 60 * 1000
const SENT_KEEP_MS = 3 * 24 * 3600 * 1000 // dedupe entries older than this are dropped
const LABELS = { colazione: 'Colazione', pranzo: 'Pranzo', spuntino: 'Spuntino', cena: 'Cena' }

const toMin = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) && h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : null
}

function mealTime(meal, times) {
  if (toMin(meal?.time) != null) return meal.time
  return times?.[meal?.category] ?? DEFAULT_TIMES[meal?.category] ?? null
}

// Minutes after local midnight of the reminder, or null (same rule as the app).
function reminderMinute(time, lead) {
  const t = toMin(time)
  if (t == null || !lead) return null
  const l = lead === 'am' && t <= toMin(MORNING_TIME) + 60 ? '60' : lead
  const at = l === 'am' ? toMin(MORNING_TIME) : l === 'at' ? t : t - Number(l)
  return Number.isFinite(at) && at >= 0 ? at : null
}

function isDue(atMs, nowMs) {
  return atMs <= nowMs && atMs > nowMs - LOOKBACK_MS
}

function localAt(dateStr, minute, tz) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return localToUtc(y, mo, d, Math.floor(minute / 60), minute % 60, tz)
}

// "Cena alle 19:30" / "Risotto alla zucca": true whatever the lead and however late the tick.
function reminderMessage(meal, time) {
  const label = LABELS[meal.category] ?? 'Pasto'
  const recipe = meal.recipeTitle && meal.recipeTitle !== meal.text ? ` · ricetta: ${meal.recipeTitle}` : ''
  return { title: `${label} alle ${time}`, body: `${meal.text}${recipe}` }
}

// Planned meals whose reminder is due at this tick and was not sent yet. `sent` is
// keyed by `key` (id + time), so a meal moved to another time is reminded again.
// Returns [{ id, key, dateStr, at, title, body }].
function dueMealReminders(meals, mealPrefs, nowMs, tz, sent = {}) {
  const times = { ...DEFAULT_TIMES, ...(mealPrefs?.times ?? {}) }
  // A reminder is never on the day before its meal: today's meals, plus yesterday's
  // right after midnight (a reminder at 23:55 seen by the 00:00 tick).
  const days = [...new Set([localDateStr(nowMs - LOOKBACK_MS, tz), localDateStr(nowMs, tz)])]
  const out = []
  for (const dateStr of days) {
    for (const meal of meals?.[dateStr] ?? []) {
      if (meal?.planned !== true || !meal.reminder?.lead || !meal.id) continue
      const time = mealTime(meal, times)
      const minute = reminderMinute(time, meal.reminder.lead)
      if (minute == null) continue
      const at = localAt(dateStr, minute, tz)
      const key = `${meal.id}@${at}`
      if (!isDue(at, nowMs) || sent[key]) continue
      out.push({ id: meal.id, key, dateStr, at, ...reminderMessage(meal, time) })
    }
  }
  return out
}

// 17:00 local, when the nudge is on and there is no dinner today (planned or eaten).
function needsDinnerNudge(meals, mealPrefs, nowMs, tz, nudgeDay) {
  if (!mealPrefs?.dinnerNudge) return false
  const today = localDateStr(nowMs, tz)
  if (nudgeDay === today) return false
  if (!isDue(localAt(today, toMin(NUDGE_TIME), tz), nowMs)) return false
  return !(meals?.[today] ?? []).some(m => m?.category === 'cena')
}

const NUDGE_MESSAGE = { title: 'Cosa ceni stasera?', body: 'Per stasera non hai ancora niente in programma: pianifica la cena.' }

// Meal reminders for one user at one tick. `send(message, opts)` delivers to all of
// the user's devices (shared with the expiry alerts) and returns the ok count.
async function processMeals({ db, uid, prefs, nowMs, send }) {
  const mealPrefs = prefs.meals
  if (!mealPrefs?.enabled) return { sent: 0, skipped: 'off' }
  const tz = prefs.tz || DEFAULT_TZ
  const stateRef = db.doc(`users/${uid}/mealReminders/data`)
  const [mealsSnap, stateSnap] = await Promise.all([db.doc(`users/${uid}/meals/data`).get(), stateRef.get()])
  const meals = mealsSnap.exists ? mealsSnap.data() : {}
  const state = stateSnap.exists ? stateSnap.data() : {}
  const sent = state.sent ?? {}

  const due = dueMealReminders(meals, mealPrefs, nowMs, tz, sent)
  const nudge = needsDinnerNudge(meals, mealPrefs, nowMs, tz, state.nudgeDay)
  if (due.length === 0 && !nudge) return { sent: 0, skipped: 'nothing-due' }

  let delivered = 0
  const nextSent = Object.fromEntries(Object.entries(sent).filter(([, ms]) => nowMs - ms < SENT_KEEP_MS))
  for (const r of due) {
    delivered += await send({ title: r.title, body: r.body }, { tag: `sk-pasto-${r.id}`, open: 'pasti' })
    nextSent[r.key] = nowMs
  }
  const patch = { sent: nextSent }
  if (nudge) {
    delivered += await send(NUDGE_MESSAGE, { tag: 'sk-cena', open: 'pasti' })
    patch.nudgeDay = localDateStr(nowMs, tz)
  }
  // Not merged: `sent` is replaced, so old entries go away.
  await stateRef.set({ ...state, ...patch })
  return { sent: delivered, reminders: due.map(r => r.id), nudge }
}

module.exports = {
  DEFAULT_TIMES, NUDGE_MESSAGE,
  mealTime, reminderMinute, reminderMessage, dueMealReminders, needsDinnerNudge, processMeals,
}
