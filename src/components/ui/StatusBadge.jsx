import styles from './StatusBadge.module.css'

// Status pill. Always carries text (never colour alone).
// tone: 'expired' | 'soon' | 'open' | 'ok' | 'neutral'
export function StatusBadge({ tone = 'neutral', children, className = '' }) {
  return <span className={`${styles.badge} ${styles[tone]} ${className}`}>{children}</span>
}
