import { apply as applyTheme } from './theme.js'

// Animazione di avvio: solo al primo caricamento della sessione (un ricarico nella
// stessa scheda non la ripete) e non con «riduci movimento».
// La stessa regola è duplicata nello script inline di index.html (sfondo verde e
// theme-color verde prima che parta React): cambiarle insieme.
const SEEN_KEY = 'sk-splash-seen'

export function shouldShowSplash() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return false
  }
}

// Chiamata quando la splash inizia a uscire: sotto deve esserci già lo sfondo
// della pagina, altrimenti resterebbe verde e scatterebbe a fine dissolvenza.
export function endSplash() {
  try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* sessionStorage non disponibile */ }
  document.documentElement.classList.remove('splash-boot')
  applyTheme()
}
