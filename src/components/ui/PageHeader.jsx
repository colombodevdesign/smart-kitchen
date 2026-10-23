import styles from './PageHeader.module.css'

// `eyebrow`: optional small line above the title (e.g. a summary on desktop).
export function PageHeader({ title, eyebrow, children }) {
  return (
    <header className={styles.header}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {children}
    </header>
  )
}
