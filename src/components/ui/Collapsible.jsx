import styles from './Collapsible.module.css'

// Content that is uncovered from the top as it opens and covered again as it closes:
// the box animates its height while the content stays put, so the rows are revealed
// rather than popping in. Closed, the content stays mounted but is hidden from focus
// and screen readers. `data-collapsible` lets list rules skip the wrapper.
// `className` goes on the element that holds the children.
export function Collapsible({ open, className, children }) {
  return (
    <div className={styles.wrap} data-open={open ? '' : undefined} data-collapsible>
      <div className={styles.clip}>
        <div className={`${styles.inner} ${className ?? ''}`}>{children}</div>
      </div>
    </div>
  )
}
