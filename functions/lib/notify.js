// Expiry notifications: pure builders plus processUser/sendTest, which take the
// Firestore and Messaging instances as arguments so they can be tested with fakes.
const { DEFAULT_TZ, dayWindow, localDateStr, localParts, shouldSendNow } = require('./schedule')
const { processMeals } = require('./meals')

const SECTIONS = ['credenza', 'frigo', 'freezer']
const STALE_CODES = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]
const STALE_PURGE_MS = 30 * 24 * 3600 * 1000
const MAX_NAMES = 3

// Same tag on every expiry push: if a device still gets two, the system shows one.
const EXPIRY_TAG = 'sk-scadenze'
const TEST_TAG = 'sk-test'

function dayLabel(offset) {
  if (offset === 0) return 'Oggi'
  if (offset === 1) return 'Domani'
  return `Tra ${offset} giorni`
}

// Same values as FALLBACK_OPEN_DAYS in src/data/foodCategories.js.
const FALLBACK_OPEN_DAYS = { credenza: 30, frigo: 5, freezer: 60 }

// Whole calendar days in `tz` from the day of `fromMs` to the day of `toMs`.
function calendarDaysBetween(fromMs, toMs, tz) {
  const a = localParts(fromMs, tz)
  const b = localParts(toMs, tz)
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000)
}

// Days from today (in `tz`) to the estimated last good day of a product without a
// printed date: opened (openedAt, or added for products opened before openedAt
// existed) + ai.openDays, or added + ai.freshDays for fresh food; the earlier wins.
// Same rule as estimateRemaining in src/utils/pantry.js: change both. Only food the
// AI has analysed counts, the section defaults are too rough for a push.
function estimatedOffset(item, section, nowMs, tz) {
  if (item.expiresAt || !item.ai || item.ai.food === false) return null
  const offsets = []
  const since = item.openedAt ?? item.added
  if (item.urgent && since) {
    const life = item.ai.openDays ?? FALLBACK_OPEN_DAYS[section] ?? FALLBACK_OPEN_DAYS.frigo
    offsets.push(life - calendarDaysBetween(since, nowMs, tz))
  }
  if (item.ai.freshDays && item.added) offsets.push(item.ai.freshDays - calendarDaysBetween(item.added, nowMs, tz))
  return offsets.length ? Math.min(...offsets) : null
}

// Items whose expiry (printed, or estimated for opened and fresh food) falls on
// each of the chosen days → [{ offset, names, estimated }]; `estimated` is true
// when at least one product of the group has no printed date.
function collectExpiring(inventory, daysBefore, nowMs, tz) {
  const days = [...new Set(daysBefore)].filter(d => Number.isInteger(d) && d >= 0).sort((a, b) => a - b)
  const groups = []
  for (const offset of days) {
    const [start, end] = dayWindow(nowMs, tz, offset)
    const names = []
    let printed = 0
    for (const section of SECTIONS) {
      for (const item of (inventory?.[section] ?? [])) {
        if (item.expiresAt && item.expiresAt >= start && item.expiresAt <= end) { names.push(item.name); printed++ }
        else if (estimatedOffset(item, section, nowMs, tz) === offset) names.push(item.name)
      }
    }
    if (names.length > 0) groups.push({ offset, names, estimated: printed < names.length })
  }
  return groups
}

function nameList(names) {
  const shown = names.slice(0, MAX_NAMES).join(', ')
  return names.length > MAX_NAMES ? `${shown} +${names.length - MAX_NAMES} altri` : shown
}

function whenText(offset) {
  return offset === 0 ? 'oggi' : offset === 1 ? 'domani' : `tra ${offset} giorni`
}

// One recap per user and day, whatever the number of products. Estimated dates
// say "da usare" rather than "scade".
function buildMessage(groups) {
  if (groups.length === 1) {
    const { offset, names, estimated } = groups[0]
    if (names.length === 1) {
      const verb = estimated ? 'da usare' : 'scade'
      return { title: `⏰ ${names[0]} ${verb} ${whenText(offset)}`, body: 'Tocca per vedere cosa scade.' }
    }
    const verb = estimated ? 'da usare' : 'scadono'
    return { title: `⏰ ${names.length} prodotti ${verb} ${whenText(offset)}`, body: nameList(names) }
  }
  const total = groups.reduce((n, g) => n + g.names.length, 0)
  return {
    title: `⏰ ${total} prodotti in scadenza`,
    body: groups.map(g => `${dayLabel(g.offset)}: ${nameList(g.names)}`).join(' · '),
  }
}

// Marks tokens that FCM rejected as stale (kept, so the app can show them) and
// refreshes the ones that worked. `entries`: [{ ref, id, token }] aligned with `responses`.
async function applyResults(entries, responses, nowMs) {
  const results = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const r = responses[i]
    if (r?.success) {
      if (e.ref) await e.ref.set({ status: 'active', lastOkAt: nowMs, staleSince: null }, { merge: true }).catch(() => {})
      results.push({ deviceId: e.id, label: e.label, status: 'ok' })
    } else {
      const code = r?.error?.code ?? 'unknown'
      if (STALE_CODES.includes(code)) {
        if (e.ref) await e.ref.set({ status: 'stale', staleSince: e.staleSince ?? nowMs }, { merge: true }).catch(() => {})
        results.push({ deviceId: e.id, label: e.label, status: 'stale', code })
      } else {
        results.push({ deviceId: e.id, label: e.label, status: 'error', code })
      }
    }
  }
  return results
}

