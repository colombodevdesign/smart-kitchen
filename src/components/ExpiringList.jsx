import { useMemo } from 'react'
import { Icon } from './ui/Icon.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { EmptyState } from './ui/EmptyState.jsx'
import { getPantryCandidates, itemBadge } from '../utils/pantry.js'
import { SECTION_LABELS } from '../data/initialInventory.js'
import styles from './ExpiringList.module.css'

const GROUPS = [
  { id: 'expired', title: 'Scaduti', hint: 'Controllali prima di usarli.' },
  { id: 'soon',    title: 'In scadenza' },
  { id: 'use',     title: 'Da usare presto', hint: 'Aperti o freschi da qualche giorno.' },
  { id: 'calm',    title: 'Aperti, nessuna fretta', hint: 'Si conservano ancora a lungo.' },
]

function groupOf(c) {
  if (c.status === 'expired' || c.status === 'soon') return c.status
  return c.relevant ? 'use' : 'calm'
}

// Every expired, expiring, opened or ageing fresh product, in one list, most
// urgent first. Opened from Oggi ("Vedi tutti") and from the daily notification.
export function ExpiringList({ inventory, onBack, onCook }) {
  const groups = useMemo(() => {
    const all = getPantryCandidates(inventory)
    return GROUPS
      .map(g => ({ ...g, items: all.filter(c => groupOf(c) === g.id) }))
      .filter(g => g.items.length > 0)
  }, [inventory])

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>In scadenza</h1>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="check" title="Niente in scadenza" text="La dispensa è a posto." />
      ) : (
        <>
          {groups.map(g => (
            <section key={g.id} className={styles.group} aria-labelledby={`exp-${g.id}`}>
              <div className={styles.groupHead}>
                <h2 id={`exp-${g.id}`} className={styles.legend}>{g.title}</h2>
                <span className={styles.count}>{g.items.length}</span>
              </div>
              {g.hint && <p className={styles.hint}>{g.hint}</p>}
              <ul className={styles.list}>
                {g.items.map(c => {
                  const badge = itemBadge(c.item, { age: true, section: c.section })
                  return (
                    <li key={c.id} className={styles.row}>
                      <span className={styles.name}>
                        <strong>{c.name}</strong>
                        <span>{[c.qty, SECTION_LABELS[c.section]].filter(Boolean).join(' · ')}</span>
                      </span>
                      {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          <button type="button" className={styles.cta} onClick={onCook}>
            <Icon name="sparkle" size={20} /> Cosa cucino con questi?
          </button>
        </>
      )}
    </div>
  )
}
