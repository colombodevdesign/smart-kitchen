import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Icon } from './ui/Icon.jsx'
import { RecipeCard } from './ui/RecipeCard.jsx'
import { md } from '../utils/markdown.js'
import { parseRecipes } from '../utils/parsers.js'
import { AI_STUDIO_URL } from '../ai/errors.js'
import styles from './SeasonalRecipesModal.module.css'

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

// Three recipes built around a seasonal ingredient tapped on Oggi, using what is
// in the pantry. `ai` is useAI(…, 'stagione'); `ingredient` null = closed.
export function SeasonalRecipesModal({ ingredient, ai, onClose, onSave, onGoApiKey }) {
  const [seen, setSeen] = useState([])
  const [savedKeys, setSavedKeys] = useState(() => new Set())
  const { fetchStagione, clearOutput } = ai
  // fetchStagione changes with every pantry update: only a new ingredient starts a request.
  const fetchRef = useRef(fetchStagione)
  fetchRef.current = fetchStagione

  useEffect(() => {
    if (!ingredient) return
    setSeen([])
    setSavedKeys(new Set())
    fetchRef.current(ingredient)
  }, [ingredient])

  const text = ai.messages.find(m => m.role === 'model')?.text ?? ''
  const recipes = useMemo(() => parseRecipes(text), [text])
  const streamingRecipes = useMemo(() => (ai.streaming ? parseRecipes(ai.streaming) : []), [ai.streaming])

  // Titles shown so far, so "Altre idee" never repeats them.
  useEffect(() => {
    if (recipes.length === 0) return
    setSeen(prev => [...new Set([...prev, ...recipes.map(r => r.data.title)])])
  }, [recipes])

  function close() {
    clearOutput()
    onClose()
  }

  function save(r) {
    onSave([r.data])
    setSavedKeys(prev => new Set(prev).add(r.key))
  }

  function more() {
    setSavedKeys(new Set())
    fetchStagione(ingredient, seen)
  }

  const busy = ai.loading || !!ai.streaming
  const waiting = busy && streamingRecipes.length === 0
  const done = !busy && !ai.error && text

  return (
    <Modal
      open={!!ingredient}
      onClose={close}
      title={ingredient ? capitalize(ingredient) : ''}
      footer={done ? (
        <button type="button" className={styles.more} onClick={more}>
          <Icon name="sparkle" size={18} /> Altre idee
        </button>
      ) : null}
    >
      <div className={styles.wrap} aria-live="polite" aria-busy={busy}>
        <p className={styles.intro}>
          Tre idee di stagione, usando anche quello che hai in dispensa.
        </p>

        {ai.error && (
          <section className={styles.error} role="alert">
            <strong className={styles.errorTitle}><Icon name="alert" size={20} /> Non riesco a trovare ricette</strong>
            <span className={styles.errorText}>{ai.error}</span>
            <div className={styles.errorActions}>
              {(ai.errorCode === 'no-key' || ai.errorCode === 'invalid-key') && onGoApiKey && (
                <button type="button" className={styles.primary} onClick={() => { close(); onGoApiKey() }}>
                  Imposta la chiave API
                </button>
              )}
              {ai.errorCode === 'billing' && (
                <a className={styles.primary} href={AI_STUDIO_URL} target="_blank" rel="noopener noreferrer">Apri AI Studio</a>
              )}
              <button type="button" className={styles.secondary} onClick={() => fetchStagione(ingredient, seen)}>Riprova</button>
            </div>
          </section>
        )}

        {waiting && (
          <p className={styles.waiting}>
            <span className={styles.dots} aria-hidden="true"><span /><span /><span /></span>
            Cerco qualche idea…
          </p>
        )}

        {busy
          ? streamingRecipes.map((r, i) => (
              <RecipeCard key={r.key} recipe={r.data} streaming={i === streamingRecipes.length - 1} />
            ))
          : recipes.map(r => (
              <RecipeCard key={r.key} recipe={r.data} saved={savedKeys.has(r.key)} onSave={() => save(r)} />
            ))}

        {done && recipes.length === 0 && (
          <div className={styles.plain} dangerouslySetInnerHTML={{ __html: md(text) }} />
        )}

        {done && ai.cached && <p className={styles.cached}>Già generate: nessun costo</p>}
      </div>
    </Modal>
  )
}
