// Colours come from CSS (--cat-*, picked up through data-cat), so they follow
// the theme; `icon` is a name from components/ui/Icon.jsx.
export const MEAL_CATEGORIES = [
  { id: 'colazione', label: 'Colazione', icon: 'coffee' },
  { id: 'pranzo',    label: 'Pranzo',    icon: 'bowl' },
  { id: 'cena',      label: 'Cena',      icon: 'moonStar' },
  { id: 'spuntino',  label: 'Spuntino',  icon: 'apple' },
]

export const CATEGORY_BY_ID = Object.fromEntries(
  MEAL_CATEGORIES.map(c => [c.id, c])
)
