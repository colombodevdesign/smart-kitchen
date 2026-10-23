import { Icon } from './ui/Icon.jsx'
import { TABS } from '../nav/tabs.js'
import styles from './Sidebar.module.css'

export function Sidebar({ activeTab, onTabChange, onAdd, onShortcuts }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>smart kitchen</div>
      <nav className={styles.nav} aria-label="Navigazione principale">
        {TABS.map(({ id, label, icon }, i) => (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${activeTab === id ? styles.active : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => onTabChange(id)}
          >
            <Icon name={icon} size={22} />
            <span>{label}</span>
            <kbd className={styles.kbd} aria-hidden="true">{i + 1}</kbd>
          </button>
        ))}
      </nav>
      <div className={styles.footer}>
        {onAdd && (
          <button type="button" className={styles.cta} onClick={onAdd} aria-keyshortcuts="n">
            <Icon name="plus" size={20} strokeWidth={2} />
            Aggiungi prodotti
            <kbd className={`${styles.kbd} ${styles.kbdOnAccent}`} aria-hidden="true">N</kbd>
          </button>
        )}
        {onShortcuts && (
          <button type="button" className={styles.help} onClick={onShortcuts} aria-keyshortcuts="?">
            Scorciatoie da tastiera
            <kbd className={styles.kbd} aria-hidden="true">?</kbd>
          </button>
        )}
      </div>
    </aside>
  )
}
