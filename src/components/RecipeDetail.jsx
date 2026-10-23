import { useMemo, useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { itemBadge } from '../utils/pantry.js'
import { md } from '../utils/markdown.js'
import { recipeAvailability } from '../utils/ingredientMatch.js'
import { hasApiKey } from '../utils/apiKey.js'
import styles from './RecipeDetail.module.css'

// Splits "## Title … ### Ingredienti … ### Procedimento …" into its parts.
function splitRecipe(content) {
  const sections = {}
  let current = 'intro'
  sections[current] = []
  for (const line of content.split('\n')) {
    const h = line.match(/^###\s+(.+)$/)
    if (h) { current = h[1].trim().toLowerCase(); sections[current] = []; continue }
    if (/^##\s+/.test(line)) continue
    sections[current].push(line)
  }
  const steps = (sections.procedimento ?? [])
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2))
  return { intro: (sections.intro ?? []).join('\n').trim(), steps, hasSteps: steps.length > 0, sections }
}

const STATE_LABEL = { have: 'In dispensa', missing: 'Manca', qb: 'q.b.' }
const STATE_TONE = { have: 'ok', soon: 'soon', expired: 'expired', open: 'open', missing: 'neutral', qb: 'neutral' }

export function RecipeDetail({ recipe, inventory, onBack, onRemove, onCookTonight, onPlan, onAddMissing, onAnalyze }) {
  const [analyzing, setAnalyzing] = useState(false)
  const a = useMemo(() => recipeAvailability(recipe, inventory), [recipe, inventory])
  const parts = useMemo(() => splitRecipe(recipe.content), [recipe.content])
  const useSoon = a ? a.rows.filter(r => r.state === 'soon' || r.state === 'open').length : 0

  async function analyze() {
    setAnalyzing(true)
    try { await onAnalyze(recipe) } finally { setAnalyzing(false) }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.bookmark}
          onClick={() => onRemove(recipe.id)}
          aria-label="Rimuovi dalle ricette salvate"
          aria-pressed="true"
        >
          <Icon name="bookmark" size={22} fill="currentColor" />
        </button>
      </div>

      <h1 className={styles.title}>{recipe.title}</h1>

      {a && (
        <div className={styles.chips}>
          <StatusBadge tone={a.tone}>Hai {a.have} ingredienti su {a.total}</StatusBadge>
          {useSoon > 0 && (
            <StatusBadge tone="soon">
              Usa {useSoon === 1 ? '1 prodotto' : `${useSoon} prodotti`} in scadenza
            </StatusBadge>
          )}
        </div>
      )}

      {parts.intro && <div className={styles.intro} dangerouslySetInnerHTML={{ __html: md(parts.intro) }} />}

      <section className={styles.card} aria-labelledby="rd-ingredienti">
        <h2 id="rd-ingredienti" className={styles.label}>Ingredienti</h2>
        {a ? (
          <ul className={styles.rows}>
            {a.rows.map((r, i) => {
              const fromItem = r.state === 'soon' || r.state === 'expired' || r.state === 'open'
              const label = fromItem ? itemBadge(r.item, { age: true, section: r.section })?.label : STATE_LABEL[r.state]
              return (
                <li key={i} className={styles.row}>
                  <span className={styles.name}>
                    {r.ingredient.name.charAt(0).toUpperCase() + r.ingredient.name.slice(1)}
                    {r.ingredient.qty && <span className={styles.qty}>{r.ingredient.qty}</span>}
                  </span>
                  <StatusBadge tone={STATE_TONE[r.state]}>{label}</StatusBadge>
                </li>
              )
            })}
          </ul>
        ) : (
          <>
            <div className={styles.fallback} dangerouslySetInnerHTML={{ __html: md((parts.sections.ingredienti ?? []).join('\n')) }} />
            <button type="button" className={styles.analyze} onClick={analyze} disabled={analyzing || !hasApiKey()}>
              <Icon name="sparkle" size={18} /> {analyzing ? 'Analizzo…' : 'Analizza ingredienti'}
            </button>
            {!hasApiKey() && <p className={styles.note}>Serve la chiave Gemini (la imposti in Tu).</p>}
          </>
        )}
      </section>

      {a && a.missing.length > 0 && (
        <button type="button" className={styles.addMissing} onClick={() => onAddMissing(a.missing)}>
          <Icon name="cart" size={20} />
          {a.missing.length === 1 ? 'Aggiungi 1 mancante alla spesa' : `Aggiungi ${a.missing.length} mancanti alla spesa`}
        </button>
      )}

      <section aria-labelledby="rd-procedimento">
        <h2 id="rd-procedimento" className={styles.label}>Procedimento</h2>
        {parts.hasSteps ? (
          <ol className={styles.steps}>
            {parts.steps.map((s, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.fallback} dangerouslySetInnerHTML={{ __html: md(recipe.content) }} />
        )}
      </section>

      <div className={styles.bar} data-fixed>
        <button type="button" className={styles.planBtn} onClick={onPlan} aria-label="Pianifica nei pasti">
          <Icon name="calendar" size={22} />
        </button>
        <button type="button" className={styles.cook} onClick={() => onCookTonight(recipe)}>Cucino stasera</button>
      </div>
    </div>
  )
}
