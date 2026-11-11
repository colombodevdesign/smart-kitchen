import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffDoc, applyOps, sameValue } from './docPatch.js'

const KEEP = ['credenza', 'frigo', 'freezer']
const item = (id, name, extra = {}) => ({ id, name, qty: '', urgent: false, added: 1, expiresAt: null, ...extra })

test('an edit made on an old copy does not erase what other devices did', () => {
  // The Mac, offline, still has the pantry of last week.
  const stale = { credenza: [item('c1', 'pasta')], frigo: [item('f1', 'latte')], freezer: [] }
  // Meanwhile the iPhone added the eggs, opened the milk and removed the pasta.
  const server = {
    credenza: [],
    frigo: [item('f1', 'latte', { urgent: true, openedAt: 5 }), item('f2', 'uova')],
    freezer: [],
  }
  // On the Mac: add the peas, rename the milk.
  const edited = {
    ...stale,
    frigo: [item('f1', 'latte intero')],
    freezer: [item('z1', 'piselli')],
  }
  const result = applyOps(server, diffDoc(stale, edited), KEEP)
  assert.deepEqual(result, {
    credenza: [],
    frigo: [item('f1', 'latte intero', { urgent: true, openedAt: 5 }), item('f2', 'uova')],
    freezer: [item('z1', 'piselli')],
  })
})

test('an edit to an item deleted elsewhere does not bring it back', () => {
  const stale = { credenza: [item('c1', 'pasta')], frigo: [], freezer: [] }
  const edited = { ...stale, credenza: [item('c1', 'pasta', { qty: '500 g' })] }
  const result = applyOps({ credenza: [], frigo: [], freezer: [] }, diffDoc(stale, edited), KEEP)
  assert.deepEqual(result.credenza, [])
})

test('moving an item is a removal plus an insertion', () => {
  const before = { credenza: [item('c1', 'pane')], frigo: [], freezer: [] }
  const after = { credenza: [], frigo: [], freezer: [item('c1', 'pane')] }
  const ops = diffDoc(before, after)
  assert.deepEqual(ops.map(o => o.op).sort(), ['del', 'put'])
  assert.deepEqual(applyOps(before, ops, KEEP), after)
})

test('removed fields are removed, undefined counts as absent', () => {
  const before = { items: [{ id: 'a', planned: true, time: '19:30', text: 'pizza' }] }
  const after = { items: [{ id: 'a', planned: undefined, time: undefined, text: 'pizza' }] }
  const ops = diffDoc(before, after)
  assert.deepEqual(ops, [{ op: 'patch', key: 'items', id: 'a', set: {}, unset: ['planned', 'time'] }])
  assert.deepEqual(applyOps(before, ops, ['items']), { items: [{ id: 'a', text: 'pizza' }] })
})

test('meals: days left empty disappear, a meal moved to another day keeps its id', () => {
  const before = { '2026-11-10': [{ id: '1', text: 'pasta' }] }
  const after = { '2026-11-12': [{ id: '1', text: 'pasta' }] }
  const server = { '2026-11-10': [{ id: '1', text: 'pasta' }], '2026-11-11': [{ id: '2', text: 'zuppa' }] }
  assert.deepEqual(applyOps(server, diffDoc(before, after)), {
    '2026-11-11': [{ id: '2', text: 'zuppa' }],
    '2026-11-12': [{ id: '1', text: 'pasta' }],
  })
})

test('lists of strings are merged as sets', () => {
  const before = { items: [], dismissed: ['a', 'b'] }
  const after = { items: [], dismissed: ['b', 'c'] }
  const server = { items: [], dismissed: ['a', 'b', 'x'] }
  assert.deepEqual(applyOps(server, diffDoc(before, after), ['items', 'dismissed']), {
    items: [],
    dismissed: ['b', 'x', 'c'],
  })
})

test('operations are idempotent', () => {
  const before = { items: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }] }
  const after = { items: [{ id: 'a', n: 3 }, { id: 'c', n: 4 }] }
  const ops = diffDoc(before, after)
  const once = applyOps(before, ops, ['items'])
  assert.deepEqual(applyOps(once, ops, ['items']), once)
  assert.deepEqual(once, after)
})

test('no change, no operations', () => {
  const doc = { credenza: [item('c1', 'riso', { ai: { key: 'k', category: 'cereali' } })], frigo: [], freezer: [] }
  assert.deepEqual(diffDoc(doc, structuredClone(doc)), [])
  assert.ok(sameValue({ a: 1, b: undefined }, { a: 1 }))
})

test('keep keys always exist', () => {
  assert.deepEqual(applyOps({}, [], KEEP), { credenza: [], frigo: [], freezer: [] })
})
