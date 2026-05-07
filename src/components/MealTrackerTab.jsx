import { useState } from 'react'
import { MealFormModal } from './MealFormModal.jsx'
import { MealDetailSheet } from './MealDetailSheet.jsx'
import { CATEGORY_BY_ID } from '../data/mealCategories.js'
import styles from './MealTrackerTab.module.css'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTH_LABELS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTH_SHORT  = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

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

export function MealTrackerTab({ meals, onAdd, onRemove, savedRecipes = [], onOpenSavedRecipes }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewMode, setViewMode]   = useState('month')
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [weekOffset, setWeekOffset] = useState(0)

  const [modalState, setModalState] = useState({ mode: 'closed' })

  function openAdd(dateStr)            { setModalState({ mode: 'add', dateStr }) }
  function openDetail(dateStr, meal)   { setModalState({ mode: 'detail', dateStr, meal }) }
  function closeModal()                { setModalState({ mode: 'closed' }) }

  function handleSubmit(payload) {
    if (modalState.mode !== 'add') return
    onAdd(modalState.dateStr, payload)
  }

  function prevPeriod() {
    if (viewMode === 'week') { setWeekOffset(w => w - 1); return }
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextPeriod() {
    if (viewMode === 'week') { setWeekOffset(w => w + 1); return }
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function resetToToday() {
    setWeekOffset(0)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  // ── Month view cells ────────────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow    = mondayBasedDow(viewYear, viewMonth, 1)
  const monthCells  = []
  for (let i = 0; i < firstDow; i++) monthCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) monthCells.push(d)
  while (monthCells.length % 7 !== 0) monthCells.push(null)

  // ── Week view days ───────────────────────────────────────────
  const weekDays  = getWeekDays(today, weekOffset)
  const weekStart = weekDays[0]
  const weekEnd   = weekDays[6]
  const weekLabel = weekStart.month === weekEnd.month
    ? `${weekStart.day}–${weekEnd.day} ${MONTH_LABELS[weekStart.month]} ${weekStart.year}`
    : `${weekStart.day} ${MONTH_SHORT[weekStart.month]} – ${weekEnd.day} ${MONTH_SHORT[weekEnd.month]} ${weekEnd.year}`

  const periodLabel = viewMode === 'week'
    ? weekLabel
    : `${MONTH_LABELS[viewMonth]} ${viewYear}`

  function renderCell(dateStr, dayNum, isWeekView = false) {
    const dayMeals = meals[dateStr] ?? []
    const isToday  = dateStr === todayStr
    return (
      <button
        key={dateStr}
        type="button"
        className={`${styles.cell} ${isToday ? styles.today : ''} ${isWeekView ? styles.weekCell : ''}`}
        onClick={() => openAdd(dateStr)}
      >
        <div className={`${styles.dayNum} ${isWeekView ? styles.weekDayNum : ''}`}>{dayNum}</div>
        {dayMeals.length > 0 && (
          <ul className={styles.mealList}>
            {dayMeals.map(m => {
              const cat = m.category ? CATEGORY_BY_ID[m.category] : null
              return (
                <li key={m.id} className={styles.mealItem}>
                  <button
                    type="button"
                    className={styles.mealBtn}
                    onClick={(e) => { e.stopPropagation(); openDetail(dateStr, m) }}
                  >
                    <span
                      className={styles.categoryDot}
                      style={{ background: cat?.color ?? 'var(--text-hint)' }}
                      aria-hidden="true"
                    />
                    <span className={`${styles.mealText} ${isWeekView ? styles.weekMealText : ''}`}>{m.text}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </button>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.navRow}>
        <button className={styles.navBtn} onClick={prevPeriod}>‹</button>
        <button className={styles.periodLabel} onClick={resetToToday} title="Torna a oggi">
          {periodLabel}
        </button>
        <button className={styles.navBtn} onClick={nextPeriod}>›</button>
        <button
          className={`${styles.viewToggle} ${viewMode === 'week' ? styles.viewToggleActive : ''}`}
          onClick={() => setViewMode(v => v === 'month' ? 'week' : 'month')}
        >
          {viewMode === 'month' ? 'Settimana' : 'Mese'}
        </button>
      </div>

      <div className={`${styles.grid} ${viewMode === 'week' ? styles.gridWeek : ''}`}>
        {DAY_LABELS.map(d => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}

        {viewMode === 'month' && monthCells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className={styles.emptyCell} />
          return renderCell(toDateStr(viewYear, viewMonth, day), day, false)
        })}

        {viewMode === 'week' && weekDays.map(({ year, month, day }) =>
          renderCell(toDateStr(year, month, day), day, true)
        )}
      </div>

      <PeriodMealList
        periodDates={
          viewMode === 'week'
            ? weekDays.map(({ year, month, day }) => toDateStr(year, month, day))
            : monthCells.filter(Boolean).map(d => toDateStr(viewYear, viewMonth, d))
        }
        meals={meals}
        todayStr={todayStr}
        onSelectMeal={openDetail}
      />

      <button
        type="button"
        className={styles.fab}
        aria-label="Aggiungi pasto di oggi"
        onClick={() => openAdd(todayStr)}
      >
        <PlusIcon />
      </button>

      <MealFormModal
        open={modalState.mode === 'add'}
        onClose={closeModal}
        dateStr={modalState.dateStr}
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
        onOpenRecipe={onOpenSavedRecipes ? () => onOpenSavedRecipes() : undefined}
      />
    </div>
  )
}

function PeriodMealList({ periodDates, meals, todayStr, onSelectMeal }) {
  const groups = periodDates
    .map(dateStr => ({ dateStr, items: meals[dateStr] ?? [] }))
    .filter(g => g.items.length > 0)

  if (groups.length === 0) {
    return (
      <section className={styles.listSection}>
        <h4 className={styles.listTitle}>Pasti del periodo</h4>
        <p className={styles.listEmpty}>
          Nessun pasto registrato. Tocca un giorno o usa il pulsante <strong>+</strong> per aggiungerne uno.
        </p>
      </section>
    )
  }

  return (
    <section className={styles.listSection}>
      <h4 className={styles.listTitle}>Pasti del periodo</h4>
      <ol className={styles.listGroups}>
        {groups.map(({ dateStr, items }) => {
          const isToday = dateStr === todayStr
          return (
            <li key={dateStr} className={styles.listGroup}>
              <header className={`${styles.listDate} ${isToday ? styles.listDateToday : ''}`}>
                {formatListDate(dateStr)}
              </header>
              <ul className={styles.listMeals}>
                {items.map(m => {
                  const cat = m.category ? CATEGORY_BY_ID[m.category] : null
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={styles.listMealBtn}
                        onClick={() => onSelectMeal(dateStr, m)}
                      >
                        <span
                          className={styles.listDot}
                          style={{ background: cat?.color ?? 'var(--text-hint)' }}
                          aria-hidden="true"
                        />
                        <span className={styles.listMealMain}>
                          <span className={styles.listMealText}>{m.text}</span>
                          {cat && <span className={styles.listMealCat}>{cat.label}</span>}
                        </span>
                        {m.recipeTitle && (
                          <span className={styles.listMealRecipe} title={m.recipeTitle}>
                            ↗ {m.recipeTitle}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function formatListDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][date.getDay()]
  return `${dow} ${d} ${MONTH_SHORT[m - 1].toLowerCase()}`
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
