import { TABS } from './tabs.js'

// Source of truth for the help dialog. The actual bindings live in App.jsx.
export const SHORTCUT_GROUPS = [
  {
    title: 'Vai a',
    items: TABS.map((t, i) => ({ keys: [String(i + 1)], label: t.label })),
  },
  {
    title: 'Azioni',
    items: [
      { keys: ['N'], label: 'Aggiungi un prodotto' },
      { keys: ['S'], label: 'Aggiungi da scontrino (foto o PDF)' },
      { keys: ['V'], label: 'Aggiungi a voce' },
      { keys: ['C'], label: 'Cosa cucino stasera?' },
      { keys: ['P'], label: 'Aggiungi o pianifica un pasto' },
      { keys: ['\\'], label: 'Cerca in dispensa' },
    ],
  },
  {
    title: 'Generale',
    items: [
      { keys: ['B'], label: 'Apri o chiudi le notifiche' },
      { keys: ['?'], label: 'Mostra le scorciatoie' },
      { keys: ['Esc'], label: 'Chiudi finestra, ricerca o dettaglio; riduci la sezione espansa' },
    ],
  },
]
