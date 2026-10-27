// node --test (from functions/): pure meal-reminder logic and processUser with fakes.
const test = require('node:test')
const assert = require('node:assert/strict')
const { localToUtc } = require('../lib/schedule')
const { reminderMinute, dueMealReminders, needsDinnerNudge, processMeals } = require('../lib/meals')
const { processUser } = require('../lib/notify')

const ROME = 'Europe/Rome'
const NY = 'America/New_York'
const at = (date, hh, mm, tz = ROME) => {
  const [y, m, d] = date.split('-').map(Number)
  return localToUtc(y, m, d, hh, mm, tz)
}
const MIN = 60 * 1000
const prefs = { enabled: true, lead: '30', dinnerNudge: false }
const planned = (id, category, lead, extra = {}) => ({ id, text: `Pasto ${id}`, category, planned: true, reminder: { lead }, ...extra })

test('reminderMinute: leads, morning and midnight', () => {
  assert.equal(reminderMinute('19:30', '30'), 19 * 60)
  assert.equal(reminderMinute('19:30', '60'), 18 * 60 + 30)
  assert.equal(reminderMinute('19:30', 'at'), 19 * 60 + 30)
  assert.equal(reminderMinute('19:30', 'am'), 9 * 60)
  assert.equal(reminderMinute('08:00', 'am'), 7 * 60) // breakfast: "in the morning" becomes 1 hour before
  assert.equal(reminderMinute('00:20', '30'), null)   // would be the day before
  assert.equal(reminderMinute('', '30'), null)
  assert.equal(reminderMinute('19:30', null), null)
})

test('due at the first tick at or after the reminder, not before', () => {
  const meals = { '2026-10-21': [planned('a', 'cena', '30')] } // 19:30 → 19:00
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 18, 45), ROME).length, 0)
  const due = dueMealReminders(meals, prefs, at('2026-10-21', 19, 0), ROME)
  assert.deepEqual(due.map(d => d.id), ['a'])
  assert.equal(due[0].title, 'Cena alle 19:30')
  assert.equal(due[0].body, 'Pasto a')
  // A late tick still sends it; one 20+ minutes late does not.
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 19, 15), ROME).length, 1)
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 19, 21), ROME).length, 0)
})

test('reminder between two ticks goes out at the next one', () => {
  const meals = { '2026-10-21': [planned('a', 'pranzo', '30', { time: '13:10' })] } // → 12:40
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 12, 30), ROME).length, 0)
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 12, 45), ROME).length, 1)
})

test('only planned meals with a reminder, once per id and time', () => {
  const now = at('2026-10-21', 19, 0)
  const meals = { '2026-10-21': [
    planned('a', 'cena', '30'),
    { id: 'b', text: 'Mangiato', category: 'cena' },
    { id: 'c', text: 'Senza avviso', category: 'cena', planned: true, reminder: null },
  ] }
  const due = dueMealReminders(meals, prefs, now, ROME)
  assert.deepEqual(due.map(d => d.id), ['a'])
  assert.equal(dueMealReminders(meals, prefs, now, ROME, { [due[0].key]: now }).length, 0)
  // Moved to another time: a new key, so it is reminded again.
  const moved = { '2026-10-21': [planned('a', 'cena', '30', { time: '19:45' })] }
  assert.equal(dueMealReminders(moved, prefs, at('2026-10-21', 19, 15), ROME, { [due[0].key]: now }).length, 1)
})

test('category times from the settings', () => {
  const meals = { '2026-10-21': [planned('a', 'cena', '60')] }
  const custom = { ...prefs, times: { cena: '21:00' } }
  assert.equal(dueMealReminders(meals, custom, at('2026-10-21', 18, 30), ROME).length, 0)
  assert.equal(dueMealReminders(meals, custom, at('2026-10-21', 20, 0), ROME).length, 1)
})

test('time zones: the local time of the user counts', () => {
  const meals = { '2026-10-21': [planned('a', 'cena', 'at')] } // 19:30 local
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 19, 30, NY), NY).length, 1)
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 19, 30, ROME), NY).length, 0)
})

