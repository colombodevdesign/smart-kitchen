// Food preferences (Tu › Preferenze alimentari), in display order. `strict`:
// constraints the AI must respect (allergies, diet); the others are hints.
export const PREFERENCE_KINDS = [
  { id: 'allergia',  label: 'Allergie e intolleranze', option: 'Allergia o intolleranza', strict: true },
  { id: 'dieta',     label: 'Dieta',                   option: 'Dieta',                   strict: true },
  { id: 'non-piace', label: 'Non mi piace',            option: 'Non mi piace',            strict: false },
  { id: 'piace',     label: 'Mi piace',                option: 'Mi piace',                strict: false },
  { id: 'abitudine', label: 'Abitudini',               option: 'Abitudine',               strict: false },
]

export const PREFERENCE_KIND_IDS = PREFERENCE_KINDS.map(k => k.id)

// Key used to compare preferences (saved, dismissed, proposed again by the AI).
export function preferenceKey(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}
