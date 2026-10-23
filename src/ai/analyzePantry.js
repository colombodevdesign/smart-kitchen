import { GoogleGenAI } from '@google/genai'
import { MODEL_NAME } from './model.js'
import { CATEGORY_IDS } from '../data/foodCategories.js'

// Bump when the prompt or the metadata change: every item is analysed again.
export const ANALYSIS_VERSION = 'a1'

// The estimates depend on the name and on where the product is kept, so renaming
// or moving it makes item.ai stale (usePantryAnalysis then analyses it again).
export function analysisKey(item, section) {
  return `${ANALYSIS_VERSION}|${String(item.name ?? '').trim().toLowerCase()}|${section}`
}

const PROMPT = `Sei un esperto di conservazione degli alimenti. Ti do i prodotti della dispensa di una casa italiana, uno per riga: id | nome | quantità | dove è conservato (credenza, frigo o freezer).

Per ognuno restituisci:
- name: il nome generico dell'alimento come comparirebbe tra gli ingredienti di una ricetta, in minuscolo, senza marca, formato o quantità ("fagioli" per "Fagioli alla Bud Spencer", "parmigiano" per "Parmigiano Reggiano 24 mesi", "alici" per "Alici sott'olio Rizzoli"). Per i non alimentari una descrizione breve.
- category: la categoria più adatta tra quelle ammesse. "non-alimentare" per ciò che non si mangia.
- food: false per ciò che non si mangia e non si usa per cucinare (integratori, farmaci, detersivi, prodotti per la casa o per la persona); true per tutto il resto.
- openDays: per quanti giorni il prodotto resta buono una volta aperta la confezione, conservato dove indicato. Una stima realistica, come l'indicazione "da consumare entro N giorni dall'apertura". Esempi in frigo: latte 3, panna 3, affettati 3, mozzarella 2, alici sott'olio 5, pesto 5, passata 4, burro 30, ketchup o maionese 60, senape 90, cetriolini 60. In credenza: biscotti 14, cereali 30, pasta o riso secchi 180, farina 90, olio 90, spezie 365. In freezer: gelato 30, surgelati 60.
- freshDays: solo per i prodotti freschi che di solito si comprano senza una scadenza lunga stampata (frutta, verdura, pane fresco, carne o pesce dal banco, piatti fatti in casa), per quanti giorni dall'acquisto restano buoni dove sono conservati. Esempi: zucchine in frigo 6, insalata in frigo 4, carote in frigo 14, banane in credenza 5, cipolle in credenza 30, pane fresco in credenza 2, pollo fresco in frigo 2, pollo in freezer 180, minestrone fatto in casa in freezer 90. null per i prodotti confezionati a lunga conservazione o con una scadenza stampata (pasta, scatolame, salse, yogurt, latticini confezionati).

Restituisci un elemento per prodotto, con lo stesso id ricevuto. Restituisci SOLO JSON conforme allo schema.`

const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      category: { type: 'string', enum: CATEGORY_IDS },
      food: { type: 'boolean' },
      openDays: { type: 'integer', nullable: true },
      freshDays: { type: 'integer', nullable: true },
    },
    required: ['id', 'name', 'category', 'food'],
  },
}

const MAX_DAYS = 730

function days(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(MAX_DAYS, Math.max(1, Math.round(n)))
}

// entries: [{ id, name, qty, section }] → { [id]: { name, category, food, openDays, freshDays } }.
// Throws on failure: callers treat the analysis as optional and ignore errors.
export async function analyzePantry(apiKey, entries) {
  const ai = new GoogleGenAI({ apiKey })
  const clean = s => String(s ?? '').replace(/[|\n]/g, ' ').trim()
  const input = entries.map(e => `${e.id} | ${clean(e.name)} | ${clean(e.qty) || '-'} | ${e.section}`).join('\n')
  const res = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nProdotti:\n${input}` }] }],
    config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  })
  const parsed = JSON.parse(res.text)
  if (!Array.isArray(parsed)) throw new Error('Risposta non valida')
  const out = {}
  for (const entry of parsed) {
    if (!entry?.id) continue
    const category = CATEGORY_IDS.includes(entry.category) ? entry.category : 'altro'
    out[entry.id] = {
      name: String(entry.name ?? '').trim().toLowerCase(),
      category,
      food: entry.food !== false && category !== 'non-alimentare',
      openDays: days(entry.openDays),
      freshDays: days(entry.freshDays),
    }
  }
  return out
}
