import { Icon } from './Icon.jsx'
import { md } from '../../utils/markdown.js'
import styles from './RecipeCard.module.css'

// One AI recipe. `content` is the recipe markdown starting with "## Title";
// the title is shown as the card heading, the rest rendered below it.
export function RecipeCard({ recipe, streaming = false, saved = false, onSave }) {
  const body = recipe.content.replace(/^## .+\n?/, '')
  return (
    <article className={`${styles.card} ${streaming ? styles.streaming : ''}`} aria-busy={streaming || undefined}>
      {streaming && (
        <p className={styles.live}><Icon name="sparkle" size={16} /> Sto scrivendo…</p>
      )}
      <h3 className={styles.title}>{recipe.title}</h3>
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: md(body) }} />
      {streaming && <span className={styles.cursor} aria-hidden="true" />}
      {onSave && !streaming && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.save}
            onClick={onSave}
            disabled={saved}
            aria-pressed={saved}
          >
            <Icon name={saved ? 'check' : 'bookmark'} size={18} />
            {saved ? 'Salvata' : 'Salva'}
          </button>
        </div>
      )}
    </article>
  )
}
