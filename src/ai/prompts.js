// Bump PROMPT_VERSION whenever a prompt changes: it is part of the cache hash,
// so cached answers produced by an older prompt are not served again.
import { STAPLES } from '../data/staples.js'
import { PREFERENCE_KINDS } from '../data/preferences.js'

export const PROMPT_VERSION = 'v5'

// Staples are listed in the recipe but never count as missing or to buy.
const STAPLES_NOTE =
  `Dai per scontato che io abbia sempre in casa ${STAPLES.join(', ')} e le altre cose che ogni cucina ha (non contarli tra gli ingredienti da comprare né tra quelli mancanti).`

// The user's food preferences (Tu › Preferenze alimentari), '' when there are none.
// Allergies and diet are constraints; tastes and habits are hints.
export function preferencesNote(preferences = []) {
  if (!preferences.length) return ''
  const lines = PREFERENCE_KINDS
    .map(k => [k, preferences.filter(p => p.kind === k.id)])
    .filter(([, list]) => list.length > 0)
    .map(([k, list]) => `- ${k.label}${k.strict ? ' (vincolo, rispettalo sempre)' : ''}: ${list.map(p => p.text).join('; ')}`)
  return `Le mie preferenze alimentari:\n${lines.join('\n')}\n`
}

const RECIPE_SYSTEM =
  'Sei un cuoco italiano pratico. Rispondi in italiano. Usa ## solo per il titolo di ogni ricetta, ### per le sezioni interne e - per le liste.'

function prefsBlock(preferences) {
  const note = preferencesNote(preferences)
  return note ? `${note}\n` : ''
}

export const RECIPE_FORMAT =
  'Formato di ogni ricetta, senza altro testo prima o dopo:\n' +
  '## Titolo\n' +
  '**Tempo:** … · **Porzioni:** …\n' +
  '### Ingredienti\n- ingrediente e quantità (usa "q.b." quando serve)\n' +
  '### Procedimento\n- 3-4 passi'

export function ricettePrompts({ inventoryText, seasonal, month, preferences = [] }) {
  return {
    system: RECIPE_SYSTEM,
    user:
      `Dispensa:\n${inventoryText}\n\n` +
      'Legenda dei marcatori: [APERTO] = confezione aperta, da consumare presto; [presto] = prodotto fresco comprato da qualche giorno, da usare presto; [scad] = già scaduto (non usarlo, ricordami di controllarlo); [oggi] = scade oggi; [1gg], [2gg], [3gg] = scade tra 1, 2, 3 giorni. ' +
      'Dai priorità ai prodotti che scadono prima ([oggi], poi [1gg], [2gg], [3gg]) e poi a quelli [APERTO] o [presto].\n\n' +
      `Suggerisci 3 ricette fattibili con questi ingredienti (${month}, Lombardia). Stagionale del mese: ${seasonal}. ${STAPLES_NOTE}\n\n` +
      prefsBlock(preferences) +
      RECIPE_FORMAT,
  }
}

// Recipes built around one seasonal ingredient (tapped on Oggi). `exclude`:
// titles already shown, so "Altre idee" brings new ones.
export function stagionePrompts({ ingredient, inventoryText, month, exclude = [], preferences = [] }) {
  return {
    system: RECIPE_SYSTEM,
    user:
      `Ingrediente di stagione (${month}, Lombardia): ${ingredient}.\n\n` +
      `Dispensa:\n${inventoryText}\n\n` +
      `Suggerisci 3 ricette in cui ${ingredient} è protagonista, varie tra loro (es. primo, secondo o contorno, dolce se adatto). ` +
      'Usa il più possibile ciò che ho in dispensa, dando priorità a ciò che scade presto ([oggi], [1gg], [2gg], [3gg]), è [APERTO] o va usato [presto]; non usare ciò che è [scad]. ' +
      `Puoi richiedere pochi ingredienti da comprare oltre all'ingrediente di stagione. ${STAPLES_NOTE}\n` +
      (exclude.length ? `Evita queste ricette, già proposte: ${exclude.join('; ')}.\n` : '') +
      (preferences.length ? '\n' + preferencesNote(preferences) : '') +
      '\n' + RECIPE_FORMAT,
  }
}

export function spesaPrompts({ inventoryText, seasonal, month, preferences = [] }) {
  return {
    system:
      'Sei un esperto di spesa italiana stagionale. Rispondi in italiano. Usa ## per categorie e - per liste.',
    user:
      `Dispensa:\n${inventoryText}\n\nCrea lista della spesa per 7 giorni (${month}, Lombardia). Non duplicare ciò che ho già. ${STAPLES_NOTE} Stagionale del mese: ${seasonal}.\n\n${prefsBlock(preferences)}Organizza per categoria.`,
  }
}
