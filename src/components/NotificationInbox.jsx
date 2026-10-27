import { Icon } from './ui/Icon.jsx'
import { NotificationList } from './NotificationList.jsx'
import { useNotifications } from '../hooks/useNotifications.js'
import styles from './NotificationInbox.module.css'

// Whether this device gets no push at all (alerts and meal reminders both off, or
// not registered here): the empty notification centre says so.
export function usePushOffHere(uid) {
  const n = useNotifications(uid ?? undefined)
  if (n.loading) return false
  return n.thisDevice !== 'active' || !(n.prefs.enabled || n.prefs.meals?.enabled)
}

// Oggi › Notifiche (mobile and tablet; on desktop the same list is a panel off the sidebar).
export function NotificationInbox({ user, inbox, onBack, onOpen, onCook, onSettings }) {
  const pushOff = usePushOffHere(user?.uid)
  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" className={styles.iconBtn} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Notifiche</h1>
        <button type="button" className={`${styles.iconBtn} ${styles.settings}`} onClick={onSettings} aria-label="Impostazioni notifiche">
          <Icon name="sliders" size={24} />
        </button>
      </div>
      <NotificationList
        items={inbox.items}
        unread={inbox.unread}
        onOpen={onOpen}
        onMarkAllRead={inbox.markAllRead}
        onCook={onCook}
        onSettings={onSettings}
        pushOff={pushOff}
      />
    </div>
  )
}
