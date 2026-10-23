import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { MEAL_CATEGORIES, REMINDER_LEADS, DEFAULT_MEAL_TIMES } from '../data/mealCategories.js'
import { effectiveLead, isUpcoming, mealTime, reminderTime } from '../utils/meals.js'
import styles from './MealFormModal.module.css'
import { Icon } from './ui/Icon.jsx'

const DAYS = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

const MODES = [{ value: 'plan', label: 'Da mangiare' }, { value: 'done', label: 'Già mangiato' }]

// Adds a meal to the log or plans one (Cucina › Pasti), or edits one (`initial`
// with an id). A future day can only be planned, a past one only logged; today
// starts from the time of the chosen category. `initial` without an id prefills
// a new meal (e.g. "Pianifica" from a saved recipe).
export function MealFormModal({
  open, onClose, dateStr, todayStr, defaultCategory = null, initial = null,
  savedRecipes = [], mealPrefs, onSubmit,
}) {
  const times = mealPrefs?.times ?? DEFAULT_MEAL_TIMES
  const editing = !!initial?.id
  const [text, setText]         = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [recipeId, setRecipeId] = useState('')
  const [mode, setMode]         = useState('done')
  const [time, setTime]         = useState('')
  const [remind, setRemind]     = useState(false)
  const [lead, setLead]         = useState('30')
  const [day, setDay]           = useState(dateStr)
  const touched = useRef({ mode: false, time: false })

  const forcedMode = editing ? null : day > todayStr ? 'plan' : day < todayStr ? 'done' : null

  function defaultMode(d, cat) {
    if (d > todayStr) return 'plan'
    if (d < todayStr) return 'done'
    return isUpcoming(d, cat ? times[cat] : null, todayStr) ? 'plan' : 'done'
  }

  useEffect(() => {
    if (!open) return
    const cat = initial?.category ?? defaultCategory
    const linked = initial?.recipeId ? savedRecipes.find(r => r.id === initial.recipeId) : null
    touched.current = { mode: editing || !!initial?.planned, time: editing && !!initial?.time }
    setText(initial?.text ?? (linked ? (linked.title ?? linked.label ?? '') : ''))
    setCategory(cat)
    setRecipeId(initial?.recipeId ?? '')
    setDay(dateStr)
    // A prefilled meal can ask to be planned ("Pianifica" on a recipe), unless the day is past.
    setMode(editing ? (initial.planned ? 'plan' : 'done')
      : initial?.planned && dateStr >= todayStr ? 'plan' : defaultMode(dateStr, cat))
    setTime(editing ? (mealTime(initial, times) ?? '') : (cat ? times[cat] : ''))
    setRemind(editing ? !!initial.reminder : !!mealPrefs?.enabled)
    setLead(initial?.reminder?.lead ?? mealPrefs?.lead ?? '30')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function pickCategory(cat) {
    setCategory(cat)
    if (!touched.current.time) setTime(times[cat] ?? '')
    if (!touched.current.mode && !editing) setMode(defaultMode(day, cat))
  }

  const plan = (forcedMode ?? mode) === 'plan'
  const leads = REMINDER_LEADS.filter(l => l.value !== 'am' || effectiveLead('am', time) === 'am')
  const shownLead = effectiveLead(lead, time)
  const at = plan && remind ? reminderTime(time, shownLead) : null

  let remindSub = 'Nessun promemoria'
  if (plan && remind) {
    if (!at) remindSub = 'Troppo vicino alla mezzanotte per un promemoria'
    else if (day === todayStr && !isUpcoming(day, at, todayStr)) remindSub = `Le ${at} sono già passate: nessun avviso`
    else remindSub = `Ti avviso alle ${at}`
  }

  const canSubmit = text.trim().length > 0 && category !== null && (!plan || /^\d{2}:\d{2}$/.test(time))

  const submit = () => {
    if (!canSubmit) return
    const linked = recipeId ? savedRecipes.find(r => r.id === recipeId) : null
    onSubmit({
      text: text.trim(),
      category,
      recipeId: linked?.id ?? null,
      recipeTitle: linked?.title ?? linked?.label ?? null,
      planned: plan,
      time: plan ? time : null,
      reminder: plan && remind ? { lead: shownLead } : null,
    }, day)
    onClose()
  }

  const onTextKey = (e) => {
    if (e.key === 'Enter' && canSubmit) { e.preventDefault(); submit() }
  }

  const title = editing
    ? 'Modifica pasto'
    : dateStr ? `${plan ? 'Pianifica' : 'Pasto'} · ${formatDateLabel(day ?? dateStr)}` : 'Nuovo pasto'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>Annulla</button>
          <button type="button" className={styles.btnPrimary} onClick={submit} disabled={!canSubmit}>
            {editing ? 'Salva' : plan ? 'Pianifica' : 'Registra'}
          </button>
        </>
      }
    >
      <div className={styles.form}>
        {!forcedMode && (
          <Segmented
            ariaLabel="Tipo di pasto"
            value={mode}
            onChange={(v) => { touched.current.mode = true; setMode(v) }}
            options={MODES}
          />
        )}

        <label className={styles.field}>
          <span className={styles.label}>Descrizione</span>
          <input
            className={styles.input}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onTextKey}
            placeholder={plan ? 'Cosa mangerai?' : 'Cosa hai mangiato?'}
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
                  onClick={() => pickCategory(cat.id)}
                  data-cat={cat.id}
                  aria-pressed={selected}
                >
                  <Icon name={cat.icon} size={18} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {(editing || plan) && (
          <div className={styles.row}>
            {editing && (
              <label className={styles.field}>
                <span className={styles.label}>Giorno</span>
                <input
                  className={styles.input}
                  type="date"
                  value={day}
                  onChange={e => e.target.value && setDay(e.target.value)}
                />
              </label>
            )}
            {plan && (
              <label className={styles.field}>
                <span className={styles.label}>Orario</span>
                <input
                  className={styles.input}
                  type="time"
                  value={time}
                  onChange={e => { touched.current.time = true; setTime(e.target.value) }}
                />
              </label>
            )}
          </div>
        )}

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

        {plan && (
          <div className={styles.remind}>
            <button
              type="button"
              role="switch"
              aria-checked={remind}
              className={styles.remindHead}
              onClick={() => setRemind(r => !r)}
            >
              <span className={styles.remindIcon} aria-hidden="true"><Icon name="bell" size={20} /></span>
              <span className={styles.remindText}>
                <strong>Avvisami</strong>
                <span>{remindSub}</span>
              </span>
              <span className={`${styles.toggle} ${remind ? styles.on : ''}`} aria-hidden="true"><span className={styles.thumb} /></span>
            </button>
            {remind && (
              <div className={styles.leads} role="group" aria-label="Quando avvisarmi">
                {leads.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    className={`${styles.lead} ${shownLead === l.value ? styles.leadOn : ''}`}
                    aria-pressed={shownLead === l.value}
                    onClick={() => setLead(l.value)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
            {remind && !mealPrefs?.enabled && (
              <p className={styles.remindNote}>
                I promemoria dei pasti sono spenti: attivali in Tu › Notifiche per riceverli.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
