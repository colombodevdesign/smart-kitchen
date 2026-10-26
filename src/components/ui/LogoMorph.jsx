import { useEffect, useRef } from 'react'
import { logoFrame, FORMED_AT, SPARK_LINES } from '../../utils/logoMorph.js'
import styles from './LogoMorph.module.css'

// Forchetta e coltello che si toccano e diventano il logo SK, poi resta il logo.
// Disegna aggiornando direttamente gli attributi SVG (nessun render React per frame).
// `onFormed` scatta quando il logo è formato; con `prefers-reduced-motion` mostra
// subito il logo finale.
export function LogoMorph({ onFormed, className }) {
  const refs = useRef({ lines: [] })
  const onFormedRef = useRef(onFormed)
  onFormedRef.current = onFormed

  useEffect(() => {
    const r = refs.current
    const apply = (f) => {
      r.stage.setAttribute('transform', f.stage)
      r.stage.setAttribute('opacity', f.opacity)
      r.forkOuter.setAttribute('transform', f.forkOuter)
      r.forkInner.setAttribute('transform', f.forkInner)
      r.fork.setAttribute('d', f.forkD)
      r.knifeOuter.setAttribute('transform', f.knifeOuter)
      r.knifeInner.setAttribute('transform', f.knifeInner)
      r.knife.setAttribute('d', f.knifeD)
      r.lines.forEach((line, i) => {
        const s = f.sparks[i]
        if (!s) { line.setAttribute('opacity', 0); return }
        line.setAttribute('x1', s.x1); line.setAttribute('y1', s.y1)
        line.setAttribute('x2', s.x2); line.setAttribute('y2', s.y2)
        line.setAttribute('stroke', s.color)
        line.setAttribute('opacity', s.opacity)
      })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply(logoFrame(FORMED_AT))
      onFormedRef.current?.()
      return undefined
    }

    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min((now - start) / 1000, FORMED_AT)
      apply(logoFrame(t))
      if (t < FORMED_AT) raf = requestAnimationFrame(tick)
      else onFormedRef.current?.()
    }
    apply(logoFrame(0))
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg className={`${styles.logo} ${className ?? ''}`} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <g ref={(el) => { refs.current.stage = el }} opacity="0">
        <g ref={(el) => { refs.current.forkOuter = el }}>
          <g ref={(el) => { refs.current.forkInner = el }}>
            <path className={styles.cream} ref={(el) => { refs.current.fork = el }} />
          </g>
        </g>
        <g ref={(el) => { refs.current.knifeOuter = el }}>
          <g ref={(el) => { refs.current.knifeInner = el }}>
            <path className={styles.yellow} ref={(el) => { refs.current.knife = el }} />
          </g>
        </g>
        {Array.from({ length: SPARK_LINES }, (_, i) => (
          <line
            key={i}
            className={styles.spark}
            opacity="0"
            ref={(el) => { refs.current.lines[i] = el }}
          />
        ))}
      </g>
    </svg>
  )
}
