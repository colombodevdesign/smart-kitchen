import { GoogleGenAI } from '@google/genai'
import { MODEL_NAME } from './model.js'

const PROMPT = `Sei un assistente di cucina italiana. Ti do una o più ricette in testo. Per ognuna estrai l'elenco degli ingredienti in forma strutturata.

Regole:
- name: il nome generico dell'ingrediente come lo si compra, in minuscolo, senza quantità né aggettivi di preparazione ("zucchine", non "zucchine a rondelle"; "mozzarella", non "mozzarella tagliata a dadini").
- qty: la quantità in stringa libera ("500 g", "2", "1 l"). Stringa vuota se non indicata.
- qb: true per gli ingredienti senza quantità definita (q.b., un pizzico, a piacere), acqua e sale compresi.
- Un oggetto per ingrediente; non inventare ingredienti che non compaiono nella ricetta.
- Restituisci un elemento per ricetta, con lo stesso id ricevuto.
Restituisci SOLO JSON conforme allo schema.`

const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            qty: { type: 'string' },
            qb: { type: 'boolean' },
          },
          required: ['name'],
        },
      },
    },
    required: ['id', 'ingredients'],
  },
}

// recipes: [{ id, content }] → { [id]: [{ name, qty, qb }] }. Throws on failure:
// callers treat extraction as optional and ignore errors.
export async function extractIngredients(apiKey, recipes) {
  const ai = new GoogleGenAI({ apiKey })
  const input = recipes.map(r => `### ID: ${r.id}\n${r.content}`).join('\n\n')
  const res = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nRicette:\n\n${input}` }] }],
    config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  })
  const parsed = JSON.parse(res.text)
  if (!Array.isArray(parsed)) throw new Error('Risposta non valida')
  const out = {}
  for (const entry of parsed) {
    if (!entry?.id || !Array.isArray(entry.ingredients)) continue
    out[entry.id] = entry.ingredients
      .map(i => ({
        name: String(i.name ?? '').trim().toLowerCase(),
        qty: String(i.qty ?? '').trim(),
        qb: !!i.qb,
      }))
      .filter(i => i.name)
  }
  return out
}
