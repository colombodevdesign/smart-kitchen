import { Icon } from './ui/Icon.jsx'
import styles from './ChatFab.module.css'

// Opens the assistant (mobile and tablet; on desktop the sidebar has "Assistente").
// `stacked`: on Oggi and Dispensa it sits above their green "add" button.
export function ChatFab({ onClick, stacked = false }) {
  return (
    <button
      type="button"
      className={styles.fab}
      data-stacked={stacked || undefined}
      data-fixed
      onClick={onClick}
      aria-label="Chiedi all’assistente"
      aria-keyshortcuts="a"
    >
      <Icon name="sparkle" size={22} />
    </button>
  )
}
