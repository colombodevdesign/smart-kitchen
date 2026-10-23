import { useState, useRef, useEffect } from 'react'
import { itemBadge } from '../utils/pantry.js'
import { SECTION_LABELS } from '../data/initialInventory.js'
import styles from './ItemRow.module.css'
import { Icon, SectionIcon } from './ui/Icon.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'

function highlight(text, query) {
  if (!query) return text
  const lower = text.toLowerCase()
  const lowerQ = query.toLowerCase()
  const parts = []
  let last = 0
  let idx = lower.indexOf(lowerQ)
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx))
    parts.push(<mark key={idx}>{text.slice(idx, idx + query.length)}</mark>)
    last = idx + query.length
    idx = lower.indexOf(lowerQ, last)
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// Swipe left reveals two action buttons (Aperto / Elimina) behind the card.
const ACTIONS_WIDTH = 72 * 2
const SNAP_OPEN = ACTIONS_WIDTH / 2

// Only one row keeps its swipe actions open at a time.
let openRowCloser = null

function applyOffset(card, actions, px, animate) {
  if (!card) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  card.style.transition = animate && !reduce ? 'transform 0.22s ease-out' : 'none'
  card.style.transform = px ? `translateX(${px}px)` : ''
  if (!actions) return
  // The actions sit behind the card: keep them hidden at rest so they never
  // peek out of the rounded corners.
  if (px) actions.style.visibility = 'visible'
  else setTimeout(() => { if (!card.style.transform) actions.style.visibility = '' }, animate && !reduce ? 240 : 0)
}

