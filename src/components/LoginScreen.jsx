import { useState } from 'react'
import styles from './LoginScreen.module.css'

export function LoginScreen({ onGoogle }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    try { await onGoogle() } catch (e) { setError(friendlyError(e)) }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon}>🍳</div>
        <h1 className={styles.logo}>cucina smart</h1>
        <p className={styles.sub}>
          Accedi per sincronizzare la dispensa tra i tuoi dispositivi
        </p>

        <div className={styles.buttons}>
          <button
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={loading}
          >
            {loading ? <Spinner /> : <GoogleIcon />}
            Continua con Google
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.note}>
          I dati vengono salvati in modo sicuro su Firebase e rimangono privati.
        </p>
      </div>
    </div>
  )
}

function friendlyError(e) {
  if (e?.code === 'auth/popup-closed-by-user') return null
  if (e?.code === 'auth/cancelled-popup-request') return null
  if (e?.code === 'auth/network-request-failed') return 'Errore di rete. Controlla la connessione.'
  return 'Accesso non riuscito. Riprova.'
}

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  )
}
