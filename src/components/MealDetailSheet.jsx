import { Modal } from './Modal.jsx'
import { CATEGORY_BY_ID } from '../data/mealCategories.js'
import styles from './MealDetailSheet.module.css'

const DAYS = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

export function MealDetailSheet({ open, onClose, meal, dateStr, savedRecipes = [], onRemove, onOpenRecipe }) {
  if (!meal) return null

  const cat = meal.category ? CATEGORY_BY_ID[meal.category] : null
  const linkedRecipe = meal.recipeId ? savedRecipes.find(r => r.id === meal.recipeId) : null

  const handleRemove = () => {
    onRemove(dateStr, meal.id)
    onClose()
  }

  const handleOpenRecipe = () => {
    if (!linkedRecipe || !onOpenRecipe) return
    onOpenRecipe(linkedRecipe.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pasto · ${formatDateLabel(dateStr)}`}
      footer={
        <button type="button" className={styles.btnRemove} onClick={handleRemove}>Rimuovi</button>
      }
    >
      <div className={styles.body}>
        <div className={styles.categoryRow}>
          {cat ? (
            <span className={styles.categoryChip} style={{ background: cat.color }}>
              <span className={styles.chipEmoji}>{cat.emoji}</span>
              {cat.label}
            </span>
          ) : (
            <span className={styles.categoryNone}>— Nessuna categoria</span>
          )}
        </div>

        <p className={styles.text}>{meal.text}</p>

        {meal.recipeId && (
          <div className={styles.recipeRow}>
            <span className={styles.recipeLabel}>Ricetta collegata</span>
            {linkedRecipe ? (
              <button type="button" className={styles.recipeLink} onClick={handleOpenRecipe}>
                {linkedRecipe.title ?? linkedRecipe.label} →
              </button>
            ) : (
              <span
                className={styles.recipeMissing}
                title="Ricetta non più disponibile"
              >
                {meal.recipeTitle ?? 'Ricetta rimossa'}
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
