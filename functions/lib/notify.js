// Expiry notifications: pure builders plus processUser/sendTest, which take the
// Firestore and Messaging instances as arguments so they can be tested with fakes.
const { DEFAULT_TZ, dayWindow, localDateStr, shouldSendNow } = require('./schedule')

const SECTIONS = ['credenza', 'frigo', 'freezer']
const STALE_CODES = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]
const STALE_PURGE_MS = 30 * 24 * 3600 * 1000
const MAX_NAMES = 3

const DEFAULT_PREFS = { enabled: true, hour: 9, minute: 0, daysBefore: [1], tz: DEFAULT_TZ }

function dayLabel(offset) {
  if (offset === 0) return 'Oggi'
  if (offset === 1) return 'Domani'
  return `Tra ${offset} giorni`
}

// Items whose expiry falls on each of the chosen days → [{ offset, names }]
function collectExpiring(inventory, daysBefore, nowMs, tz) {
  const days = [...new Set(daysBefore)].filter(d => Number.isInteger(d) && d >= 0).sort((a, b) => a - b)
  const groups = []
  for (const offset of days) {
    const [start, end] = dayWindow(nowMs, tz, offset)
    const names = []
    for (const section of SECTIONS) {
      for (const item of (inventory?.[section] ?? [])) {
        if (item.expiresAt && item.expiresAt >= start && item.expiresAt <= end) names.push(item.name)
      }
    }
    if (names.length > 0) groups.push({ offset, names })
  }
  return groups
}

function nameList(names) {
  const shown = names.slice(0, MAX_NAMES).join(', ')
  return names.length > MAX_NAMES ? `${shown} +${names.length - MAX_NAMES} altri` : shown
}

function buildMessage(groups) {
  if (groups.length === 1) {
    const { offset, names } = groups[0]
    const title = offset === 0 ? '⏰ Scade oggi' : offset === 1 ? '⏰ Scade domani' : `⏰ Scade tra ${offset} giorni`
    return { title, body: nameList(names) }
  }
  return {
    title: '⏰ Prodotti in scadenza',
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

// Token entries for a user: pushTokens docs (deduped by token value), plus the
// legacy pushToken/data token while nothing newer exists.
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
  if (entries.length === 0) {
    const legacy = await db.doc(`users/${uid}/pushToken/data`).get()
    const ld = legacy.exists ? legacy.data() : null
    if (ld?.token && (includeStale || ld.enabled) && !seen.has(ld.token)) {
      entries.push({ ref: null, id: 'legacy', label: 'Dispositivo precedente', token: ld.token })
    }
  }
  return entries
}

function toMessage(token, { title, body }) {
  return {
    token,
    notification: { title, body },
    webpush: { notification: { icon: '/icon-192.png', badge: '/icon-192.png' } },
  }
}

// One user at one tick. Returns what happened, for logging and tests.
async function processUser({ db, messaging, uid, prefs, nowMs }) {
  const tz = prefs.tz || DEFAULT_TZ
  if (!prefs.enabled || !shouldSendNow(prefs, nowMs)) return { sent: 0, skipped: 'not-now' }
  const today = localDateStr(nowMs, tz)
  if (prefs.lastRunDay === today) return { sent: 0, skipped: 'already-ran' }

  const markRan = () => db.doc(`users/${uid}/notificationPrefs/data`).set({ lastRunDay: today }, { merge: true }).catch(() => {})

  const inv = await db.doc(`users/${uid}/inventory/data`).get()
  const groups = inv.exists ? collectExpiring(inv.data(), prefs.daysBefore?.length ? prefs.daysBefore : [1], nowMs, tz) : []
  if (groups.length === 0) { await markRan(); return { sent: 0, skipped: 'nothing-expiring' } }

  const entries = await loadTokens(db, uid, { nowMs })
  if (entries.length === 0) { await markRan(); return { sent: 0, skipped: 'no-tokens' } }

  const message = buildMessage(groups)
  const res = await messaging.sendEach(entries.map(e => toMessage(e.token, message)))
  const results = await applyResults(entries, res.responses, nowMs)
  await markRan()
  return { sent: results.filter(r => r.status === 'ok').length, results, message }
}

// Used by the scheduler: loads every user's prefs (batched) and processes the due ones.
async function runTick({ db, messaging, nowMs = Date.now() }) {
  const userRefs = await db.collection('users').listDocuments()
  const summary = { users: userRefs.length, due: 0, sent: 0 }
  const CHUNK = 100
  for (let i = 0; i < userRefs.length; i += CHUNK) {
    const chunk = userRefs.slice(i, i + CHUNK)
    const prefSnaps = await db.getAll(...chunk.map(r => db.doc(`users/${r.id}/notificationPrefs/data`)))
    for (let j = 0; j < chunk.length; j++) {
      const uid = chunk[j].id
      let prefs = prefSnaps[j].exists ? prefSnaps[j].data() : null
      if (!prefs) {
        // Transition: a user with only the old pushToken/data keeps the old 09:00 behaviour.
        const legacy = await db.doc(`users/${uid}/pushToken/data`).get()
        if (!(legacy.exists && legacy.data()?.enabled && legacy.data()?.token)) continue
        prefs = { ...DEFAULT_PREFS }
      }
      if (!prefs.enabled || !shouldSendNow(prefs, nowMs)) continue
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
  })))
  return { results: await applyResults(entries, res.responses, nowMs) }
}

module.exports = {
  collectExpiring, buildMessage, nameList, loadTokens, processUser, runTick, sendTest, DEFAULT_PREFS,
}
