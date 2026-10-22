import { ProfileTab } from './ProfileTab.jsx'
import { NotificationSettings } from './NotificationSettings.jsx'
import styles from './Containers.module.css'

export function TuTab({ user, online, detail, onOpenNotifications, onCloseDetail, onExport, onImport, onClearInventory, onSignOut }) {
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      {detail?.type === 'notifiche' ? (
        <NotificationSettings user={user} online={online} onBack={onCloseDetail} />
      ) : (
        <ProfileTab
          user={user}
          online={online}
          onExport={onExport}
          onImport={onImport}
          onClearInventory={onClearInventory}
          onSignOut={onSignOut}
          onOpenNotifications={onOpenNotifications}
        />
      )}
    </div>
  )
}
