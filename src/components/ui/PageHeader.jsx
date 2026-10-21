import styles from './PageHeader.module.css'

export function PageHeader({ title, children }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </header>
  )
}
