import { useMemo } from 'react'
import { Icon } from './ui/Icon.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { EmptyState } from './ui/EmptyState.jsx'
import { recipeAvailability } from '../utils/ingredientMatch.js'
import styles from './SavedRecipesTab.module.css'

export function SavedRecipesTab({ recipes, inventory, onOpen, onRemove, onCookTonight, onAddMissing }) {
  // Recipes you can cook with what you have come first; the others keep their order.
  const sorted = useMemo(() => {
    return recipes
      .map((r, i) => {
        const a = recipeAvailability(r, inventory)
        return { r, i, a, ratio: a && a.total > 0 ? a.have / a.total : -1 }
      })
      .sort((x, y) => y.ratio - x.ratio || x.i - y.i)
  }, [recipes, inventory])

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="bookmark"
        title="Nessuna ricetta salvata"
        text="Genera ricette con l'AI e salvale dalla scheda Ricette AI."
      />
    )
  }

  const anyAvailability = sorted.some(s => s.a)

  return (
    <div className={styles.wrap}>
      <p className={styles.count}>
        {recipes.length === 1 ? '1 ricetta' : `${recipes.length} ricette`}
        {anyAvailability && ' · ordinate per ingredienti che hai'}
      </p>
      <ul className={styles.list}>
        {sorted.map(({ r, a }) => (
          <li key={r.id} className={styles.card}>
            <h3 className={styles.recipeTitle}>
              <button type="button" className={styles.titleBtn} onClick={() => onOpen(r.id)}>{r.title}</button>
            </h3>
            {a && (
              <div>
                <StatusBadge tone={a.tone}>Hai {a.have} ingredienti su {a.total}</StatusBadge>
              </div>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.cook} onClick={() => onCookTonight(r)}>Cucino stasera</button>
              {a && a.missing.length > 0 && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => onAddMissing(a.missing)}
                  aria-label={`Aggiungi alla spesa i ${a.missing.length} ingredienti mancanti`}
                  title="Aggiungi i mancanti alla spesa"
                >
                  <Icon name="cart" size={20} />
                </button>
              )}
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.danger}`}
                onClick={() => onRemove(r.id)}
                aria-label={`Elimina ${r.title}`}
              >
                <Icon name="trash" size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
