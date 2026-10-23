// Categories the AI assigns to pantry items (item.ai.category). The order is the
// one of the picker in the edit sheet: fresh food first.
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

// Groups of Dispensa → "Per categoria": each gathers one or more categories, so a
// section shows a handful of headings instead of one per category. They are derived
// from item.ai.category: changing them never needs a new analysis.
export const FOOD_GROUPS = [
  { id: 'frutta-verdura',   label: 'Frutta e verdura',      categories: ['verdura', 'frutta'] },
  { id: 'carne-pesce',      label: 'Carne, pesce e salumi', categories: ['carne', 'pesce'] },
  { id: 'latticini-uova',   label: 'Latticini e uova',      categories: ['latticini', 'uova'] },
  { id: 'pane-pasta',       label: 'Pane, pasta e cereali', categories: ['pane', 'pasta-cereali'] },
  { id: 'legumi-conserve',  label: 'Legumi e conserve',     categories: ['legumi', 'conserve'] },
  { id: 'salse-condimenti', label: 'Salse e condimenti',    categories: ['salse', 'spezie'] },
  { id: 'dolci',            label: 'Dolci e colazione',     categories: ['dolci'] },
  { id: 'bevande',          label: 'Bevande',               categories: ['bevande'] },
  { id: 'pronti',           label: 'Piatti pronti',         categories: ['pronti'] },
  { id: 'altro',            label: 'Altro',                 categories: ['altro', 'non-alimentare'] },
]

export const GROUP_OF_CATEGORY = Object.fromEntries(
  FOOD_GROUPS.flatMap(g => g.categories.map(c => [c, g.id])),
)

// What each section shows first. Groups not listed follow in FOOD_GROUPS order;
// "Altro" is always last.
export const SECTION_GROUP_ORDER = {
  frigo:    ['frutta-verdura', 'latticini-uova', 'carne-pesce', 'pronti', 'salse-condimenti', 'bevande'],
  credenza: ['pane-pasta', 'legumi-conserve', 'salse-condimenti', 'dolci', 'bevande', 'frutta-verdura'],
  freezer:  ['carne-pesce', 'frutta-verdura', 'pronti', 'pane-pasta', 'dolci'],
}

// Days an opened product keeps, by section, while the AI has not analysed it yet.
// functions/lib/notify.js keeps a copy: change both.
export const FALLBACK_OPEN_DAYS = { credenza: 30, frigo: 5, freezer: 60 }
