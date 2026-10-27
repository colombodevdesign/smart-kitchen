import { useEffect, useState } from 'react'
import { LogoMorph } from './ui/LogoMorph.jsx'
import styles from './SplashScreen.module.css'

// Durata dell'uscita: deve coprire le animazioni `leaving` di SplashScreen.module.css.
const LEAVE_MS = 640

// Animazione di avvio: resta finché il logo è formato E l'app è pronta (`ready`),
// poi esce (`onLeave` all'inizio, `onDone` alla fine, quando va smontata).
export function SplashScreen({ ready, onLeave, onDone }) {
  const [formed, setFormed] = useState(false)
  const leaving = formed && ready

  useEffect(() => {
    if (!leaving) return undefined
    onLeave()
    const id = setTimeout(onDone, LEAVE_MS)
    return () => clearTimeout(id)
  }, [leaving, onLeave, onDone])

  return (
    <div className={styles.splash} data-leaving={leaving ? 'true' : undefined} role="status" aria-label="Caricamento">
      <LogoMorph className={styles.logo} onFormed={() => setFormed(true)} />
    </div>
  )
}
