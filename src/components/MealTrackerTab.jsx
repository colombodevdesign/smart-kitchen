import { useEffect, useMemo, useState } from 'react'
import { MealFormModal } from './MealFormModal.jsx'
import { MealDetailSheet } from './MealDetailSheet.jsx'
import { Icon } from './ui/Icon.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { CATEGORY_BY_ID, MEAL_CATEGORIES } from '../data/mealCategories.js'
import { toDateStr } from '../utils/date.js'
import { isPlanned, mealReminderTime, mealTime, upcomingPlanned } from '../utils/meals.js'
import styles from './MealTrackerTab.module.css'

const DAY_LETTERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const MONTH_LABELS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTH_SHORT  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const WEEKDAYS = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato']
const WEEKDAYS_SHORT = ['DOM','LUN','MAR','MER','GIO','VEN','SAB']

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

function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

// Cucina › Pasti: a log of what was eaten and a planner of what is to come.
// Planned meals (planned: true) have hollow dots, a time, an optional reminder and
// a "Mangiato" button that moves them to the log.
export function MealTrackerTab({
  meals, onAdd, onRemove, onUpdate, onMarkEaten, savedRecipes = [], inventory, mealPrefs,
  onOpenSavedRecipes, onAddMissing, addRequested, onAddHandled,
}) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewMode, setViewMode]   = useState('week')
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected]   = useState(todayStr)

  // { mode: 'closed' | 'add' | 'edit' | 'detail', dateStr, mealId?, defaultCategory?, initial? }
  const [modalState, setModalState] = useState({ mode: 'closed' })
  const times = mealPrefs?.times

  function openAdd(dateStr, defaultCategory = null, initial = null) { setModalState({ mode: 'add', dateStr, defaultCategory, initial }) }
  function openDetail(dateStr, meal)  { setModalState({ mode: 'detail', dateStr, mealId: meal.id }) }
  function openEdit(dateStr, meal)    { setModalState({ mode: 'edit', dateStr, mealId: meal.id }) }
  // Keeps the meal (and its date) while the sheet plays its exit animation.
  function closeModal()               { setModalState(s => ({ ...s, mode: 'closed' })) }

  // The meal shown in the sheet or form, live (a reminder toggled in the sheet shows at once).
  const current = modalState.mealId ? (meals[modalState.dateStr] ?? []).find(m => m.id === modalState.mealId) ?? null : null

  // "P" from anywhere, or "Pianifica" on a saved recipe ({ recipeId }): a new meal on
  // the selected day (today if a past day is selected for a recipe).
  useEffect(() => {
    if (!addRequested) return
    if (addRequested.recipeId) {
      openAdd(selected < todayStr ? todayStr : selected, 'cena', { recipeId: addRequested.recipeId, planned: true })
    } else {
      openAdd(selected)
    }
    onAddHandled?.()
  }, [addRequested]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(payload, day) {
    if (modalState.mode === 'add') {
      onAdd(day, payload)
      if (day !== selected) setSelected(day)
    } else if (modalState.mode === 'edit' && current) {
      onUpdate?.(modalState.dateStr, current.id, payload, day)
    }
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
    const dots = [...new Map(dayMeals.map(m => {
      const key = `${m.category ?? 'none'}:${isPlanned(m) ? 'p' : 'e'}`
      return [key, { key, cat: m.category, planned: isPlanned(m) }]
    })).values()].slice(0, 4)
    const d = parseDate(dateStr)
    const isToday = dateStr === todayStr
    const isSelected = dateStr === selected
    const nPlanned = dayMeals.filter(isPlanned).length
    const nEaten = dayMeals.length - nPlanned
    const counts = [
      nEaten && (nPlanned ? `${nEaten} ${nEaten === 1 ? 'mangiato' : 'mangiati'}` : `${nEaten} ${nEaten === 1 ? 'pasto' : 'pasti'}`),
      nPlanned && `${nPlanned} in programma`,
    ].filter(Boolean).join(' e ')
    const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()}${isToday ? ', oggi' : ''}${counts ? `, ${counts}` : ''}`
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
          {dots.map(o => (
            <span key={o.key} className={`${styles.dot} ${o.planned ? styles.dotPlanned : ''}`} data-cat={o.cat ?? undefined} />
          ))}
        </span>
      </button>
    )
  }

  const dayMeals = meals[selected] ?? []
  const hasDinner = dayMeals.some(m => m.category === 'cena')
  const future = selected > todayStr
  const upcoming = upcomingPlanned(meals, todayStr, 7, times)

  function renderMeal(m) {
    const cat = m.category ? CATEGORY_BY_ID[m.category] : null
    if (!isPlanned(m)) {
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
    }
    const time = mealTime(m, times)
    const remindAt = mealReminderTime(m, times)
    return (
      <li key={m.id} className={styles.planned}>
        <button type="button" className={styles.plannedHead} onClick={() => openDetail(selected, m)}>
          <span className={`${styles.dot} ${styles.dotPlanned} ${styles.dotBig}`} data-cat={cat?.id} aria-hidden="true" />
          <span className={styles.plannedText}>
            <span className={styles.mealCat}>{cat?.label ?? 'Pasto'}{time ? ` · ${time}` : ''}</span>
            <span className={styles.mealText}>{m.text}</span>
            {m.recipeTitle && m.recipeTitle !== m.text && <span className={styles.mealRecipe}>{m.recipeTitle}</span>}
          </span>
          <span className={styles.badge}>In programma</span>
        </button>
        <div className={styles.plannedFoot}>
          <span className={styles.remindAt}>
            <Icon name="bell" size={16} />
            {remindAt ? `Promemoria alle ${remindAt}` : 'Nessun promemoria'}
          </span>
          {selected <= todayStr && (
            <button type="button" className={styles.eatenBtn} onClick={() => onMarkEaten?.(selected, m.id)} aria-label={`Segna ${m.text} come mangiato`}>
              <Icon name="check" size={16} strokeWidth={2.4} /> Mangiato
            </button>
          )}
        </div>
      </li>
    )
  }

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
        <div className={styles.calendar}>
          <div className={styles.letters} aria-hidden="true">
            {DAY_LETTERS.map((l, i) => <span key={i}>{l}</span>)}
          </div>
          <div className={styles.grid}>{cells.map(renderCell)}</div>
          <ul className={styles.legend} aria-label="Legenda">
            <li><span className={styles.dot} aria-hidden="true" /> Mangiato</li>
            <li><span className={`${styles.dot} ${styles.dotPlanned}`} aria-hidden="true" /> In programma</li>
          </ul>
        </div>

        <div className={styles.side}>
          <section className={styles.day} aria-labelledby="meals-day">
            <h3 id="meals-day" className={styles.dayTitle}>{longLabel(selected, selected === todayStr)}</h3>

            {dayMeals.length > 0 && <ul className={styles.meals}>{dayMeals.map(renderMeal)}</ul>}

            <div className={styles.addRow}>
              {!hasDinner && (
                <button type="button" className={styles.add} onClick={() => openAdd(selected, 'cena')}>
                  <Icon name="plus" size={20} strokeWidth={2} /> {future ? 'Pianifica la cena' : 'Aggiungi la cena'}
                </button>
              )}
              <button type="button" className={styles.add} onClick={() => openAdd(selected)}>
                <Icon name="plus" size={20} strokeWidth={2} />
                {future
                  ? (dayMeals.length === 0 ? 'Pianifica un pasto' : 'Pianifica un altro pasto')
                  : (dayMeals.length === 0 ? 'Aggiungi un pasto' : 'Aggiungi un altro pasto')}
              </button>
            </div>
            <ul className={styles.legend} aria-label="Categorie">
              {MEAL_CATEGORIES.map(c => (
                <li key={c.id}><span className={styles.dot} data-cat={c.id} aria-hidden="true" /> {c.label}</li>
              ))}
            </ul>
          </section>

          <section className={styles.day} aria-labelledby="meals-next">
            <div className={styles.sectionHead}>
              <h3 id="meals-next" className={styles.dayTitle}>In programma</h3>
              <button type="button" className={styles.planLink} onClick={() => openAdd(future ? selected : addDays(todayStr, 1))}>
                <Icon name="plus" size={20} strokeWidth={2} /> Pianifica
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p className={styles.empty}>Niente in programma nei prossimi 7 giorni.</p>
            ) : (
              <ul className={styles.meals}>
                {upcoming.map(({ dateStr, meal }) => {
                  const d = parseDate(dateStr)
                  const cat = meal.category ? CATEGORY_BY_ID[meal.category] : null
                  const remindAt = mealReminderTime(meal, times)
                  return (
                    <li key={meal.id}>
                      <button type="button" className={styles.nextRow} onClick={() => openDetail(dateStr, meal)}>
                        <span className={styles.nextDate}>
                          <span>{WEEKDAYS_SHORT[d.getDay()]}</span>
                          <strong>{d.getDate()}</strong>
                        </span>
                        <span className={styles.plannedText}>
                          <span className={styles.mealCat}>{cat?.label ?? 'Pasto'}</span>
                          <span className={styles.mealText}>{meal.text}</span>
                        </span>
                        <span className={styles.nextRemind}>
                          {remindAt ? <><Icon name="bell" size={16} />{remindAt}</> : 'nessun avviso'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <MealFormModal
        open={modalState.mode === 'add' || modalState.mode === 'edit'}
        onClose={closeModal}
        dateStr={modalState.dateStr}
        todayStr={todayStr}
        defaultCategory={modalState.defaultCategory}
        initial={modalState.mealId ? current : modalState.initial}
        savedRecipes={savedRecipes}
        mealPrefs={mealPrefs}
        onSubmit={handleSubmit}
      />

      <MealDetailSheet
        open={modalState.mode === 'detail' && !!current}
        onClose={closeModal}
        meal={modalState.mode === 'detail' || modalState.mode === 'closed' ? current : null}
        dateStr={modalState.dateStr}
        todayStr={todayStr}
        savedRecipes={savedRecipes}
        inventory={inventory}
        mealPrefs={mealPrefs}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onMarkEaten={onMarkEaten}
        onEdit={onUpdate ? openEdit : undefined}
        onAddMissing={onAddMissing}
        onOpenRecipe={onOpenSavedRecipes ? (id) => onOpenSavedRecipes(id) : undefined}
      />
    </div>
  )
}
