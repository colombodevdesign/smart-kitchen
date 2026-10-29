import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildUserContext, diffSnapshots } from './userContext.js'

const NOW = new Date(2026, 9, 28, 19, 0)
const DAY = 86400000

function base() {
  return {
    inventory: {
      credenza: [{ id: 'c1', name: 'Pasta', qty: '500 g', added: NOW - 10 * DAY, expiresAt: null, urgent: false }],
      frigo: [
        { id: 'f1', name: 'Latte intero', qty: '1 l', added: NOW - DAY, expiresAt: NOW.getTime(), urgent: false },
        { id: 'f2', name: 'Yogurt greco', qty: '', added: NOW - 3 * DAY, expiresAt: null, urgent: false },
      ],
      freezer: [],
    },
    meals: {
      '2026-10-27': [{ id: 'm1', text: 'Pasta e fagioli', category: 'cena', createdAt: 1 }],
      '2026-10-28': [{ id: 'm2', text: 'Frittata', category: 'cena', planned: true, time: '20:00', createdAt: 2 }],
    },
    savedRecipes: [{ id: 'r1', title: 'Risotto alla zucca' }],
    shopping: [
      { id: 's1', name: 'Pane', qty: '1', checked: false },
      { id: 's2', name: 'Detersivo', qty: '', checked: true },
    ],
    preferences: { items: [{ id: 'p1', kind: 'allergia', text: 'Frutta a guscio' }], dismissed: ['coriandolo'] },
    now: NOW,
  }
}

const clone = (v) => JSON.parse(JSON.stringify(v))

test('context text covers pantry, meals, recipes, shopping and preferences', () => {
  const { text } = buildUserContext(base())
  assert.match(text, /Frigo: Latte intero 1 l\[oggi\]/)
  assert.match(text, /Pasti in programma[^]*oggi, Cena, 20:00: Frittata/)
  assert.match(text, /mangiati[^]*ieri, Cena: Pasta e fagioli/)
  assert.match(text, /- Risotto alla zucca/)
  assert.match(text, /- Pane 1/)
  assert.doesNotMatch(text, /Detersivo/)
  assert.match(text, /Allergie e intolleranze \(vincolo[^]*Frutta a guscio/)
  assert.match(text, /non riproporle\): coriandolo/)
})

test('no previous snapshot or no change: nothing to report', () => {
  const { snapshot } = buildUserContext(base())
  assert.deepEqual(diffSnapshots(null, snapshot, NOW), [])
  assert.deepEqual(diffSnapshots(snapshot, clone(snapshot), NOW), [])
})

test('pantry changes: added, gone, moved, opened, quantity', () => {
  const before = buildUserContext(base()).snapshot
  const input = base()
  input.inventory.frigo = input.inventory.frigo.filter(i => i.id !== 'f1')
  input.inventory.frigo.push({ id: 'f3', name: 'Uova', qty: '6', added: NOW.getTime(), expiresAt: null })
  input.inventory.frigo[0] = { ...input.inventory.frigo[0], urgent: true, qty: '1 vasetto' }
  input.inventory.freezer.push(input.inventory.credenza.pop())
  const lines = diffSnapshots(before, buildUserContext(input).snapshot, NOW)
  assert.ok(lines.includes('Aggiunto in Frigo: Uova (6)'))
  assert.ok(lines.includes('Non c’è più: Latte intero'))
  assert.ok(lines.includes('Spostato in Freezer: Pasta'))
  assert.ok(lines.includes('Segnato come aperto: Yogurt greco'))
  assert.ok(lines.includes('Quantità di Yogurt greco: — → 1 vasetto'))
})

test('shopping, meals and preferences changes', () => {
  const before = buildUserContext(base()).snapshot
  const input = base()
  input.shopping[0] = { ...input.shopping[0], checked: true }
  input.shopping.push({ id: 's3', name: 'Menta', qty: '', checked: false })
  input.meals['2026-10-28'] = [{ id: 'm2', text: 'Frittata', category: 'cena', createdAt: 2 }]
  input.meals['2026-10-29'] = [{ id: 'm3', text: 'Vellutata', category: 'pranzo', planned: true, createdAt: 3 }]
  input.preferences.items.push({ id: 'p2', kind: 'non-piace', text: 'Funghi' })
  const lines = diffSnapshots(before, buildUserContext(input).snapshot, NOW)
  assert.ok(lines.includes('Comprato: Pane'))
  assert.ok(lines.includes('Aggiunto alla spesa: Menta'))
  assert.ok(lines.includes('Mangiato: Frittata'))
  assert.ok(lines.includes('Pasto in programma domani: Vellutata'))
  assert.ok(lines.includes('Nuova preferenza: Funghi'))
})

test('long lists of changes are summed up', () => {
  const before = buildUserContext(base()).snapshot
  const input = base()
  for (let i = 0; i < 20; i++) input.inventory.credenza.push({ id: `x${i}`, name: `Prodotto ${i}`, qty: '' })
  const lines = diffSnapshots(before, buildUserContext(input).snapshot, NOW)
  assert.equal(lines.length, 12)
  assert.equal(lines.at(-1), '…e altre 9 modifiche')
})
