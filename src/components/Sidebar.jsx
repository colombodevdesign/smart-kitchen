import { useEffect, useRef } from 'react'
import { Icon } from './ui/Icon.jsx'
import { TABS } from '../nav/tabs.js'
import { useOptimisticValue } from '../hooks/useOptimisticValue.js'
import styles from './Sidebar.module.css'

const PAGE_DELAY_MS = 120

export function Sidebar({ activeTab, onTabChange, onAdd, onShortcuts, unread = 0, notificationsOpen = false, onNotifications }) {
  const [shownTab, setShownTab] = useOptimisticValue(activeTab)
  // The highlight moves on the tap; the page changes a beat later, so the heavy render doesn't land mid-slide.
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const select = (id) => {
    setShownTab(id)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onTabChange(id), PAGE_DELAY_MS)
  }
  const index = Math.max(TABS.findIndex(t => t.id === shownTab), 0)
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>smart kitchen</div>
      <nav className={styles.nav} aria-label="Navigazione principale" style={{ '--i': index }}>
        {/* One highlight that slides to the active item (same idea as Segmented). */}
        <span className={styles.thumb} aria-hidden="true" />
        {TABS.map(({ id, label, icon }, i) => (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${shownTab === id ? styles.active : ''}`}
            aria-current={shownTab === id ? 'page' : undefined}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => select(id)}
          >
            <Icon name={icon} size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.footer}>
        {onNotifications && (
          <button
            type="button"
            className={`${styles.notif} ${notificationsOpen ? styles.notifOpen : ''}`}
            onClick={onNotifications}
            aria-haspopup="dialog"
            aria-expanded={notificationsOpen}
            aria-keyshortcuts="b"
            aria-label={unread ? `Notifiche, ${unread} da leggere` : 'Notifiche'}
            data-notif-trigger
          >
            <Icon name="bell" size={22} />
            <span className={styles.notifLabel}>Notifiche</span>
            {unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
          </button>
        )}
        {onShortcuts && (
          <button type="button" className={styles.help} onClick={onShortcuts} aria-keyshortcuts="?">
            Scorciatoie da tastiera
            <kbd className={styles.kbd} aria-hidden="true">?</kbd>
          </button>
        )}
        {onAdd && (
          <button type="button" className={styles.cta} onClick={onAdd} aria-keyshortcuts="n">
            <Icon name="plus" size={20} strokeWidth={2} />
            Aggiungi prodotti
          </button>
        )}
      </div>
    </aside>
  )
}
