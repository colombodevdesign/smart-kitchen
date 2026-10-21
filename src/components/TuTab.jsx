import { SettingsTab } from './SettingsTab.jsx'
import { PageHeader } from './ui/PageHeader.jsx'
import styles from './Containers.module.css'

export function TuTab({ user, onExport, onImport, onClearInventory, onSignOut }) {
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      <PageHeader title="Tu" />
      <SettingsTab
        user={user}
        onExport={onExport}
        onImport={onImport}
        onClearInventory={onClearInventory}
        onSignOut={onSignOut}
      />
    </div>
  )
}
