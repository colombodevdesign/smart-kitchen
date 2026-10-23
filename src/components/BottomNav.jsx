import { useEffect, useRef } from 'react'
import { Icon } from './ui/Icon.jsx'
import { TABS } from '../nav/tabs.js'
import { useOptimisticValue } from '../hooks/useOptimisticValue.js'
import styles from './BottomNav.module.css'

const PAGE_DELAY_MS = 120

export function BottomNav({ activeTab, onTabChange }) {
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
    <nav className={styles.nav} aria-label="Navigazione principale" style={{ '--n': TABS.length, '--i': index }}>
      {/* One highlight that slides to the active item (same idea as Sidebar and Segmented). */}
      <span className={styles.track} aria-hidden="true"><span className={styles.thumb} /></span>
      {TABS.map(({ id, label, icon }) => {
        const isActive = shownTab === id
        return (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => select(id)}
          >
            <span className={styles.pill}><Icon name={icon} size={24} /></span>
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
