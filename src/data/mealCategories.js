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

// Usual time of each meal: default time of a planned meal and base of its
// reminder. The user can change them in Tu › Notifiche › Promemoria dei pasti.
export const DEFAULT_MEAL_TIMES = {
  colazione: '08:00',
  pranzo: '12:30',
  spuntino: '16:30',
  cena: '19:30',
}

// Reminder lead times of a planned meal ("am" = in the morning, at MORNING_TIME).
export const REMINDER_LEADS = [
  { value: '30', label: '30 min prima' },
  { value: '60', label: '1 ora prima' },
  { value: 'am', label: 'Al mattino' },
  { value: 'at', label: "All'ora del pasto" },
]
export const MORNING_TIME = '09:00'
