import { Icon } from './Icon.jsx'
import styles from './EmptyState.module.css'

export function EmptyState({ icon, title, text, children }) {
  return (
    <div className={styles.wrap}>
      {icon && <span className={styles.icon}><Icon name={icon} size={28} /></span>}
      <h3 className={styles.title}>{title}</h3>
      {text && <p className={styles.text}>{text}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}
