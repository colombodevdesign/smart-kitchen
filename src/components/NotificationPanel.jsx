import { useEffect, useRef } from 'react'
import { Icon } from './ui/Icon.jsx'
import { NotificationList } from './NotificationList.jsx'
import { usePushOffHere } from './NotificationInbox.jsx'
import styles from './NotificationPanel.module.css'

// Desktop notification centre: a panel next to the sidebar's "Notifiche" item
// ([data-notif-trigger]). Not modal: Esc, a click outside or opening an entry close it.
export function NotificationPanel({ open, onClose, user, inbox, onOpen, onCook, onSettings }) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onCloseRef.current()
    }
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || e.target.closest?.('[data-notif-trigger]')) return
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown, true)
      if (prev && document.contains(prev)) prev.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div ref={ref} className={styles.panel} role="dialog" aria-labelledby="notif-panel-title" tabIndex={-1}>
      <PanelBody user={user} inbox={inbox} onOpen={onOpen} onCook={onCook} onSettings={onSettings} />
    </div>
  )
}

function PanelBody({ user, inbox, onOpen, onCook, onSettings }) {
  const pushOff = usePushOffHere(user?.uid)
  return (
    <>
      <div className={styles.head}>
        <h2 id="notif-panel-title" className={styles.title}>Notifiche</h2>
        {inbox.unread > 0 && (
          <button type="button" className={styles.markAll} onClick={inbox.markAllRead}>Segna tutte come lette</button>
        )}
      </div>
      <div className={styles.body}>
        <NotificationList
          items={inbox.items}
          unread={inbox.unread}
          onOpen={onOpen}
          onMarkAllRead={inbox.markAllRead}
          onCook={onCook}
          onSettings={onSettings}
          pushOff={pushOff}
          markAllInHeader={false}
          compact
        />
      </div>
      <button type="button" className={styles.footer} onClick={onSettings}>
        <Icon name="sliders" size={20} /> Impostazioni notifiche
      </button>
    </>
  )
}
