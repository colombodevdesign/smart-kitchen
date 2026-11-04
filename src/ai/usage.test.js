import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUsage, usageKey, dayKey } from './usage.js'
import { costOf, rateFor, summarize } from './pricing.js'

test('normalizeUsage: contatori interi, cached mai oltre l’input', () => {
  assert.deepEqual(
    normalizeUsage({ promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 50, cachedContentTokenCount: 5000 }),
    { input: 1000, output: 200, thoughts: 50, cached: 1000 },
  )
  assert.deepEqual(normalizeUsage(undefined), { input: 0, output: 0, thoughts: 0, cached: 0 })
  assert.deepEqual(normalizeUsage({ promptTokenCount: -3, candidatesTokenCount: NaN }), { input: 0, output: 0, thoughts: 0, cached: 0 })
})

test('usageKey non contiene punti; dayKey è il giorno UTC', () => {
  assert.equal(usageKey('ricette', 'gemini-3.8-flash'), 'ricette__gemini-3_8-flash')
  assert.equal(dayKey(Date.UTC(2026, 9, 22, 23, 59)), '2026-10-22')
})

test('costOf: il ragionamento si paga come output, la cache a tariffa ridotta', () => {
  const u = { input: 1_000_000, output: 500_000, thoughts: 500_000, cached: 200_000 }
  // 800k × 0,75 + 200k × 0,075 + 1M × 3,75 = 0,6 + 0,015 + 3,75
  assert.ok(Math.abs(costOf('gemini-3.8-flash', u, '2026-11-04') - 4.365) < 1e-9)
  assert.equal(costOf('modello-sconosciuto', u, '2026-11-04'), null)
})

test('rateFor: la tariffa cambia dal 2027-01-01', () => {
  assert.equal(rateFor('gemini-3.8-flash', '2026-12-31').output, 3.75)
  assert.equal(rateFor('gemini-3.8-flash', '2027-01-01').output, 7.5)
})

test('summarize: filtra per giorni, aggrega e segnala i modelli senza prezzo', () => {
  const e = (feature, model, calls, input, output) => ({ feature, model, calls, input, output, thoughts: 0, cached: 0 })
  const docs = [
    { day: '2026-10-21', byKey: { a: e('ricette', 'gemini-3.8-flash', 9, 9_000_000, 0) } },
    { day: '2026-10-22', byKey: {
      a: e('ricette', 'gemini-3.8-flash', 2, 1_000_000, 100_000),
      b: e('chat', 'gemini-3.8-flash', 1, 500_000, 0),
      c: e('voce', 'gemini-x', 4, 10, 10),
    } },
  ]
  const s = summarize(docs, { since: '2026-10-22' })
  assert.equal(s.total.calls, 7)
  assert.equal(s.byFeature.ricette.calls, 2)
  assert.ok(Math.abs(s.byModel['gemini-3.8-flash'].cost - (0.75 + 0.375 + 0.375)) < 1e-9)
  assert.deepEqual(s.unpriced, ['gemini-x'])
  assert.deepEqual(Object.keys(s.byDay), ['2026-10-22'])
})
