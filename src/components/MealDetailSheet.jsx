import { Modal } from './Modal.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { CATEGORY_BY_ID, REMINDER_LEADS } from '../data/mealCategories.js'
import { isPlanned, mealReminderTime, mealTime } from '../utils/meals.js'
import { recipeAvailability } from '../utils/ingredientMatch.js'
import styles from './MealDetailSheet.module.css'
import { Icon } from './ui/Icon.jsx'

const DAYS = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

function dayWord(dateStr, todayStr) {
  if (dateStr === todayStr) return 'Oggi'
  const [y, m, d] = todayStr.split('-').map(Number)
  const t = new Date(y, m - 1, d + 1)
  const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  return dateStr === tomorrow ? 'Domani' : formatDateLabel(dateStr)
}

// A meal of Cucina › Pasti. A planned one also shows its reminder (switch), the
// pantry check of its linked recipe and "Segna come mangiato".
export function MealDetailSheet({
  open, onClose, meal, dateStr, todayStr, savedRecipes = [], inventory, mealPrefs,
  onRemove, onOpenRecipe, onEdit, onMarkEaten, onUpdate, onAddMissing,
}) {
  if (!meal) return null

  const cat = meal.category ? CATEGORY_BY_ID[meal.category] : null
  const linkedRecipe = meal.recipeId ? savedRecipes.find(r => r.id === meal.recipeId) : null
  const planned = isPlanned(meal)
  const time = planned ? mealTime(meal, mealPrefs?.times) : null
  const a = planned && linkedRecipe && inventory ? recipeAvailability(linkedRecipe, inventory) : null
  const remindAt = mealReminderTime(meal, mealPrefs?.times)
  const leadLabel = REMINDER_LEADS.find(l => l.value === meal.reminder?.lead)?.label.toLowerCase()

  const handleRemove = () => {
    onRemove(dateStr, meal.id)
    onClose()
  }

  const handleOpenRecipe = () => {
    if (!linkedRecipe || !onOpenRecipe) return
    onOpenRecipe(linkedRecipe.id)
    onClose()
  }

  const toggleReminder = () => {
    onUpdate?.(dateStr, meal.id, { reminder: meal.reminder ? null : { lead: mealPrefs?.lead ?? '30' } })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={planned ? `In programma · ${formatDateLabel(dateStr)}` : `Pasto · ${formatDateLabel(dateStr)}`}
      autoFocus={false}
      footer={
        <div className={styles.footer}>
          {planned && dateStr <= todayStr && (
            <button type="button" className={styles.btnPrimary} onClick={() => { onMarkEaten?.(dateStr, meal.id); onClose() }}>
              <Icon name="check" size={18} strokeWidth={2.4} /> Segna come mangiato
            </button>
          )}
          <div className={styles.footerRow}>
            {onEdit && (
              <button type="button" className={styles.btnSecondary} onClick={() => onEdit(dateStr, meal)}>Modifica</button>
            )}
            <button type="button" className={styles.btnRemove} onClick={handleRemove}>
              {planned ? 'Elimina' : 'Rimuovi'}
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.categoryRow}>
          {cat ? (
            <span className={styles.categoryChip} data-cat={cat.id}>
              <Icon name={cat.icon} size={16} />
              {cat.label}{time ? ` · ${time}` : ''}
            </span>
          ) : (
            <span className={styles.categoryNone}>— Nessuna categoria</span>
          )}
          {planned && <StatusBadge tone="ok">In programma</StatusBadge>}
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

        {a && (
          <div className={styles.pantry}>
            <div className={styles.pantryHead}>
              <StatusBadge tone={a.tone}>Hai {a.have} ingredienti su {a.total}</StatusBadge>
              {a.missing.length > 0 && <span className={styles.muted}>mancano {a.missing.length}</span>}
            </div>
            <div className={styles.bar} role="img" aria-label={`${a.have} ingredienti su ${a.total} in dispensa`}>
              <span style={{ '--p': a.total ? a.have / a.total : 0 }} />
            </div>
            {a.missing.length > 0 && onAddMissing && (
              <button type="button" className={styles.addMissing} onClick={() => onAddMissing(a.missing)}>
                <Icon name="cart" size={18} />
                {a.missing.length === 1 ? 'Aggiungi il mancante alla spesa' : `Aggiungi i ${a.missing.length} mancanti alla spesa`}
              </button>
            )}
          </div>
        )}

        {planned && (
          <div className={styles.reminder}>
            <span className={styles.reminderIcon} aria-hidden="true"><Icon name="bell" size={20} /></span>
            <span className={styles.reminderText}>
              <strong>Promemoria</strong>
              <span>
                {meal.reminder
                  ? (remindAt ? `${dayWord(dateStr, todayStr)} alle ${remindAt} · ${leadLabel}` : 'Troppo vicino alla mezzanotte')
                  : 'Nessun promemoria'}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!meal.reminder}
              aria-label="Promemoria"
              className={`${styles.toggle} ${meal.reminder ? styles.on : ''}`}
              onClick={toggleReminder}
            >
              <span className={styles.thumb} />
            </button>
          </div>
        )}
        {planned && meal.reminder && !mealPrefs?.enabled && (
          <p className={styles.note}>I promemoria dei pasti sono spenti: attivali in Tu › Notifiche per riceverli.</p>
        )}
      </div>
    </Modal>
  )
}
