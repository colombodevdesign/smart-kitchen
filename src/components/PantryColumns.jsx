import { useMemo } from 'react'
import { AnimatePresence, LazyMotion, MotionConfig, m } from 'motion/react'
import { ItemRow } from './ItemRow.jsx'
import { PantryComposer } from './PantryComposer.jsx'
import { Icon, SectionIcon } from './ui/Icon.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import { getPantryCandidates, itemBadge } from '../utils/pantry.js'
import styles from './PantryColumns.module.css'

// Desktop pantry: three columns, or one expanded section with the other two
// folded into preview cards. The cards are the same elements in every layout:
// Motion animates them (FLIP) between the grid and the expanded arrangement.
//
//   mode 'column' → one of three columns
//   mode 'focus'  → the expanded section (list + add form)
//   mode 'rail'   → a folded section: preview card, click to expand
const loadFeatures = () => import('../motionFeatures.js').then(mod => mod.default)
const SPRING = { type: 'spring', stiffness: 340, damping: 38, mass: 0.9 }
const FADE = { duration: 0.14 }
const PREVIEW_ROWS = 3

function Rows({ pairs, rowProps, variant }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {pairs.map(({ item, itemSection }) => (
        <m.div
          key={item.id}
          layout="position"
          className={styles.rowWrap}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ layout: SPRING, default: FADE }}
        >
          <ItemRow item={item} section={itemSection} variant={variant} showSection={false} searchQuery="" {...rowProps} />
        </m.div>
      ))}
    </AnimatePresence>
  )
}

function Preview({ pairs }) {
  if (pairs.length === 0) return <p className={styles.previewEmpty}>Vuoto</p>
  return (
    <>
      <ul className={styles.preview}>
        {pairs.slice(0, PREVIEW_ROWS).map(({ item }) => {
          const badge = itemBadge(item)
          return (
            <li key={item.id} className={styles.previewRow}>
              <span className={styles.previewName}>{item.name}</span>
              {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
            </li>
          )
        })}
      </ul>
      {pairs.length > PREVIEW_ROWS && <span className={styles.previewMore}>+{pairs.length - PREVIEW_ROWS} altri</span>}
    </>
  )
}

const RADIUS = { column: 24, focus: 28, rail: 24 }
const ICON_SIZE = { column: 22, focus: 26, rail: 20 }

function SectionCard({ section, mode, pairs, soonCount, onExpand, onCollapse, rowProps, composerProps }) {
  const label = SECTION_LABELS[section]
  const countText = pairs.length === 1 ? '1 prodotto' : `${pairs.length} prodotti`
  const placement = mode === 'focus'
    ? { gridColumn: 1, gridRow: '1 / span 2' }
    : mode === 'rail' ? { gridColumn: 2 } : undefined

  return (
    <m.section
      layout
      aria-label={label}
      className={`${styles.card} ${styles[mode]}`}
      // Set through `style` so Motion keeps the radius round while the box scales.
      style={{ borderRadius: RADIUS[mode], ...placement }}
    >
      <m.header layout="position" className={styles.head}>
        <span className={styles.tile}><SectionIcon section={section} size={ICON_SIZE[mode]} /></span>
        <div className={styles.headText}>
          <h2 className={styles.title}>{label}</h2>
          <span className={styles.sub}>{countText}</span>
        </div>
        {mode === 'focus' && soonCount > 0 && <span className={styles.soon}>{soonCount} da usare presto</span>}
        {mode === 'column' && (
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onExpand(section)}
            aria-label={`Espandi ${label}`}
            title={`Espandi ${label}`}
          >
            <Icon name="expand" size={18} />
          </button>
        )}
        {mode === 'focus' && (
          <button type="button" className={styles.collapseBtn} onClick={onCollapse}>
            <Icon name="collapse" size={18} /> Riduci
          </button>
        )}
        {mode === 'rail' && <Icon name="expand" size={18} className={styles.railIcon} />}
      </m.header>

      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={mode}
          layout="position"
          className={styles.body}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ layout: SPRING, default: FADE }}
        >
          {mode === 'rail' ? (
            <>
              {soonCount > 0 && <span className={styles.railSoon}>{soonCount} da usare presto</span>}
              <Preview pairs={pairs} />
            </>
          ) : (
            <>
              {mode === 'focus' && <PantryComposer section={section} {...composerProps} />}
              {mode === 'focus' && pairs.length > 0 && (
                <div className={styles.tableHead} aria-hidden="true">
                  <span>Prodotto</span><span>Quantità</span><span>Scadenza</span><span />
                </div>
              )}
              {pairs.length === 0
                ? <p className={styles.columnEmpty}>Vuoto</p>
                : (
                  <div className={styles.list}>
                    <Rows pairs={pairs} rowProps={rowProps} variant={mode === 'focus' ? 'table' : 'flat'} />
                  </div>
                )}
            </>
          )}
        </m.div>
      </AnimatePresence>

      {mode === 'rail' && (
        <button
          type="button"
          className={styles.railHit}
          onClick={() => onExpand(section)}
          aria-label={`Espandi ${label}`}
        />
      )}
    </m.section>
  )
}

export function PantryColumns({ inventory, getPairs, expanded, onExpand, rowProps, onAdd, onOpenAdd, onGoApiKey }) {
  const soon = useMemo(() => Object.fromEntries(SECTIONS.map(s => {
    const only = { credenza: [], frigo: [], freezer: [], [s]: inventory[s] }
    return [s, getPantryCandidates(only).length]
  })), [inventory])

  const composerProps = { onAdd, onOpenAdd, onGoApiKey }

  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={SPRING}>
        <div className={styles.columns} data-focus={expanded ? '' : undefined}>
          {SECTIONS.map(s => (
            <SectionCard
              key={s}
              section={s}
              mode={!expanded ? 'column' : expanded === s ? 'focus' : 'rail'}
              pairs={getPairs(s)}
              soonCount={soon[s]}
              onExpand={onExpand}
              onCollapse={() => onExpand(null)}
              rowProps={rowProps}
              composerProps={composerProps}
            />
          ))}
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}