// Token entries for a user: pushTokens docs, deduped by token value so a device
// listed twice is sent one message.
async function loadTokens(db, uid, { includeStale = false, nowMs = Date.now() } = {}) {
  const snap = await db.collection(`users/${uid}/pushTokens`).get()
  const seen = new Set()
  const entries = []
  for (const d of snap.docs) {
    const data = d.data()
    if (!data?.token || seen.has(data.token)) continue
    if (data.status === 'stale') {
      if (data.staleSince && nowMs - data.staleSince > STALE_PURGE_MS) {
        await d.ref.delete().catch(() => {})
        continue
      }
      if (!includeStale) continue
    }
    seen.add(data.token)
    entries.push({ ref: d.ref, id: d.id, label: data.label ?? 'Dispositivo', token: data.token, staleSince: data.staleSince })
  }
  return entries
}

// The service worker reads `data.open` on click to open that view of the app.
function toMessage(token, { title, body }, { tag, open } = {}) {
  return {
    token,
    notification: { title, body },
    ...(open ? { data: { open } } : {}),
    webpush: { notification: { icon: '/icon-192.png', badge: '/icon-192.png', ...(tag ? { tag } : {}) } },
  }
}

// Daily expiry summary for one user, at their chosen time, once per local day.
// `send(message, opts)` delivers to all of the user's devices and returns the ok count.
async function processExpiry({ db, uid, prefs, nowMs, send }) {
  const tz = prefs.tz || DEFAULT_TZ
  if (!prefs.enabled || !shouldSendNow(prefs, nowMs)) return { sent: 0, skipped: 'not-now' }
  const today = localDateStr(nowMs, tz)
  if (prefs.lastRunDay === today) return { sent: 0, skipped: 'already-ran' }

  const markRan = () => db.doc(`users/${uid}/notificationPrefs/data`).set({ lastRunDay: today }, { merge: true }).catch(() => {})

  const inv = await db.doc(`users/${uid}/inventory/data`).get()
  const groups = inv.exists ? collectExpiring(inv.data(), prefs.daysBefore?.length ? prefs.daysBefore : [1], nowMs, tz) : []
  if (groups.length === 0) { await markRan(); return { sent: 0, skipped: 'nothing-expiring' } }

  const message = buildMessage(groups)
  const sent = await send(message, { tag: EXPIRY_TAG, open: 'scadenze' })
  await markRan()
  return { sent, message }
}

// Delivery to all of a user's active devices; tokens are loaded on the first push
// of the tick and reused by the next ones (expiry summary, meal reminders).
function userSender({ db, messaging, uid, nowMs }) {
  let entries
  return async (message, opts) => {
    entries ??= await loadTokens(db, uid, { nowMs })
    if (entries.length === 0) return 0
    const res = await messaging.sendEach(entries.map(e => toMessage(e.token, message, opts)))
    const results = await applyResults(entries, res.responses, nowMs)
    // Tokens just marked stale are not tried again in this tick.
    const ok = new Set(results.filter(r => r.status !== 'stale').map(r => r.deviceId))
    entries = entries.filter(e => ok.has(e.id))
    return results.filter(r => r.status === 'ok').length
  }
}

// One user at one tick: expiry summary and meal reminders. Returns what happened,
// for logging and tests.
async function processUser({ db, messaging, uid, prefs, nowMs }) {
  const send = userSender({ db, messaging, uid, nowMs })
  const expiry = await processExpiry({ db, uid, prefs, nowMs, send })
  const meals = await processMeals({ db, uid, prefs, nowMs, send }).catch(e => {
    console.error('meal reminders failed for user', uid, e)
    return { sent: 0, skipped: 'error' }
  })
  return { sent: expiry.sent + meals.sent, expiry, meals }
}

// Used by the scheduler: loads every user's prefs (batched) and processes the due
// ones: expiry alerts at their time, meal reminders at every tick when switched on.
async function runTick({ db, messaging, nowMs = Date.now() }) {
  const userRefs = await db.collection('users').listDocuments()
  const summary = { users: userRefs.length, due: 0, sent: 0 }
  const CHUNK = 100
  for (let i = 0; i < userRefs.length; i += CHUNK) {
    const chunk = userRefs.slice(i, i + CHUNK)
    const prefSnaps = await db.getAll(...chunk.map(r => db.doc(`users/${r.id}/notificationPrefs/data`)))
    for (let j = 0; j < chunk.length; j++) {
      const uid = chunk[j].id
      const prefs = prefSnaps[j].exists ? prefSnaps[j].data() : null
      if (!prefs) continue
      const expiryDue = prefs.enabled && shouldSendNow(prefs, nowMs)
      if (!expiryDue && prefs.meals?.enabled !== true) continue
      summary.due++
      try {
        const r = await processUser({ db, messaging, uid, prefs, nowMs })
        summary.sent += r.sent
      } catch (e) {
        console.error('notify failed for user', uid, e)
      }
    }
  }
  return summary
}

// Test notification to all of the user's devices (stale ones included, so the
// result shows whether they are reachable again).
async function sendTest({ db, messaging, uid, nowMs = Date.now() }) {
  const entries = await loadTokens(db, uid, { includeStale: true, nowMs })
  if (entries.length === 0) return { results: [] }
  const res = await messaging.sendEach(entries.map(e => toMessage(e.token, {
    title: 'Notifica di prova',
    body: 'Gli avvisi di scadenza funzionano su questo dispositivo.',
  }, { tag: TEST_TAG })))
  return { results: await applyResults(entries, res.responses, nowMs) }
}

module.exports = {
  collectExpiring, estimatedOffset, buildMessage, nameList, loadTokens, toMessage, processExpiry, processUser, runTick, sendTest,
}
