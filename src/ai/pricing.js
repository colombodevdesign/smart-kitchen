// Prezzi Gemini in USD per 1M di token e calcolo del costo dai contatori di usage.js.
// Per cambiare i modelli si tocca solo model.js; qui va aggiunta la riga del prezzo.
// FONTE: aggregatori di terze parti (ottobre 2026), da verificare su
// https://ai.google.dev/gemini-api/docs/pricing — non è la pagina ufficiale.
// Ogni voce vale dal giorno `from` (UTC) fino alla successiva.
export const PRICING = {
  // Tariffa introduttiva; secondo le fonti raddoppia dal 2027-01-01.
  // `cached` dopo l'aumento è un'ipotesi (raddoppio proporzionale): confermare.
  'gemini-3.8-flash': [
    { from: '0000-01-01', input: 0.75, output: 3.75, cached: 0.075 },
    { from: '2027-01-01', input: 1.5, output: 7.5, cached: 0.15 },
  ],
  'gemini-3.5-flash-lite': [
    { from: '0000-01-01', input: 0.3, output: 2.5, cached: 0.03 },
  ],
}

export function rateFor(model, day) {
  const table = PRICING[model]
  if (!table) return null
  let rate = null
  for (const r of table) if (r.from <= day) rate = r
  return rate
}

// usage: { input, output, thoughts, cached } → USD, o null se il modello non ha un prezzo.
export function costOf(model, usage, day) {
  const rate = rateFor(model, day)
  if (!rate) return null
  const fresh = Math.max(0, usage.input - usage.cached)
  const out = usage.output + usage.thoughts
  return (fresh * rate.input + usage.cached * rate.cached + out * rate.output) / 1e6
}

const empty = () => ({ calls: 0, input: 0, output: 0, thoughts: 0, cached: 0, cost: 0 })
const add = (acc, u, cost) => {
  acc.calls += u.calls
  acc.input += u.input
  acc.output += u.output
  acc.thoughts += u.thoughts
  acc.cached += u.cached
  acc.cost += cost
}

// docs: [{ day, byKey: { [key]: { feature, model, calls, input, output, thoughts, cached } } }]
// → totali, per modello, per funzione e per giorno nell'intervallo [since, until] (giorni YYYY-MM-DD,
// estremi inclusi). I modelli senza prezzo contano nei token ma non nel costo e finiscono in `unpriced`.
export function summarize(docs, { since = '0000-01-01', until = '9999-12-31' } = {}) {
  const total = empty()
  const byModel = {}
  const byFeature = {}
  const byDay = {}
  const unpriced = new Set()
  for (const doc of docs) {
    if (!doc?.day || doc.day < since || doc.day > until) continue
    for (const entry of Object.values(doc.byKey ?? {})) {
      const u = {
        calls: entry.calls ?? 0, input: entry.input ?? 0, output: entry.output ?? 0,
        thoughts: entry.thoughts ?? 0, cached: entry.cached ?? 0,
      }
      const cost = costOf(entry.model, u, doc.day)
      if (cost === null) unpriced.add(entry.model)
      const c = cost ?? 0
      add(total, u, c)
      add(byModel[entry.model] ??= empty(), u, c)
      add(byFeature[entry.feature] ??= empty(), u, c)
      add(byDay[doc.day] ??= empty(), u, c)
    }
  }
  return { total, byModel, byFeature, byDay, unpriced: [...unpriced] }
}
