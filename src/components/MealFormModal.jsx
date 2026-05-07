import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { MEAL_CATEGORIES } from '../data/mealCategories.js'
import styles from './MealFormModal.module.css'

const DAYS = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

export function MealFormModal({ open, onClose, dateStr, savedRecipes = [], onSubmit }) {
  const [text, setText]         = useState('')
  const [category, setCategory] = useState(null)
  const [recipeId, setRecipeId] = useState('')

  const reset = () => { setText(''); setCategory(null); setRecipeId('') }

  const handleClose = () => { reset(); onClose() }

  const canSubmit = text.trim().length > 0 && category !== null

  const submit = () => {
    if (!canSubmit) return
    const linked = recipeId ? savedRecipes.find(r => r.id === recipeId) : null
    onSubmit({
      text: text.trim(),
      category,
      recipeId: linked?.id ?? null,
      recipeTitle: linked?.title ?? linked?.label ?? null,
    })
    reset()
    onClose()
  }

  const onTextKey = (e) => {
    if (e.key === 'Enter' && canSubmit) { e.preventDefault(); submit() }
  }

  const title = dateStr ? `Pasto · ${formatDateLabel(dateStr)}` : 'Nuovo pasto'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button type="button" className={styles.btnSecondary} onClick={handleClose}>Annulla</button>
          <button type="button" className={styles.btnPrimary} onClick={submit} disabled={!canSubmit}>Salva</button>
        </>
      }
    >
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Descrizione</span>
          <input
            className={styles.input}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onTextKey}
            placeholder="Cosa hai mangiato?"
            autoFocus
          />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Categoria</span>
          <div className={styles.chips}>
            {MEAL_CATEGORIES.map(cat => {
              const selected = category === cat.id
              return (
                <button
                  type="button"
                  key={cat.id}
                  className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                  onClick={() => setCategory(cat.id)}
                  style={selected ? { borderColor: cat.color, background: cat.color } : undefined}
                >
                  <span className={styles.chipEmoji}>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {savedRecipes.length > 0 && (
          <label className={styles.field}>
            <span className={styles.label}>Collega ricetta (opzionale)</span>
            <select
              className={styles.select}
              value={recipeId}
              onChange={e => setRecipeId(e.target.value)}
            >
              <option value="">Nessuna</option>
              {savedRecipes.map(r => (
                <option key={r.id} value={r.id}>{r.title ?? r.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </Modal>
  )
}
