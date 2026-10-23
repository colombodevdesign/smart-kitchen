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
  { id: 'open',    title: 'Aperti' },
]

const byExpiry = (a, b) => (a.item.expiresAt ?? Infinity) - (b.item.expiresAt ?? Infinity)

// Every expired, expiring or opened product, in one list. Opened from Oggi
// ("Vedi tutti") and from the daily expiry notification.
export function ExpiringList({ inventory, onBack, onCook }) {
  const groups = useMemo(() => {
    const all = getPantryCandidates(inventory)
    const pick = id => all.filter(c => (c.status === 'expired' || c.status === 'soon' ? c.status : 'open') === id)
    return GROUPS
      .map(g => ({ ...g, items: pick(g.id).sort(byExpiry) }))
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
                  const badge = itemBadge(c.item)
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
