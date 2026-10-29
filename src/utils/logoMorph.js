// Coreografia dell'animazione di avvio: forchetta e coltello si avvicinano, si
// toccano due volte (con scintille) e si trasformano nel logo SK. Funzioni pure.
// Fino a MORPH_START tutto è transform/opacity: LogoMorph lo affida alla Web Animations
// API (gira sul compositor, non si ferma se il thread principale è occupato dall'avvio
// dell'app). Il morph dei path non può: `morphFrame(t)` dà ciò che serve a disegnarlo.
import { LOGO_MORPH as D } from '../components/ui/logoMorphData.js'

const P = D.pose

export const ENTER = 0.35           // comparsa (dissolvenza + salita)
export const MORPH_START = 1.2
export const MORPH_DURATION = 0.6
const POP = [1.75, 0.3]             // [inizio, durata] del piccolo «battito» del logo formato
// Il logo è formato (poi resta fermo): da qui la splash può chiudersi.
export const FORMED_AT = 2.1

const SPARK_HITS = [[0.65, 1], [0.98, 0.7]]   // [istante, forza]
const SPARK_DURATION = 0.26
const SPARK_DEGREES = [-165, -125, -90, -55, -15]

// Inclinazione verso il centro (gradi): parte verso l'esterno, colpisce, rimbalza,
// colpisce di nuovo piano, poi si raddrizza mentre il morph prende il sopravvento.
const TILT = [
  [0, -34, 'lin'], [0.3, -34, 'lin'],
  [0.65, P.hit, 'in'], [0.83, 4, 'out'],
  [0.98, P.hit, 'in'], [1.18, 6, 'out'],
  [FORMED_AT, 6, 'lin'],
]

const clamp = (v) => Math.min(1, Math.max(0, v))

const EASE = {
  lin: (u) => u,
  in: (u) => u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
}
// Le stesse curve per la Web Animations API (quadratiche).
const CSS_EASE = {
  lin: 'linear',
  in: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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

const pct = (v) => `${(v / 512) * 100}%`

// Centri di rotazione (transform-origin) in percentuale del quadrato 512 del logo.
export const ORIGINS = {
  fork: `${pct(P.pivF[0])} ${pct(P.pivF[1])}`,
  knife: `${pct(P.pivK[0])} ${pct(P.pivK[1])}`,
  stage: `50% ${pct(252)}`,
}

// ── Fase 1 (0 → MORPH_START): animazioni per il compositor, tempi in ms ──

export function enterAnimation() {
  return {
    keyframes: [
      { opacity: 0, transform: `translateY(${pct(36)})` },
      { opacity: 1, transform: 'none' },
    ],
    options: { duration: ENTER * 1000, easing: CSS_EASE.out, fill: 'both' },
  }
}

// Oscillazione della forchetta (sign = 1) o del coltello (sign = -1) fino al morph.
export function tiltAnimation(sign) {
  const frames = TILT.filter(([at]) => at <= MORPH_START)
  return {
    keyframes: frames.map(([at, deg], i) => ({
      offset: at / MORPH_START,
      transform: `rotate(${sign * deg}deg)`,
      // la curva di un keyframe vale per il tratto che parte da lì: è quella d'arrivo del successivo
      easing: CSS_EASE[frames[i + 1]?.[2] ?? 'lin'],
    })).concat(frames[frames.length - 1][0] < MORPH_START
      ? [{ offset: 1, transform: `rotate(${sign * keyframes(TILT, MORPH_START)}deg)` }]
      : []),
    options: { duration: MORPH_START * 1000, fill: 'both' },
  }
}

export function popAnimation() {
  return {
    keyframes: [
      { transform: 'scale(1)', easing: 'ease-in-out' },
      { transform: 'scale(1.05)', easing: 'ease-in-out' },
      { transform: 'scale(1)' },
    ],
    options: { delay: POP[0] * 1000, duration: POP[1] * 1000 },
  }
}

// Scintille: barrette con estremi arrotondati che partono dal punto di contatto.
// Geometria in unità del quadrato 512; LogoMorph le posiziona in percentuale.
export function sparks() {
  const out = []
  SPARK_HITS.forEach(([at, strength]) => {
    const length = strength * 18 + 6   // tratto più lungo + i due tappi da 3
    SPARK_DEGREES.forEach((deg, i) => {
      const steps = [0, 0.25, 0.5, 0.75, 1]
      out.push({
        color: i % 2 ? 'yellow' : 'cream',
        style: {
          left: pct(P.contact[0]),
          top: pct(P.contact[1] - 3),
          width: pct(length),
          height: pct(6),
        },
        keyframes: steps.map((s) => {
          const r0 = 12 + 10 * EASE.out(s)
          const visible = strength * 18 * (1 - s) + 6
          return {
            offset: s,
            opacity: (1 - s) * strength,
            transform: `rotate(${deg}deg) translateX(${((r0 - 3) / length) * 100}%) scaleX(${visible / length})`,
          }
        }),
        options: { delay: at * 1000, duration: SPARK_DURATION * 1000 },
      })
    })
  })
  return out
}

// ── Fase 2 (da MORPH_START): morph dei path, disegnato a ogni frame ──

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

// Istante t (secondi): rotazione dei livelli (gradi) e, dentro, posa e forma dei due pezzi.
// Prima di MORPH_START restituisce la posa «in piedi» con l'inclinazione di quell'istante.
export function morphFrame(t) {
  const tilt = keyframes(TILT, t)
  const m = EASE.io(clamp((t - MORPH_START) / MORPH_DURATION))
  const w = 1 - m
  return {
    forkRotate: tilt * w,
    forkInner: place(P.cF, P.tF, P.angF, w),
    forkD: m >= 1 ? D.cream : mix(D.F, D.S, m),
    knifeRotate: -tilt * w,
    knifeInner: place(P.cK, P.tK, P.angK, w),
    knifeD: m >= 1 ? D.yellow : mix(D.KN, D.K, m),
  }
}

// Stato finale (logo formato): per chi preferisce meno movimento.
export const LOGO_FINAL = morphFrame(FORMED_AT)
