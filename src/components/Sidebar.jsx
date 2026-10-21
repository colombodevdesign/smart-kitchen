import { Icon } from './ui/Icon.jsx'
import { TABS } from '../nav/tabs.js'
import styles from './Sidebar.module.css'

export function Sidebar({ activeTab, onTabChange, onAdd }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>smart kitchen</div>
      <nav className={styles.nav} aria-label="Navigazione principale">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${activeTab === id ? styles.active : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <Icon name={icon} size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {onAdd && (
        <div className={styles.footer}>
          <button type="button" className={styles.cta} onClick={onAdd}>
            <Icon name="plus" size={20} strokeWidth={2} />
            Aggiungi prodotti
          </button>
        </div>
      )}
    </aside>
  )
}
