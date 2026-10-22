import { Icon } from './Icon.jsx'
import styles from './Chip.module.css'

// Toggle chip. The selected state shows a check, not only a colour.
export function Chip({ selected = false, onClick, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`${styles.chip} ${selected ? styles.on : ''} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {selected && <Icon name="check" size={16} strokeWidth={2.6} />}
      {children}
    </button>
  )
}