test('DST days in Rome (29 March, 25 October 2026)', () => {
  for (const day of ['2026-03-29', '2026-10-25']) {
    const meals = { [day]: [planned('a', 'pranzo', '30')] } // 12:30 → 12:00 local
    const noon = at(day, 12, 0)
    assert.equal(new Date(noon).toLocaleTimeString('it-IT', { timeZone: ROME, hour: '2-digit', minute: '2-digit' }), '12:00')
    assert.equal(dueMealReminders(meals, prefs, noon - 15 * MIN, ROME).length, 0)
    assert.equal(dueMealReminders(meals, prefs, noon, ROME).length, 1)
  }
})

test('yesterday after midnight', () => {
  const meals = { '2026-10-21': [planned('a', 'spuntino', '30', { time: '23:59' })] } // → 23:29
  assert.equal(dueMealReminders(meals, prefs, at('2026-10-21', 23, 30), ROME).length, 1)
  const late = { '2026-10-21': [planned('b', 'spuntino', 'at', { time: '23:55' })] }
  assert.equal(dueMealReminders(late, prefs, at('2026-10-22', 0, 0), ROME).length, 1)
})

test('dinner nudge at 17:00 only without a dinner, once a day', () => {
  const on = { ...prefs, dinnerNudge: true }
  const five = at('2026-10-21', 17, 0)
  assert.equal(needsDinnerNudge({}, on, five, ROME), true)
  assert.equal(needsDinnerNudge({}, prefs, five, ROME), false)
  assert.equal(needsDinnerNudge({}, on, at('2026-10-21', 16, 45), ROME), false)
  assert.equal(needsDinnerNudge({}, on, at('2026-10-21', 17, 30), ROME), false)
  assert.equal(needsDinnerNudge({ '2026-10-21': [planned('a', 'cena', '30')] }, on, five, ROME), false)
  assert.equal(needsDinnerNudge({ '2026-10-21': [{ id: 'b', category: 'cena', text: 'x' }] }, on, five, ROME), false)
  assert.equal(needsDinnerNudge({}, on, five, ROME, '2026-10-21'), false)
})

