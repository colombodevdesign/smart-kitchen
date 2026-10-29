import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitActions, visibleText } from './chatActions.js'

const ANSWER = 'Ti manca solo la menta.\n\n```azioni\n' +
  '[{"type":"spesa","items":[{"name":"Menta fresca","qty":"1 mazzetto"},{"name":""}]},' +
  '{"type":"pasto","date":"2026-10-28","category":"cena","text":"Frittata","time":"20:00"},' +
  '{"type":"rimuovi","name":"Yogurt","section":"frigo"},' +
  '{"type":"preferenza","kind":"abitudine","text":"Ricette veloci","reason":"Chiesto 3 volte"},' +
  '{"type":"ordina-pizza"},{"type":"pasto","date":"domani","text":"x"}]\n```'

test('valid actions are kept, the block is removed', () => {
  const { text, actions } = splitActions(ANSWER)
  assert.equal(text, 'Ti manca solo la menta.')
  assert.deepEqual(actions.map(a => a.type), ['spesa', 'pasto', 'rimuovi', 'preferenza'])
  assert.deepEqual(actions[0].items, [{ name: 'Menta fresca', qty: '1 mazzetto' }])
  assert.equal(actions[1].time, '20:00')
  assert.ok(actions.every(a => a.status === 'pending'))
})

test('broken JSON or no block: no actions, text untouched', () => {
  assert.deepEqual(splitActions('Ciao').actions, [])
  const broken = splitActions('Ecco.\n```azioni\n[{"type":"spesa",\n```')
  assert.equal(broken.text, 'Ecco.')
  assert.deepEqual(broken.actions, [])
})

test('a single object instead of an array is accepted', () => {
  const { actions } = splitActions('Ok\n```azioni\n{"type":"rimuovi","name":"Latte"}\n```')
  assert.deepEqual(actions, [{ type: 'rimuovi', name: 'Latte', section: null, status: 'pending' }])
})

test('while streaming the block never shows', () => {
  assert.equal(visibleText('Ti manca la menta.\n\n``'), 'Ti manca la menta.')
  assert.equal(visibleText('Ti manca la menta.\n\n```azi'), 'Ti manca la menta.')
  assert.equal(visibleText('Ti manca la menta.\n\n```azioni\n[{"ty'), 'Ti manca la menta.')
  assert.equal(visibleText('Usa il `pepe`'), 'Usa il `pepe`')
})
