import { ProfileTab } from './ProfileTab.jsx'
import { NotificationSettings } from './NotificationSettings.jsx'
import { MealReminderSettings } from './MealReminderSettings.jsx'
import styles from './Containers.module.css'

export function TuTab({ user, online, detail, onOpenNotifications, onOpenMealReminders, onCloseDetail, onExport, onImport, onClearInventory, onSignOut, onSaveApiKey }) {
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      {detail?.type === 'promemoria-pasti' ? (
        <MealReminderSettings user={user} onBack={onCloseDetail} />
      ) : detail?.type === 'notifiche' ? (
        <NotificationSettings user={user} online={online} onBack={onCloseDetail} onOpenMealReminders={onOpenMealReminders} />
      ) : (
        <ProfileTab
          user={user}
          online={online}
          onExport={onExport}
          onImport={onImport}
          onClearInventory={onClearInventory}
          onSignOut={onSignOut}
          onSaveApiKey={onSaveApiKey}
          onOpenNotifications={onOpenNotifications}
        />
      )}
    </div>
  )
}
