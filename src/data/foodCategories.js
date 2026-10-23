// Categories the AI assigns to pantry items (item.ai.category). The order is the
// order of the groups in Dispensa → "Per categoria": fresh food first.
export const FOOD_CATEGORIES = [
  { id: 'verdura',        label: 'Verdura' },
  { id: 'frutta',         label: 'Frutta' },
  { id: 'carne',          label: 'Carne e salumi' },
  { id: 'pesce',          label: 'Pesce' },
  { id: 'latticini',      label: 'Latticini e formaggi' },
  { id: 'uova',           label: 'Uova' },
  { id: 'pane',           label: 'Pane e prodotti da forno' },
  { id: 'pronti',         label: 'Piatti pronti' },
  { id: 'pasta-cereali',  label: 'Pasta, riso e cereali' },
  { id: 'legumi',         label: 'Legumi' },
  { id: 'conserve',       label: 'Conserve e scatolame' },
  { id: 'salse',          label: 'Salse e condimenti' },
  { id: 'spezie',         label: 'Spezie, dadi e aromi' },
  { id: 'dolci',          label: 'Dolci, snack e colazione' },
  { id: 'bevande',        label: 'Bevande' },
  { id: 'altro',          label: 'Altro' },
  { id: 'non-alimentare', label: 'Non alimentare' },
]

export const CATEGORY_IDS = FOOD_CATEGORIES.map(c => c.id)

export const CATEGORY_LABELS = Object.fromEntries(FOOD_CATEGORIES.map(c => [c.id, c.label]))

// Days an opened product keeps, by section, while the AI has not analysed it yet.
// functions/lib/notify.js keeps a copy: change both.
export const FALLBACK_OPEN_DAYS = { credenza: 30, frigo: 5, freezer: 60 }
