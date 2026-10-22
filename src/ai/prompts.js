// Bump PROMPT_VERSION whenever a prompt changes: it is part of the cache hash,
// so cached answers produced by an older prompt are not served again.
export const PROMPT_VERSION = 'v2'

const RECIPE_SYSTEM =
  'Sei un cuoco italiano pratico. Rispondi in italiano. Usa ## solo per il titolo di ogni ricetta, ### per le sezioni interne e - per le liste.'

const RECIPE_FORMAT =
  'Formato di ogni ricetta, senza altro testo prima o dopo:\n' +
  '## Titolo\n' +
  '**Tempo:** … · **Porzioni:** …\n' +
  '### Ingredienti\n- ingrediente e quantità (usa "q.b." quando serve)\n' +
  '### Procedimento\n- 3-4 passi'

export function ricettePrompts({ inventoryText, seasonal, month }) {
  return {
    system: RECIPE_SYSTEM,
    user:
      `Dispensa:\n${inventoryText}\n\n` +
      'Legenda dei marcatori: [APERTO] = confezione aperta, da consumare presto; [scad] = già scaduto (non usarlo, ricordami di controllarlo); [oggi] = scade oggi; [1gg], [2gg], [3gg] = scade tra 1, 2, 3 giorni. ' +
      'Dai priorità ai prodotti che scadono prima ([oggi], poi [1gg], [2gg], [3gg]) e poi a quelli [APERTO].\n\n' +
      `Suggerisci 3 ricette fattibili con questi ingredienti (${month}, Lombardia). Stagionale del mese: ${seasonal}.\n\n` +
      RECIPE_FORMAT,
  }
}

// Recipes built around one seasonal ingredient (tapped on Oggi). `exclude`:
// titles already shown, so "Altre idee" brings new ones.
export function stagionePrompts({ ingredient, inventoryText, month, exclude = [] }) {
  return {
    system: RECIPE_SYSTEM,
    user:
      `Ingrediente di stagione (${month}, Lombardia): ${ingredient}.\n\n` +
      `Dispensa:\n${inventoryText}\n\n` +
      `Suggerisci 3 ricette in cui ${ingredient} è protagonista, varie tra loro (es. primo, secondo o contorno, dolce se adatto). ` +
      'Usa il più possibile ciò che ho in dispensa, dando priorità a ciò che scade presto ([oggi], [1gg], [2gg], [3gg]) o è [APERTO]; non usare ciò che è [scad]. ' +
      'Puoi richiedere pochi ingredienti da comprare oltre all\'ingrediente di stagione.\n' +
      (exclude.length ? `Evita queste ricette, già proposte: ${exclude.join('; ')}.\n` : '') +
      '\n' + RECIPE_FORMAT,
  }
}

export function spesaPrompts({ inventoryText, seasonal, month }) {
  return {
    system:
      'Sei un esperto di spesa italiana stagionale. Rispondi in italiano. Usa ## per categorie e - per liste.',
    user:
      `Dispensa:\n${inventoryText}\n\nCrea lista della spesa per 7 giorni (${month}, Lombardia). Non duplicare ciò che ho già. Stagionale del mese: ${seasonal}.\n\nOrganizza per categoria.`,
  }
}
