import { Icon } from './ui/Icon.jsx'
import { TABS } from '../nav/tabs.js'
import styles from './BottomNav.module.css'

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className={styles.nav} aria-label="Navigazione principale">
      {TABS.map(({ id, label, icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <span className={styles.pill}><Icon name={icon} size={24} /></span>
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
