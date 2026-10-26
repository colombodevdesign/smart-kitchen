import { useEffect, useState } from 'react'
import { LogoMorph } from './ui/LogoMorph.jsx'
import styles from './SplashScreen.module.css'

const LEAVE_MS = 360

// Animazione di avvio: resta finché il logo è formato E l'app è pronta (`ready`),
// poi sfuma e chiama `onDone`.
export function SplashScreen({ ready, onDone }) {
  const [formed, setFormed] = useState(false)
  const leaving = formed && ready

  useEffect(() => {
    if (!leaving) return undefined
    const id = setTimeout(onDone, LEAVE_MS)
    return () => clearTimeout(id)
  }, [leaving, onDone])

  return (
    <div className={styles.splash} data-leaving={leaving ? 'true' : undefined} role="status" aria-label="Caricamento">
      <LogoMorph className={styles.logo} onFormed={() => setFormed(true)} />
    </div>
  )
}
