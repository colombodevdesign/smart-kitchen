import styles from './Sidebar.module.css'

function IconDispensa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="7" y1="8" x2="9" y2="8"/>
      <line x1="7" y1="16" x2="9" y2="16"/>
    </svg>
  )
}

function IconRicette() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
      <line x1="6" y1="17" x2="18" y2="17"/>
    </svg>
  )
}

function IconSpesa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}

function IconPasti() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'dispensa',        label: 'Dispensa',        Icon: IconDispensa },
  { id: 'ricette',         label: 'Ricette AI',       Icon: IconRicette },
  { id: 'ricette-salvate', label: 'Ricette Salvate',  Icon: IconRicette,  indent: true },
  { id: 'spesa',           label: 'Spesa Smart',      Icon: IconSpesa },
  { id: 'lista-spesa',     label: 'Lista Spesa',      Icon: IconSpesa,    indent: true },
  { id: 'pasti',           label: 'Tracker Pasti',    Icon: IconPasti },
]

export function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>cucina smart</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ id, label, Icon, indent }) => (
          <button
            key={id}
            className={`${styles.item} ${activeTab === id ? styles.active : ''} ${indent ? styles.indent : ''}`}
            onClick={() => onTabChange(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.footer}>
        <button
          className={`${styles.item} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <IconSettings />
          <span>Impostazioni</span>
        </button>
      </div>
    </aside>
  )
}
