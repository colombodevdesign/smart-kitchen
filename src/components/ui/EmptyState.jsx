import { Icon } from './Icon.jsx'
import styles from './EmptyState.module.css'

// `icon`: a tinted round icon above the title. `art="shapes"`: the pantry's
// illustration (two discs and a ring) with a larger title.
export function EmptyState({ icon, art, title, text, children }) {
  return (
    <div className={`${styles.wrap} ${art ? styles.withArt : ''}`}>
      {art === 'shapes' && (
        <div className={styles.art} aria-hidden="true">
          <span className={styles.sun} />
          <span className={styles.disc} />
          <span className={styles.ring} />
        </div>
      )}
      {!art && icon && <span className={styles.icon}><Icon name={icon} size={28} /></span>}
      <h3 className={styles.title}>{title}</h3>
      {text && <p className={styles.text}>{text}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}
