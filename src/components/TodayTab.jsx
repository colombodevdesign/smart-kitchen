import { useMemo, useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { getUseSoonItems, itemBadge } from '../utils/pantry.js'
import { todayStr } from '../utils/date.js'
import { getSeasonal, getMonthName } from '../data/seasonal.js'
import { ExpiringList } from './ExpiringList.jsx'
import styles from './TodayTab.module.css'

function greeting(hour) {
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MAX_ITEMS = 3
const MAX_SEASONAL = 4

export function TodayTab({ inventory, meals, detail, onOpenExpiring, onCloseDetail, onCook, onSeasonal, onPlan, onSavedRecipes, onProfile, onAdd }) {
  if (detail?.type === 'scadenze') {
    return <ExpiringList inventory={inventory} onBack={onCloseDetail} onCook={onCook} />
  }
  return <Today inventory={inventory} meals={meals} onOpenExpiring={onOpenExpiring} onCook={onCook} onSeasonal={onSeasonal} onPlan={onPlan} onSavedRecipes={onSavedRecipes} onProfile={onProfile} onAdd={onAdd} />
}

function Today({ inventory, meals, onOpenExpiring, onCook, onSeasonal, onPlan, onSavedRecipes, onProfile, onAdd }) {
  const now = new Date()
  const [allSeasonal, setAllSeasonal] = useState(false)
  const dateLabel = capitalize(now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }))

  const useSoon = useMemo(() => getUseSoonItems(inventory), [inventory])
  const shown = useSoon.slice(0, MAX_ITEMS)

  const seasonal = getSeasonal()
  const dinner = (meals?.[todayStr(now)] ?? []).find(m => m.category === 'cena')

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>{dateLabel}</p>
          <h1 className={styles.greeting}>{greeting(now.getHours())}</h1>
        </div>
        <button type="button" className={styles.avatar} onClick={onProfile} aria-label="Profilo e impostazioni">
          <Icon name="user" size={22} />
        </button>
      </header>

      <div className={styles.grid}>
        <section className={styles.hero} aria-labelledby="today-soon">
          <div className={styles.heroHead}>
            <h2 id="today-soon" className={styles.heroTitle}>Da usare presto</h2>
            {useSoon.length > 0 && (
              <span className={styles.heroCount}>
                {useSoon.length === 1 ? '1 prodotto' : `${useSoon.length} prodotti`}
              </span>
            )}
          </div>

          {shown.length === 0 ? (
            <p className={styles.heroEmpty}>Niente in scadenza: la dispensa è a posto.</p>
          ) : (
            <ul className={styles.heroList}>
              {shown.map(c => {
                const badge = itemBadge(c.item, { age: true, section: c.section })
                return (
                  <li key={c.id} className={styles.heroRow}>
                    <div className={styles.heroName}>
                      <span>{c.name}</span>
                      {c.qty && <span className={styles.heroQty}>{c.qty}</span>}
                    </div>
                    {badge && <span className={styles.heroBadge}>{badge.label}</span>}
                  </li>
                )
              })}
            </ul>
          )}
          {useSoon.length > MAX_ITEMS && (
            <button type="button" className={styles.heroMore} onClick={onOpenExpiring}>
              Vedi tutti ({useSoon.length}) <Icon name="chevR" size={16} strokeWidth={2.2} />
            </button>
          )}

          <button type="button" className={styles.cta} onClick={onCook}>
            <Icon name="sparkle" size={20} />
            {shown.length > 0 ? 'Cosa cucino con questi?' : 'Cosa cucino stasera?'}
          </button>
        </section>

        <div className={styles.side}>
          <section className={styles.card} aria-labelledby="today-dinner">
            <div className={styles.cardHead}>
              <h2 id="today-dinner" className={styles.cardTitle}>Stasera · Cena</h2>
              {!dinner && <span className={styles.muted}>non pianificata</span>}
            </div>
            {dinner ? (
              <p className={styles.dinner}>{dinner.text}</p>
            ) : (
              <div className={styles.cardActions}>
                <button type="button" className={styles.btnSoft} onClick={onPlan}>Pianifica</button>
                <button type="button" className={styles.btnLine} onClick={onSavedRecipes}>Ricette salvate</button>
              </div>
            )}
          </section>

          <section className={styles.season} aria-labelledby="today-season">
            <div>
              <h2 id="today-season" className={styles.cardTitle}>Di stagione, a {getMonthName().toLowerCase()}</h2>
              <p className={styles.muted}>Tocca un ingrediente per qualche idea di ricetta.</p>
            </div>
            <ul className={styles.chips}>
              {(allSeasonal ? seasonal : seasonal.slice(0, MAX_SEASONAL)).map(name => (
                <li key={name}>
                  <button type="button" className={styles.chip} onClick={() => onSeasonal?.(name)}>
                    {capitalize(name)}
                  </button>
                </li>
              ))}
              {seasonal.length > MAX_SEASONAL && (
                <li>
                  <button
                    type="button"
                    className={`${styles.chip} ${styles.chipMore}`}
                    onClick={() => setAllSeasonal(v => !v)}
                    aria-expanded={allSeasonal}
                    aria-label={allSeasonal ? 'Mostra meno ingredienti di stagione' : `Mostra altri ${seasonal.length - MAX_SEASONAL} ingredienti di stagione`}
                  >
                    {allSeasonal ? 'Meno' : `+${seasonal.length - MAX_SEASONAL}`}
                  </button>
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>

      {onAdd && (
        <button type="button" className={styles.fab} onClick={onAdd} aria-label="Aggiungi prodotti">
          <Icon name="plus" size={26} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
