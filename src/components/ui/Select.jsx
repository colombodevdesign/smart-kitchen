import { Icon } from './Icon.jsx'
import styles from './Select.module.css'

// Native <select> with our own chevron, 16px from the right edge: the browser one hugs the border.
// `className` styles the <select> (the caller's field look); `wrapClassName` the wrapper (layout).
export function Select({ className = '', wrapClassName = '', children, ...rest }) {
  return (
    <span className={`${styles.wrap} ${wrapClassName}`}>
      <select className={`${styles.select} ${className}`} {...rest}>{children}</select>
      <Icon name="chevD" size={20} className={styles.chevron} />
    </span>
  )
}