// variant: 'card' (default: swipeable row), 'flat' (row inside a desktop section card)
// or 'table' (row of the expanded desktop section). In every variant the row is one
// target that opens the edit sheet; "+ quantità" / "+ scadenza" are only hints.
export function ItemRow({ item, section, showSection, searchQuery, variant = 'card', onEdit, onToggleUrgent, onRemove }) {
  const swipe = variant === 'card'
  const table = variant === 'table'

  // Swipe gesture state
  const [revealed, setRevealed] = useState(false)
  const cardRef = useRef(null)
  const actionsRef = useRef(null)
  const drag = useRef({ startX: 0, startY: 0, startOffset: 0, offset: 0, active: false, pastSnap: false })
  const closer = useRef(null)
  if (!closer.current) {
    closer.current = () => {
      applyOffset(cardRef.current, actionsRef.current, 0, true)
      setRevealed(false)
      if (openRowCloser === closer.current) openRowCloser = null
    }
  }

  useEffect(() => () => {
    if (openRowCloser === closer.current) openRowCloser = null
  }, [])

  // ── Swipe handlers ──────────────────────────────────────────────

  function onTouchStart(e) {
    if (openRowCloser && openRowCloser !== closer.current) openRowCloser()
    const t = e.touches[0]
    drag.current = {
      startX: t.clientX,
      startY: t.clientY,
      startOffset: revealed ? -ACTIONS_WIDTH : 0,
      offset: revealed ? -ACTIONS_WIDTH : 0,
      active: false,
      pastSnap: revealed,
    }
  }

  function onTouchMove(e) {
    const d = drag.current
    const t = e.touches[0]
    const dx = t.clientX - d.startX
    const dy = t.clientY - d.startY

    if (!d.active) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      // Abort if gesture is mostly vertical (let the page scroll naturally)
      if (Math.abs(dy) > Math.abs(dx) * 0.75) return
      d.active = true
    }

    // Clamp to [-ACTIONS_WIDTH, 0] with slight resistance past the actions
    let offset = Math.min(0, d.startOffset + dx)
    if (offset < -ACTIONS_WIDTH) offset = -ACTIONS_WIDTH + (offset + ACTIONS_WIDTH) * 0.3
    d.offset = offset
    applyOffset(cardRef.current, actionsRef.current, offset, false)

    const past = offset <= -SNAP_OPEN
    if (past !== d.pastSnap) {
      d.pastSnap = past
      if (past) navigator.vibrate?.(20)
    }
  }

  function onTouchEnd() {
    const d = drag.current
    if (!d.active) return
    d.active = false

    const open = d.offset <= -SNAP_OPEN
    applyOffset(cardRef.current, actionsRef.current, open ? -ACTIONS_WIDTH : 0, true)
    setRevealed(open)
    if (open) openRowCloser = closer.current
    else if (openRowCloser === closer.current) openRowCloser = null
  }

  function onTouchCancel() {
    if (!drag.current.active) return
    drag.current.active = false
    applyOffset(cardRef.current, actionsRef.current, revealed ? -ACTIONS_WIDTH : 0, true)
  }

  // A tap on the card while the actions are open just closes them.
  function onCardClickCapture(e) {
    if (!revealed) return
    e.stopPropagation()
    e.preventDefault()
    closer.current()
  }

  // ────────────────────────────────────────────────────────────────

  const badge = itemBadge(item)
  const urgentBadge = item.urgent && badge?.tone !== 'open'
  const flagLabel = item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'
  const name = <span className={styles.nameText}>{searchQuery ? highlight(item.name, searchQuery) : item.name}</span>
  const qty = item.qty
    ? <span className={styles.qtyText}>{item.qty}</span>
    : <span className={`${styles.qtyEmpty} ${styles.hintChip}`}>+ quantità</span>
  const expiry = badge
    ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
    : <span className={`${styles.expiryAdd} ${styles.hintChip}`}>+ scadenza</span>

  return (
    <div className={`${styles.swipeWrapper} ${swipe ? '' : styles.plainWrapper}`}>
      {/* Actions revealed by swiping the card to the left */}
      {swipe && (
        <div ref={actionsRef} className={styles.swipeActions} aria-hidden={!revealed}>
          <button
            type="button"
            className={`${styles.swipeBtn} ${styles.swipeOpen}`}
            tabIndex={revealed ? 0 : -1}
            onClick={() => { onToggleUrgent(section, item.id); closer.current() }}
            aria-label={flagLabel}
          >
            <Icon name="flag" size={22} />
            <span>{item.urgent ? 'Rimuovi' : 'Aperto'}</span>
          </button>
          <button
            type="button"
            className={`${styles.swipeBtn} ${styles.swipeDelete}`}
            tabIndex={revealed ? 0 : -1}
            onClick={() => onRemove(section, item.id)}
            aria-label="Elimina prodotto"
          >
            <Icon name="trash" size={22} />
            <span>Elimina</span>
          </button>
        </div>
      )}

      <div
        ref={cardRef}
        className={`${styles.card} ${swipe ? '' : styles.cardFlat}`}
        onTouchStart={swipe ? onTouchStart : undefined}
        onTouchMove={swipe ? onTouchMove : undefined}
        onTouchEnd={swipe ? onTouchEnd : undefined}
        onTouchCancel={swipe ? onTouchCancel : undefined}
        onClickCapture={swipe ? onCardClickCapture : undefined}
      >
        <button
          type="button"
          className={`${styles.rowBtn} ${table ? styles.tableRow : ''}`}
          onClick={() => onEdit?.(section, item.id)}
          aria-label={`Modifica ${item.name}`}
        >
          {table ? (
            <>
              <span className={styles.tableName}>
                {name}
                {urgentBadge && <StatusBadge tone="open">Aperto</StatusBadge>}
              </span>
              <span className={styles.tableCell}>{qty}</span>
              <span className={styles.tableCell}>{expiry}</span>
            </>
          ) : (
            <>
              <span className={styles.main}>
                <span className={styles.nameRow}>
                  {name}
                  {urgentBadge && <StatusBadge tone="open">Aperto</StatusBadge>}
                  {showSection && (
                    <span className={styles.sectionBadge}>
                      <SectionIcon section={section} size={12} /> {SECTION_LABELS[section]}
                    </span>
                  )}
                </span>
                {qty}
              </span>
              {expiry}
              {swipe && <Icon name="chevR" size={20} className={styles.chev} />}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
