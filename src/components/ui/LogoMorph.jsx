import { useLayoutEffect, useRef } from 'react'
import {
  ORIGINS, MORPH_START, FORMED_AT, LOGO_FINAL,
  morphFrame, enterAnimation, tiltAnimation, popAnimation, sparks,
} from '../../utils/logoMorph.js'
import styles from './LogoMorph.module.css'

const SPARKS = sparks()

// Forchetta e coltello che si toccano e diventano il logo SK, poi resta il logo.
// Comparsa, oscillazioni, scintille e battito finale sono Web Animations su livelli
// HTML (transform/opacity): girano sul compositor anche se l'avvio dell'app tiene
// occupato il thread principale. Solo il morph dei path, da MORPH_START, è disegnato
// in un loop requestAnimationFrame (nessun render React per frame).
// `onFormed` scatta quando il logo è formato; con `prefers-reduced-motion` mostra
// subito il logo finale.
export function LogoMorph({ onFormed, className }) {
  const refs = useRef({ sparks: [] })
  const onFormedRef = useRef(onFormed)
  onFormedRef.current = onFormed

  // Layout effect: le animazioni esistono già al primo paint (niente posa ferma per un frame).
  useLayoutEffect(() => {
    const r = refs.current
    const apply = (f) => {
      r.forkLayer.style.transform = `rotate(${f.forkRotate}deg)`
      r.forkInner.setAttribute('transform', f.forkInner)
      r.fork.setAttribute('d', f.forkD)
      r.knifeLayer.style.transform = `rotate(${f.knifeRotate}deg)`
      r.knifeInner.setAttribute('transform', f.knifeInner)
      r.knife.setAttribute('d', f.knifeD)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply(LOGO_FINAL)
      onFormedRef.current?.()
      return undefined
    }

    // Posa di partenza (sotto le animazioni). Create nello stesso task, le animazioni partono
    // insieme al primo frame dipinto: il loop prende da lì il suo istante zero.
    apply(morphFrame(0))
    const run = (el, { keyframes, options }) => el.animate(keyframes, options)
    const stage = run(r.stage, enterAnimation())
    const pop = run(r.pop, popAnimation())
    const tilts = [run(r.forkLayer, tiltAnimation(1)), run(r.knifeLayer, tiltAnimation(-1))]
    const sparkAnims = SPARKS.map((s, i) => run(r.sparks[i], s))

    let raf
    let morphing = false
    const tick = (now) => {
      const start = stage.startTime
      if (start == null) { raf = requestAnimationFrame(tick); return }
      const t = Math.min(Math.max(now - start, 0) / 1000, FORMED_AT)
      if (t >= MORPH_START) {
        // Passaggio di consegne: da qui la rotazione dei livelli la imposta il loop.
        if (!morphing) { tilts.forEach((a) => a.cancel()); morphing = true }
        apply(morphFrame(t))
      }
      if (t < FORMED_AT) raf = requestAnimationFrame(tick)
      else onFormedRef.current?.()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ;[stage, pop, ...tilts, ...sparkAnims].forEach((a) => a.cancel())
    }
  }, [])

  return (
    <div className={`${styles.logo} ${className ?? ''}`} aria-hidden="true">
      <div className={styles.layer} ref={(el) => { refs.current.stage = el }} style={{ transformOrigin: ORIGINS.stage }}>
        <div className={styles.layer} ref={(el) => { refs.current.pop = el }} style={{ transformOrigin: ORIGINS.stage }}>
          <div className={styles.layer} ref={(el) => { refs.current.forkLayer = el }} style={{ transformOrigin: ORIGINS.fork }}>
            <svg className={styles.svg} viewBox="0 0 512 512" focusable="false">
              <g ref={(el) => { refs.current.forkInner = el }}>
                <path className={styles.cream} ref={(el) => { refs.current.fork = el }} />
              </g>
            </svg>
          </div>
          <div className={styles.layer} ref={(el) => { refs.current.knifeLayer = el }} style={{ transformOrigin: ORIGINS.knife }}>
            <svg className={styles.svg} viewBox="0 0 512 512" focusable="false">
              <g ref={(el) => { refs.current.knifeInner = el }}>
                <path className={styles.yellow} ref={(el) => { refs.current.knife = el }} />
              </g>
            </svg>
          </div>
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className={styles.spark}
              data-color={s.color}
              style={s.style}
              ref={(el) => { refs.current.sparks[i] = el }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
