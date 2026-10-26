// Coreografia dell'animazione di avvio: forchetta e coltello si avvicinano, si
// toccano due volte (con scintille) e si trasformano nel logo SK. Funzioni pure:
// `logoFrame(t)` dà tutto ciò che serve a disegnare l'istante t (secondi), il
// componente LogoMorph lo applica al DOM.
import { LOGO_MORPH as D } from '../components/ui/logoMorphData.js'

const P = D.pose

export const MORPH_START = 1.6
export const MORPH_DURATION = 0.75
// Il logo è formato (poi resta fermo): da qui la splash può chiudersi.
export const FORMED_AT = 2.75
export const SPARK_LINES = 10   // 2 impatti × 5 raggi

const SPARK_HITS = [[0.9, 1], [1.3, 0.7]]   // [istante, forza]
const SPARK_DEGREES = [-165, -125, -90, -55, -15]
const CREAM_SPARK = 'var(--brand-cream)'
const YELLOW_SPARK = 'var(--brand-yellow)'

const clamp = (v) => Math.min(1, Math.max(0, v))

const EASE = {
  lin: (u) => u,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
}

// list: [[istante, valore, easing d'arrivo], …]
function keyframes(list, x) {
  if (x <= list[0][0]) return list[0][1]
  for (let i = 1; i < list.length; i++) {
    if (x <= list[i][0]) {
      const u = (x - list[i - 1][0]) / (list[i][0] - list[i - 1][0])
      return list[i - 1][1] + (list[i][1] - list[i - 1][1]) * EASE[list[i][2]](u)
    }
  }
  return list[list.length - 1][1]
}

// Inclinazione verso il centro (gradi): parte verso l'esterno, colpisce, rimbalza,
// colpisce di nuovo piano, poi si raddrizza mentre il morph prende il sopravvento.
const TILT = [
  [0, -34, 'lin'], [0.45, -34, 'lin'],
  [0.9, P.hit, 'in'], [1.12, 4, 'out'],
  [1.3, P.hit, 'in'], [1.55, 6, 'out'],
  [FORMED_AT, 6, 'lin'],
]

// Dalla posa «in piedi» (k = 1) alla posizione nel logo (k = 0).
function place(c, target, angle, k) {
  const x = c[0] + (target[0] - c[0]) * k
  const y = c[1] + (target[1] - c[1]) * k
  return `translate(${x} ${y}) rotate(${angle * k}) translate(${-c[0]} ${-c[1]})`
}

function mix(a, b, k) {
  let d = 'M'
  for (let i = 0; i < a.length; i += 2) {
    d += `${i ? 'L' : ''}${(a[i] + (b[i] - a[i]) * k).toFixed(1)} ${(a[i + 1] + (b[i + 1] - a[i + 1]) * k).toFixed(1)}`
  }
  return d + 'Z'
}

function sparks(t) {
  const out = []
  for (const [at, strength] of SPARK_HITS) {
    const s = (t - at) / 0.3
    const live = s >= 0 && s <= 1
    SPARK_DEGREES.forEach((deg, i) => {
      if (!live) { out.push(null); return }
      const a = (deg * Math.PI) / 180
      const r0 = 12 + 10 * EASE.out(s)
      const r1 = r0 + strength * 18 * (1 - s)
      out.push({
        x1: P.contact[0] + Math.cos(a) * r0, y1: P.contact[1] + Math.sin(a) * r0,
        x2: P.contact[0] + Math.cos(a) * r1, y2: P.contact[1] + Math.sin(a) * r1,
        color: i % 2 ? YELLOW_SPARK : CREAM_SPARK,
        opacity: (1 - s) * strength,
      })
    })
  }
  return out
}

export function logoFrame(t) {
  const tilt = keyframes(TILT, t)
  const m = EASE.io(clamp((t - MORPH_START) / MORPH_DURATION))
  const w = 1 - m
  const enter = EASE.out(clamp(t / 0.4))
  const pop = 1 + 0.05 * Math.sin(Math.PI * clamp((t - 2.3) / 0.4))
  return {
    opacity: enter,
    stage: `translate(256 252) scale(${pop}) translate(-256 -252) translate(0 ${(1 - enter) * 36})`,
    forkOuter: `rotate(${tilt * w} ${P.pivF[0]} ${P.pivF[1]})`,
    forkInner: place(P.cF, P.tF, P.angF, w),
    forkD: m >= 1 ? D.cream : mix(D.F, D.S, m),
    knifeOuter: `rotate(${-tilt * w} ${P.pivK[0]} ${P.pivK[1]})`,
    knifeInner: place(P.cK, P.tK, P.angK, w),
    knifeD: m >= 1 ? D.yellow : mix(D.KN, D.K, m),
    sparks: sparks(t),
  }
}

// Stato finale (logo formato): per chi preferisce meno movimento.
export const LOGO_FINAL = logoFrame(FORMED_AT)
