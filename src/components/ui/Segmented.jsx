import styles from './Segmented.module.css'

// Segmented control: one option active at a time. `options` is
// [{ value, label, count? }]. Used for sections, sub-views and similar.
export function Segmented({ options, value, onChange, ariaLabel, className = '' }) {
  return (
    <div role="group" aria-label={ariaLabel} className={`${styles.seg} ${className}`}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={`${styles.btn} ${o.value === value ? styles.on : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count != null && <span className={styles.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
