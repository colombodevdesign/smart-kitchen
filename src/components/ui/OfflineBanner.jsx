import { Icon } from './Icon.jsx'
import styles from './OfflineBanner.module.css'

export function OfflineBanner() {
  return (
    <div className={styles.banner} role="status">
      <Icon name="wifiOff" size={20} />
      <span>Sei offline · le modifiche si sincronizzeranno appena torni online</span>
    </div>
  )
}
