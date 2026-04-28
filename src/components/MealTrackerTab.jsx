import { useState, useRef, useEffect } from 'react'
import styles from './MealTrackerTab.module.css'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTH_LABELS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function mondayBasedDow(year, month, day) {
  const d = new Date(year, month, day).getDay()
  return (d + 6) % 7
}

export function MealTrackerTab({ meals, onAdd, onRemove }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [addingFor, setAddingFor] = useState(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  useEffect(() => {
    if (addingFor) inputRef.current?.focus()
  }, [addingFor])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function startAdd(dateStr) {
    setAddingFor(dateStr)
    setDraft('')
  }

  function confirmAdd() {
    if (draft.trim() && addingFor) onAdd(addingFor, draft.trim())
    setAddingFor(null)
    setDraft('')
  }

  function handleKey(e) {
    if (e.key === 'Enter') confirmAdd()
    if (e.key === 'Escape') { setAddingFor(null); setDraft('') }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = mondayBasedDow(viewYear, viewMonth, 1)

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className={styles.wrap}>
      <div className={styles.nav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <span className={styles.monthLabel}>{MONTH_LABELS[viewMonth]} {viewYear}</span>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.grid}>
        {DAY_LABELS.map(d => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className={styles.emptyCell} />
          const dateStr = toDateStr(viewYear, viewMonth, day)
          const dayMeals = meals[dateStr] ?? []
          const isToday = dateStr === todayStr
          const isAdding = addingFor === dateStr

          return (
            <div key={dateStr} className={`${styles.cell} ${isToday ? styles.today : ''}`}>
              <div className={styles.dayNum}>{day}</div>
              {dayMeals.length > 0 && (
                <ul className={styles.mealList}>
                  {dayMeals.map(m => (
                    <li key={m.id} className={styles.mealItem}>
                      <span className={styles.mealText}>{m.text}</span>
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
        })}
      </div>
    </div>
  )
}
