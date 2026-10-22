import { useRef } from 'react'
import styles from './Segmented.module.css'

// Segmented control: one option active at a time. `options` is
// [{ value, label, count? }]. Used for sections, sub-views and similar.
// The active "pill" is a single element that slides along the track.
export function Segmented({ options, value, onChange, ariaLabel, className = '' }) {
  const index = options.findIndex(o => o.value === value)
  // With no active option (e.g. while searching) the pill hides but keeps its
  // last position, so it fades back in place instead of sliding from the start.
  const lastIndex = useRef(Math.max(index, 0))
  if (index >= 0) lastIndex.current = index

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`${styles.seg} ${className}`}
      style={{ '--n': options.length, '--i': lastIndex.current }}
    >
      <span className={`${styles.thumb} ${index < 0 ? styles.thumbHidden : ''}`} aria-hidden="true" />
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
