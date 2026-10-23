import { resetMockData } from '../../mock/data.js'
import styles from './MockBanner.module.css'

export function MockBanner() {
  return (
    <div className={styles.banner} role="status">
      <span>Modalità demo · dati di esempio, nessun account collegato</span>
      <button type="button" className={styles.reset} onClick={resetMockData}>Ripristina dati</button>
    </div>
  )
}
