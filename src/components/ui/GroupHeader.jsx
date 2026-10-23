import { Icon } from './Icon.jsx'
import styles from './GroupHeader.module.css'

const PREVIEW_NAMES = 2

// Heading of a group of rows that can be folded. Folded, it shows the first names.
// variant 'flat': inside a desktop column card (aligned with the flat rows).
export function GroupHeader({ label, pairs, urgent = false, open, onToggle, variant }) {
  const extra = pairs.length - PREVIEW_NAMES
  const preview = pairs.slice(0, PREVIEW_NAMES).map(p => p.item.name).join(', ') + (extra > 0 ? ` +${extra}` : '')
  return (
    <h3 className={styles.head} data-variant={variant}>
      <button
        type="button"
        className={styles.btn}
        aria-expanded={open}
        data-urgent={urgent ? '' : undefined}
        onClick={onToggle}
      >
        <Icon name="chevD" size={16} className={styles.chev} />
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{pairs.length}</span>
        {!open && <span className={styles.preview}>{preview}</span>}
      </button>
    </h3>
  )
}