// Minimal Firestore + Messaging fakes.
function fakes(docs) {
  const store = { ...docs }
  const ref = (path) => ({
    path,
    get: async () => ({ exists: path in store, data: () => store[path] }),
    set: async (data, opts) => { store[path] = opts?.merge ? { ...(store[path] ?? {}), ...data } : data },
    delete: async () => { delete store[path] },
  })
  let autoId = 0
  const docsIn = (path) => Object.keys(store)
    .filter(k => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/'))
    .map(k => ({ id: k.slice(path.length + 1), ref: ref(k), data: () => store[k] }))
  const db = {
    doc: ref,
    collection: (path) => ({
      get: async () => ({ docs: docsIn(path) }),
      doc: (id) => ({ id: id ?? `n${++autoId}`, ...ref(`${path}/${id ?? `n${autoId}`}`) }),
      where: (field, op, value) => ({
        limit: (n) => ({
          get: async () => ({
            docs: docsIn(path).filter(d => op === '<' && d.data()[field] < value).slice(0, n),
          }),
        }),
      }),
    }),
  }
  const sentMessages = []
  // `fail`: tokens FCM rejects as no longer registered.
  const messaging = {
    fail: new Set(),
    sendEach: async (msgs) => {
      sentMessages.push(...msgs)
      return {
        responses: msgs.map(m => (messaging.fail.has(m.token)
          ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
          : { success: true })),
      }
    },
  }
  return { db, messaging, store, sentMessages }
}

const inbox = (store, uid) => Object.entries(store)
  .filter(([k]) => k.startsWith(`users/${uid}/notifications/`))
  .map(([k, v]) => ({ id: k.split('/').pop(), ...v }))

test('processUser: meal reminder without expiry alerts, recorded and not repeated', async () => {
  const uid = 'u1'
  const now = at('2026-10-21', 19, 0)
  const userPrefs = { enabled: false, tz: ROME, meals: prefs }
  const { db, messaging, store, sentMessages } = fakes({
    [`users/${uid}/meals/data`]: { '2026-10-21': [planned('a', 'cena', '30', { recipeTitle: 'Risotto alla zucca' })] },
    [`users/${uid}/pushTokens/d1`]: { token: 't1', status: 'active', label: 'iPhone' },
  })
  const r = await processUser({ db, messaging, uid, prefs: userPrefs, nowMs: now })
  assert.equal(r.sent, 1)
  assert.equal(r.expiry.skipped, 'not-now')
  assert.equal(sentMessages[0].webpush.notification.tag, 'sk-pasto-a')
  const [entry] = inbox(store, uid)
  assert.equal(entry.type, 'pasto')
  assert.equal(entry.title, 'Cena alle 19:30')
  assert.equal(entry.open, 'pasti')
  assert.equal(entry.readAt, null)
  assert.deepEqual(sentMessages[0].data, { open: 'pasti', nid: entry.id })
  assert.equal(sentMessages[0].notification.body, 'Pasto a · ricetta: Risotto alla zucca')
  assert.ok(Object.keys(store[`users/${uid}/mealReminders/data`].sent).length === 1)
  const again = await processUser({ db, messaging, uid, prefs: userPrefs, nowMs: now + 5 * MIN })
  assert.equal(again.sent, 0)
  assert.equal(sentMessages.length, 1)
})

test('processMeals: off does not read anything', async () => {
  const db = { doc: () => { throw new Error('read') } }
  const r = await processMeals({ db, uid: 'u', prefs: { meals: { enabled: false } }, nowMs: Date.now(), send: async () => 1 })
  assert.equal(r.skipped, 'off')
})

test('processUser: the expiry summary still goes out at its time, alongside meal reminders', async () => {
  const uid = 'u2'
  const now = at('2026-10-21', 9, 0)
  const tomorrowEnd = at('2026-10-22', 23, 59)
  const { db, messaging, store, sentMessages } = fakes({
    [`users/${uid}/inventory/data`]: { credenza: [], frigo: [{ id: 'f1', name: 'Latte', expiresAt: tomorrowEnd }], freezer: [] },
    [`users/${uid}/meals/data`]: { '2026-10-21': [planned('b', 'colazione', 'at', { time: '09:00' })] },
    [`users/${uid}/pushTokens/d1`]: { token: 't1', status: 'active' },
  })
  const userPrefs = { enabled: true, hour: 9, minute: 0, daysBefore: [1], tz: ROME, meals: prefs }
  const r = await processUser({ db, messaging, uid, prefs: userPrefs, nowMs: now })
  assert.equal(r.sent, 2)
  assert.deepEqual(sentMessages.map(m => m.webpush.notification.tag), ['sk-scadenze', 'sk-pasto-b'])
  assert.equal(store[`users/${uid}/notificationPrefs/data`].lastRunDay, '2026-10-21')
})

test('notification centre: kept without devices, old entries purged', async () => {
  const uid = 'u3'
  const now = at('2026-10-21', 17, 0)
  const old = now - 31 * 24 * 3600 * 1000
  const { db, messaging, store, sentMessages } = fakes({
    [`users/${uid}/notifications/old1`]: { type: 'scadenze', title: 'Vecchia', createdAt: old, readAt: null },
    [`users/${uid}/notifications/recent`]: { type: 'scadenze', title: 'Recente', createdAt: now - 3600 * 1000, readAt: null },
  })
  const r = await processUser({ db, messaging, uid, prefs: { enabled: false, tz: ROME, meals: { ...prefs, dinnerNudge: true } }, nowMs: now })
  assert.equal(r.sent, 0)
  assert.equal(sentMessages.length, 0)
  const titles = inbox(store, uid).map(n => n.title).sort()
  assert.deepEqual(titles, ['Cosa ceni stasera?', 'Recente'])
  assert.equal(inbox(store, uid).find(n => n.type === 'cena').open, 'pasti')
})

test('notification centre: a device that stops answering gets a note, once', async () => {
  const uid = 'u4'
  const now = at('2026-10-21', 19, 0)
  const { db, messaging, store } = fakes({
    [`users/${uid}/meals/data`]: { '2026-10-21': [planned('a', 'cena', '30')] },
    [`users/${uid}/pushTokens/d1`]: { token: 't1', status: 'active', label: 'iPad' },
    [`users/${uid}/pushTokens/d2`]: { token: 't2', status: 'active', label: 'iPhone' },
  })
  messaging.fail.add('t1')
  const r = await processUser({ db, messaging, uid, prefs: { enabled: false, tz: ROME, meals: prefs }, nowMs: now })
  assert.equal(r.sent, 1)
  const notes = inbox(store, uid).filter(n => n.type === 'dispositivo')
  assert.equal(notes.length, 1)
  assert.equal(notes[0].title, 'iPad non raggiungibile')
  assert.equal(notes[0].open, 'impostazioni')
  assert.equal(store[`users/${uid}/pushTokens/d1`].status, 'stale')
})
