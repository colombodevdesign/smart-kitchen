// Top-level destinations. Sub-views (Cucina, Spesa, Tu) are local state, see useNavigation.
export const TABS = [
  { id: 'oggi',     label: 'Oggi',     icon: 'today' },
  { id: 'dispensa', label: 'Dispensa', icon: 'pantry' },
  { id: 'cucina',   label: 'Cucina',   icon: 'chef' },
  { id: 'spesa',    label: 'Spesa',    icon: 'cart' },
  { id: 'tu',       label: 'Tu',       icon: 'user' },
]

export const DEFAULT_SUB = { cucina: 'ricette', spesa: 'lista', tu: 'profilo' }
