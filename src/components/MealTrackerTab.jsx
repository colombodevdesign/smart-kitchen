import { useState, useRef, useEffect } from 'react'
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

export function MealTrackerTab({ meals, onAdd, onRemove }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewMode, setViewMode]   = useState('month')
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [weekOffset, setWeekOffset] = useState(0)

  const [addingFor, setAddingFor] = useState(null)
  const [draft, setDraft]         = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (addingFor) inputRef.current?.focus()
  }, [addingFor])

  function startAdd(dateStr) { setAddingFor(dateStr); setDraft('') }

  function confirmAdd() {
    if (draft.trim() && addingFor) onAdd(addingFor, draft.trim())
    setAddingFor(null)
    setDraft('')
  }

  function handleKey(e) {
    if (e.key === 'Enter') confirmAdd()
    if (e.key === 'Escape') { setAddingFor(null); setDraft('') }
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
    const isAdding = addingFor === dateStr
    return (
      <div
        key={dateStr}
        className={`${styles.cell} ${isToday ? styles.today : ''} ${isWeekView ? styles.weekCell : ''}`}
      >
        <div className={`${styles.dayNum} ${isWeekView ? styles.weekDayNum : ''}`}>{dayNum}</div>
        {dayMeals.length > 0 && (
          <ul className={styles.mealList}>
            {dayMeals.map(m => (
              <li key={m.id} className={styles.mealItem}>
                <span className={`${styles.mealText} ${isWeekView ? styles.weekMealText : ''}`}>{m.text}</span>
                <button className={styles.removeMeal} onClick={() => onRemove(dateStr, m.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
        {isAdding ? (
          <input
            ref={inputRef}
            className={styles.addInput}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={confirmAdd}
            placeholder="Cosa hai mangiato?"
          />
        ) : (
          <button className={styles.addBtn} onClick={() => startAdd(dateStr)}>+</button>
        )}
      </div>
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
    </div>
  )
}
