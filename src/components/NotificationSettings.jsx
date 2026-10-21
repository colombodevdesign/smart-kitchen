import { Icon } from './ui/Icon.jsx'
import { usePushNotifications } from '../hooks/usePushNotifications.js'
import styles from './NotificationSettings.module.css'

// First version: on/off for this device. Extended with schedule, days and
// device list in the notifications step.
export function NotificationSettings({ user, onBack }) {
  const push = usePushNotifications(user?.uid)
  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Notifiche</h1>
      </div>
      <section className={styles.banner}>
        <div className={styles.bannerText}>
          <strong>Avvisi di scadenza {push.enabled ? 'attivi' : 'disattivi'}</strong>
          <span>Una notifica quando un prodotto sta per scadere.</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={push.enabled}
          aria-label="Avvisi di scadenza"
          className={`${styles.toggle} ${push.enabled ? styles.on : ''}`}
          onClick={push.enabled ? push.disable : push.enable}
          disabled={push.loading || !push.supported || push.permission === 'denied'}
        >
          <span className={styles.thumb} />
        </button>
      </section>
      {push.error && <p className={styles.error} role="alert">{push.error}</p>}
    </div>
  )
}
