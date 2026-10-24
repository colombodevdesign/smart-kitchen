// Planned meals (Cucina › Pasti): times and reminders. Pure helpers; the same
// rule for the reminder time is in functions/lib/meals.js (CommonJS): change both.
import { DEFAULT_MEAL_TIMES, MORNING_TIME } from '../data/mealCategories.js'

const toMin = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export function isPlanned(meal) {
  return meal?.planned === true
}

// Time of a meal: its own, otherwise the usual time of its category.
export function mealTime(meal, times = DEFAULT_MEAL_TIMES) {
  if (meal?.time && toMin(meal.time) != null) return meal.time
  return times?.[meal?.category] ?? DEFAULT_MEAL_TIMES[meal?.category] ?? null
}

// "In the morning" makes no sense for a meal before late morning: it becomes 1 hour before.
export function effectiveLead(lead, time) {
  const t = toMin(time)
  if (lead === 'am' && t != null && t <= toMin(MORNING_TIME) + 60) return '60'
  return lead
}

// 'HH:MM' of the reminder of a meal at `time` with `lead`, or null. A meal just
// after midnight with a lead that crosses it gets no reminder (it would be the day before).
export function reminderTime(time, lead) {
  const t = toMin(time)
  if (t == null || !lead) return null
  const l = effectiveLead(lead, time)
  const at = l === 'am' ? toMin(MORNING_TIME) : l === 'at' ? t : t - Number(l)
  return at >= 0 ? fmt(at) : null
}

export function mealReminderTime(meal, times) {
  if (!isPlanned(meal) || !meal.reminder?.lead) return null
  return reminderTime(mealTime(meal, times), meal.reminder.lead)
}

// Whether a meal of `category` at `dateStr` is still to come at `now` (decides
// the form's default: plan it or log it).
export function isUpcoming(dateStr, time, todayStr, now = new Date()) {
  if (dateStr > todayStr) return true
  if (dateStr < todayStr) return false
  const t = toMin(time)
  return t != null && t > now.getHours() * 60 + now.getMinutes()
}

// Planned meals after `todayStr` within `days` days, in date and time order.
export function upcomingPlanned(meals, todayStr, days = 7, times) {
  const [y, m, d] = todayStr.split('-').map(Number)
  const end = new Date(y, m - 1, d + days)
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
  const out = []
  for (const [dateStr, list] of Object.entries(meals ?? {})) {
    if (dateStr <= todayStr || dateStr > endStr) continue
    for (const meal of list ?? []) if (isPlanned(meal)) out.push({ dateStr, meal })
  }
  return out.sort((a, b) => a.dateStr.localeCompare(b.dateStr)
    || (mealTime(a.meal, times) ?? '').localeCompare(mealTime(b.meal, times) ?? ''))
}
