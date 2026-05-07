export const MEAL_CATEGORIES = [
  { id: 'colazione', label: 'Colazione', emoji: '☕', color: '#E0A24B' },
  { id: 'pranzo',    label: 'Pranzo',    emoji: '🍝', color: '#BA7517' },
  { id: 'cena',      label: 'Cena',      emoji: '🌙', color: '#7A4A0F' },
  { id: 'spuntino',  label: 'Spuntino',  emoji: '🍎', color: '#C97A5A' },
]

export const CATEGORY_BY_ID = Object.fromEntries(
  MEAL_CATEGORIES.map(c => [c.id, c])
)
