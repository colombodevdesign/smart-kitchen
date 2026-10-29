import { Icon } from './ui/Icon.jsx'
import { SECTION_LABELS } from '../data/initialInventory.js'
import { CATEGORY_BY_ID } from '../data/mealCategories.js'
import { mealTime, reminderTime } from '../utils/meals.js'
import { todayStr } from '../utils/date.js'
import styles from './ChatView.module.css'

function dayLabel(dateStr) {
  const today = todayStr()
  const d = new Date()
  d.setDate(d.getDate() + 1)
  if (dateStr === today) return 'Oggi'
  if (dateStr === todayStr(d)) return 'Domani'
  const [y, m, day] = dateStr.split('-').map(Number)
  const label = new Date(y, m - 1, day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// What each kind of action looks like: before (pending) and after (outcome).
function describe(action, mealPrefs) {
  switch (action.type) {
    case 'spesa': {
      const n = action.items.length
      return {
        icon: 'cart', label: 'Lista della spesa',
        title: action.items.map(i => (i.qty ? `${i.name} · ${i.qty}` : i.name)).join(', '),
        confirm: n === 1 ? 'Aggiungi alla spesa' : `Aggiungi ${n} alla spesa`,
        done: n === 1 ? 'Aggiunto alla spesa' : `${n} aggiunti alla spesa`,
        dismissed: 'Non aggiunto alla spesa',
        open: 'spesa',
      }
    }
    case 'pasto': {
      const past = action.date < todayStr()
      const time = past ? null : mealTime({ time: action.time, category: action.category }, mealPrefs?.times)
      const reminder = !past && mealPrefs?.enabled && time ? reminderTime(time, mealPrefs.lead) : null
      const meta = [dayLabel(action.date), CATEGORY_BY_ID[action.category]?.label, time, reminder && `ti avviso alle ${reminder}`]
      return {
        icon: 'calendar', label: past ? 'Pasto da registrare' : 'Pasto in programma',
        title: action.text, meta: meta.filter(Boolean).join(' · '),
        confirm: past ? 'Registra' : 'Pianifica',
        done: past ? 'Registrato tra i pasti' : 'In programma',
        dismissed: 'Non pianificato',
        open: 'pasti',
      }
    }
    case 'rimuovi':
      return {
        icon: 'trash', label: 'Dispensa', danger: true,
        title: `Togli: ${action.name}`, meta: action.section ? SECTION_LABELS[action.section] : null,
        confirm: 'Togli dalla dispensa',
        done: 'Tolto dalla dispensa',
        dismissed: 'Lasciato in dispensa',
        missing: `Non trovo «${action.name}» in dispensa`,
        undo: true,
      }
    case 'preferenza':
      return {
        icon: 'user', label: 'Ho notato una preferenza', pref: true,
        title: action.text, meta: action.reason,
        confirm: 'Salva nel profilo', cancel: 'Non ora',
        done: 'Salvata nel profilo',
        dismissed: 'Va bene, non te la ripropongo',
        open: 'preferenze',
      }
    default:
      return null
  }
}

// One action proposed by the assistant: Conferma / No, then the outcome.
// `onDecide('confirm' | 'dismiss' | 'undo')`; `readOnly` in archived chats.
export function ChatActionCard({ action, mealPrefs, readOnly = false, onDecide, onOpen }) {
  const d = describe(action, mealPrefs)
  if (!d) return null
  const status = action.status ?? 'pending'
  const outcome = status === 'done' ? d.done
    : status === 'dismissed' ? d.dismissed
    : status === 'missing' ? d.missing
    : readOnly ? 'Non confermata' : null
  const positive = status === 'done'

  return (
    <section
      className={`${styles.action} ${d.pref ? styles.actionPref : ''} ${outcome ? styles.actionDone : ''}`}
      aria-label={`Proposta: ${d.label}`}
    >
      <div className={styles.actionHead}>
        <span className={`${styles.actionIcon} ${d.danger ? styles.actionIconDanger : ''}`}>
          <Icon name={d.icon} size={18} />
        </span>
        <div className={styles.actionText}>
          <div className={styles.actionLabel}>{d.label}</div>
          <div className={styles.actionTitle}>{d.title}</div>
          {d.meta && <div className={styles.actionMeta}>{d.meta}</div>}
        </div>
      </div>
      {outcome ? (
        <div className={`${styles.outcome} ${positive ? '' : styles.outcomeMuted}`} role="status">
          <Icon name={positive ? 'check' : 'info'} size={18} strokeWidth={positive ? 2.2 : 1.8} />
          <span className={styles.outcomeText}>{outcome}</span>
          {!readOnly && positive && d.undo && (
            <button type="button" className={styles.linkBtn} onClick={() => onDecide('undo')}>Annulla</button>
          )}
          {positive && d.open && onOpen && (
            <button type="button" className={styles.linkBtn} onClick={() => onOpen(d.open)}>Vedi</button>
          )}
        </div>
      ) : (
        <div className={styles.actionButtons}>
          <button type="button" className={styles.confirmBtn} onClick={() => onDecide('confirm')}>{d.confirm}</button>
          <button type="button" className={styles.dismissBtn} onClick={() => onDecide('dismiss')}>{d.cancel ?? 'No'}</button>
        </div>
      )}
    </section>
  )
}
