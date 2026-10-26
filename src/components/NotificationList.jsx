import { useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { EmptyState } from './ui/EmptyState.jsx'
import { daysUntil } from '../utils/date.js'
import styles from './NotificationList.module.css'

const TYPE_ICON = { scadenze: 'alert', pasto: 'bowl', cena: 'moonStar', dispositivo: 'phone' }
const GROUPS = [
  { id: 'today', label: 'Oggi' },
  { id: 'yesterday', label: 'Ieri' },
  { id: 'week', label: 'Questa settimana' },
  { id: 'older', label: 'Prima' },
]

function groupOf(ms, now) {
  const d = daysUntil(ms, now)
  if (d >= 0) return 'today'
  if (d === -1) return 'yesterday'
  if (d >= -6) return 'week'
  return 'older'
}

function timeLabel(ms, group) {
  const date = new Date(ms)
  if (group === 'today' || group === 'yesterday') {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }
  if (group === 'week') {
    const w = date.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')
    return w.charAt(0).toUpperCase() + w.slice(1)
  }
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// The notification centre's list, shared by the page (mobile) and the panel
// (desktop): filter All / Unread, entries grouped by day, unread ones tinted with a
// dot. A tap marks the entry read and opens its view (onOpen). `markAllInHeader`:
// the "Segna tutte come lette" button sits on the first group (the panel has its own).
export function NotificationList({
  items, unread, onOpen, onMarkAllRead, onCook, onSettings, pushOff = false,
  markAllInHeader = true, compact = false,
}) {
  const [filter, setFilter] = useState('all')
  const now = Date.now()

  if (items.length === 0) {
    return (
      <div className={`${styles.empty} ${compact ? styles.emptyCompact : ''}`}>
        {pushOff && (
          <section className={styles.offBanner}>
            <Icon name="bell" size={22} />
            <span className={styles.offText}>
              <strong>Notifiche disattivate su questo dispositivo</strong>
              <span>Non ti avvisiamo delle scadenze né dei pasti in programma.</span>
            </span>
            <button type="button" className={styles.offBtn} onClick={onSettings}>Attiva</button>
          </section>
        )}
        <EmptyState
          icon="bell"
          title="Nessuna notifica"
          text="Qui trovi gli avvisi di scadenza e i promemoria dei pasti. Per ora è tutto sotto controllo."
        >
          <button type="button" className={styles.link} onClick={onSettings}>Scegli quando avvisarmi</button>
        </EmptyState>
      </div>
    )
  }

  const shown = filter === 'unread' ? items.filter(n => !n.readAt) : items
  const groups = GROUPS
    .map(g => ({ ...g, items: shown.filter(n => groupOf(n.createdAt, now) === g.id) }))
    .filter(g => g.items.length > 0)

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div className={styles.filters} role="group" aria-label="Filtra le notifiche">
        <button type="button" className={`${styles.filter} ${filter === 'all' ? styles.filterOn : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Tutte
        </button>
        <button type="button" className={`${styles.filter} ${filter === 'unread' ? styles.filterOn : ''}`} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
          Da leggere
          {unread > 0 && <span className={styles.count}>{unread}</span>}
        </button>
      </div>

      {groups.length === 0 && <p className={styles.allRead}>Hai letto tutto.</p>}

      {groups.map((g, gi) => (
        <section key={g.id} className={styles.group} aria-labelledby={`notif-g-${g.id}`}>
          <div className={styles.groupHead}>
            <h2 id={`notif-g-${g.id}`} className={styles.groupTitle}>{g.label}</h2>
            {markAllInHeader && gi === 0 && unread > 0 && (
              <button type="button" className={styles.markAll} onClick={onMarkAllRead}>Segna tutte come lette</button>
            )}
          </div>
          <ul className={styles.list}>
            {g.items.map(n => (
              <li key={n.id} className={`${styles.item} ${n.readAt ? '' : styles.unread}`}>
                <button type="button" className={styles.row} onClick={() => onOpen(n)}>
                  <span className={styles.icon} data-type={n.type} aria-hidden="true">
                    <Icon name={TYPE_ICON[n.type] ?? 'bell'} size={22} />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.titleRow}>
                      <span className={styles.title}>{n.title}</span>
                      <span className={styles.time}>{timeLabel(n.createdAt, g.id)}</span>
                    </span>
                    {n.body && <span className={styles.body}>{n.body}</span>}
                  </span>
                  {!n.readAt && <span className={styles.dot} role="img" aria-label="Non letta" />}
                </button>
                {n.type === 'scadenze' && g.id === 'today' && onCook && (
                  <button type="button" className={styles.action} onClick={() => onCook(n)}>
                    <Icon name="sparkle" size={18} /> Cosa cucino con questi?
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
