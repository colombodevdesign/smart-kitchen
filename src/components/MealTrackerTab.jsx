import { useEffect, useMemo, useState } from 'react'
import { MealFormModal } from './MealFormModal.jsx'
import { MealDetailSheet } from './MealDetailSheet.jsx'
import { Icon } from './ui/Icon.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { CATEGORY_BY_ID, MEAL_CATEGORIES } from '../data/mealCategories.js'
import { toDateStr } from '../utils/date.js'
import styles from './MealTrackerTab.module.css'

const DAY_LETTERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const MONTH_LABELS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTH_SHORT  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const WEEKDAYS = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato']

function mondayBasedDow(year, month, day) {
  const d = new Date(year, month, day).getDay()
  return (d + 6) % 7
}

function getWeekDays(baseDate, weekOffset) {
  const dow = mondayBasedDow(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - dow + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
  })
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function longLabel(dateStr, isToday) {
  const d = parseDate(dateStr)
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
  return isToday ? `Oggi, ${base}` : base.charAt(0).toUpperCase() + base.slice(1)
}

export function MealTrackerTab({ meals, onAdd, onRemove, savedRecipes = [], onOpenSavedRecipes, addRequested, onAddHandled }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewMode, setViewMode]   = useState('week')
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected]   = useState(todayStr)

  const [modalState, setModalState] = useState({ mode: 'closed' })

  function openAdd(dateStr, defaultCategory = null) { setModalState({ mode: 'add', dateStr, defaultCategory }) }
  function openDetail(dateStr, meal)               { setModalState({ mode: 'detail', dateStr, meal }) }
  function closeModal()                            { setModalState({ mode: 'closed' }) }

  // "P" shortcut from anywhere: add a meal on the selected day.
  useEffect(() => {
    if (!addRequested) return
    openAdd(selected)
    onAddHandled?.()
  }, [addRequested]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(payload) {
    if (modalState.mode !== 'add') return
    onAdd(modalState.dateStr, payload)
  }

  function step(dir) {
    if (viewMode === 'week') { setWeekOffset(w => w + dir); return }
    const next = viewMonth + dir
    if (next < 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else if (next > 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(next)
  }

  function resetToToday() {
    setWeekOffset(0)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelected(todayStr)
  }

  // Month view: leading blanks so day 1 lands on the right weekday
  const monthCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < mondayBasedDow(viewYear, viewMonth, 1); i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(viewYear, viewMonth, d))
    return cells
  }, [viewYear, viewMonth])

  const weekDays  = getWeekDays(today, weekOffset)
  const weekStart = weekDays[0]
  const weekEnd   = weekDays[6]
  const periodLabel = viewMode === 'week'
    ? (weekStart.month === weekEnd.month
        ? `${weekStart.day}–${weekEnd.day} ${MONTH_LABELS[weekStart.month].toLowerCase()}`
        : `${weekStart.day} ${MONTH_SHORT[weekStart.month]} – ${weekEnd.day} ${MONTH_SHORT[weekEnd.month]}`)
    : `${MONTH_LABELS[viewMonth]} ${viewYear}`

  const cells = viewMode === 'week'
    ? weekDays.map(({ year, month, day }) => toDateStr(year, month, day))
    : monthCells

  function renderCell(dateStr, i) {
    if (!dateStr) return <span key={`e-${i}`} aria-hidden="true" />
    const dayMeals = meals[dateStr] ?? []
    const cats = [...new Set(dayMeals.map(m => m.category ?? 'none'))].slice(0, 4)
    const d = parseDate(dateStr)
    const isToday = dateStr === todayStr
    const isSelected = dateStr === selected
    const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()}${isToday ? ', oggi' : ''}${dayMeals.length ? `, ${dayMeals.length} ${dayMeals.length === 1 ? 'pasto' : 'pasti'}` : ''}`
    return (
      <button
        key={dateStr}
        type="button"
        className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
        aria-label={label}
        aria-pressed={isSelected}
        onClick={() => setSelected(dateStr)}
      >
        <span className={`${styles.num} ${isToday ? styles.numToday : ''}`}>{d.getDate()}</span>
        <span className={styles.dots} aria-hidden="true">
          {cats.map(c => <span key={c} className={styles.dot} data-cat={c === 'none' ? undefined : c} />)}
        </span>
      </button>
    )
  }

  const dayMeals = meals[selected] ?? []
  const hasDinner = dayMeals.some(m => m.category === 'cena')

  return (
    <div className={styles.wrap}>
      <div className={styles.navRow}>
        <button type="button" className={styles.navBtn} onClick={() => step(-1)} aria-label={viewMode === 'week' ? 'Settimana precedente' : 'Mese precedente'}>
          <Icon name="chevL" size={22} strokeWidth={2} />
        </button>
        <button type="button" className={styles.periodLabel} onClick={resetToToday} title="Torna a oggi">
          {periodLabel}
        </button>
        <button type="button" className={styles.navBtn} onClick={() => step(1)} aria-label={viewMode === 'week' ? 'Settimana successiva' : 'Mese successivo'}>
          <Icon name="chevR" size={22} strokeWidth={2} />
        </button>
        <Segmented
          className={styles.viewSeg}
          ariaLabel="Vista del calendario"
          value={viewMode}
          onChange={setViewMode}
          options={[{ value: 'week', label: 'Settimana' }, { value: 'month', label: 'Mese' }]}
        />
      </div>

      <div className={styles.layout}>
        <div>
          <div className={styles.letters} aria-hidden="true">
            {DAY_LETTERS.map((l, i) => <span key={i}>{l}</span>)}
          </div>
          <div className={styles.grid}>{cells.map(renderCell)}</div>
        </div>

        <section className={styles.day} aria-labelledby="meals-day">
          <h3 id="meals-day" className={styles.dayTitle}>{longLabel(selected, selected === todayStr)}</h3>

          {dayMeals.length > 0 && (
            <ul className={styles.meals}>
              {dayMeals.map(m => {
                const cat = m.category ? CATEGORY_BY_ID[m.category] : null
                return (
                  <li key={m.id}>
                    <button type="button" className={styles.meal} onClick={() => openDetail(selected, m)}>
                      <span className={styles.mealCat}>
                        <span className={styles.dot} data-cat={cat?.id} aria-hidden="true" />
                        {cat?.label ?? 'Pasto'}
                      </span>
                      <span className={styles.mealText}>{m.text}</span>
                      {m.recipeTitle && <span className={styles.mealRecipe}>{m.recipeTitle}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className={styles.addRow}>
            {!hasDinner && (
              <button type="button" className={styles.add} onClick={() => openAdd(selected, 'cena')}>
                <Icon name="plus" size={20} strokeWidth={2} /> Aggiungi la cena
              </button>
            )}
            <button type="button" className={styles.add} onClick={() => openAdd(selected)}>
              <Icon name="plus" size={20} strokeWidth={2} /> {dayMeals.length === 0 ? 'Aggiungi un pasto' : 'Aggiungi un altro pasto'}
            </button>
          </div>
          <ul className={styles.legend} aria-label="Legenda">
            {MEAL_CATEGORIES.map(c => (
              <li key={c.id}><span className={styles.dot} data-cat={c.id} aria-hidden="true" /> {c.label}</li>
            ))}
          </ul>
        </section>
      </div>

      <MealFormModal
        open={modalState.mode === 'add'}
        onClose={closeModal}
        dateStr={modalState.dateStr}
        defaultCategory={modalState.defaultCategory}
        savedRecipes={savedRecipes}
        onSubmit={handleSubmit}
      />

      <MealDetailSheet
        open={modalState.mode === 'detail'}
        onClose={closeModal}
        meal={modalState.meal}
        dateStr={modalState.dateStr}
        savedRecipes={savedRecipes}
        onRemove={onRemove}
        onOpenRecipe={onOpenSavedRecipes ? (id) => onOpenSavedRecipes(id) : undefined}
      />
    </div>
  )
}
