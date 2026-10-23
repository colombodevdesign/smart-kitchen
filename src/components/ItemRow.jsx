import { useState, useRef, useEffect } from 'react'
import { itemBadge } from '../utils/pantry.js'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
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

// variant: 'card' (default: swipeable row, one big tap target that opens the edit sheet), 'flat' (row inside a desktop section card)
// or 'table' (row of the expanded desktop section, with the actions always visible).
export function ItemRow({ item, section, showSection, searchQuery, variant = 'card', onEdit, onToggleUrgent, onUpdate, onRemove, onMove }) {
  const swipe = variant === 'card'
  const table = variant === 'table'
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

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

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      if (editingField !== 'expiresAt') inputRef.current.select()
    }
  }, [editingField])

  function startEdit(field) {
    setExpanded(false)
    if (field === 'expiresAt') {
      setDraft(item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : '')
    } else {
      setDraft(item[field] || '')
    }
    setEditingField(field)
  }

  function confirm() {
    if (editingField === 'expiresAt') {
      const ts = draft ? new Date(draft + 'T23:59:59').getTime() : null
      onUpdate(section, item.id, { expiresAt: ts })
    } else if (editingField) {
      onUpdate(section, item.id, { [editingField]: draft.trim() })
    }
    setEditingField(null)
  }

  function cancel() { setEditingField(null) }

  function onKeyDown(e) {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') cancel()
  }

  // ── Swipe handlers ──────────────────────────────────────────────

  function onTouchStart(e) {
    if (editingField || expanded) return
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

  const nameNode = editingField === 'name' ? (
    <input
      ref={inputRef}
      className={styles.nameInput}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => setTimeout(cancel, 120)}
    />
  ) : (
    <button type="button" className={styles.name} onClick={() => startEdit('name')}>
      {searchQuery ? highlight(item.name, searchQuery) : item.name}
    </button>
  )

  const qtyNode = editingField === 'qty' ? (
    <input
      ref={inputRef}
      className={styles.qtyInput}
      value={draft}
      placeholder="es. 300g"
      onChange={e => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => setTimeout(confirm, 120)}
    />
  ) : item.qty ? (
    <button type="button" className={styles.qty} onClick={() => startEdit('qty')}>{item.qty}</button>
  ) : (
    <button type="button" className={styles.qtyEmpty} onClick={() => startEdit('qty')}>+ quantità</button>
  )

  const expiryNode = editingField === 'expiresAt' ? (
    <input
      ref={inputRef}
      type="date"
      className={styles.expiryInput}
      value={draft}
      aria-label="Data di scadenza"
      onChange={e => {
        const val = e.target.value
        setDraft(val)
        const ts = val ? new Date(val + 'T23:59:59').getTime() : null
        onUpdate(section, item.id, { expiresAt: ts })
      }}
      onKeyDown={e => { if (e.key === 'Escape') cancel() }}
      onBlur={() => setTimeout(() => setEditingField(null), 120)}
    />
  ) : badge ? (
    <button
      type="button"
      className={styles.badgeBtn}
      onClick={() => startEdit('expiresAt')}
      aria-label={`${badge.label}: modifica scadenza`}
    >
      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
    </button>
  ) : (
    <button type="button" className={styles.expiryAdd} onClick={() => startEdit('expiresAt')}>+ scadenza</button>
  )

  const confirmBtn = (
    <button type="button" className={`${styles.iconBtn} ${styles.confirm}`} onClick={confirm} aria-label="Salva">
      <Icon name="check" size={18} strokeWidth={2.2} />
    </button>
  )

  const flagLabel = item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'

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
        className={`${styles.card} ${swipe ? '' : styles.cardFlat} ${editingField ? styles.editing : ''} ${expanded ? styles.cardExpanded : ''}`}
        onTouchStart={swipe ? onTouchStart : undefined}
        onTouchMove={swipe ? onTouchMove : undefined}
        onTouchEnd={swipe ? onTouchEnd : undefined}
        onTouchCancel={swipe ? onTouchCancel : undefined}
        onClickCapture={swipe ? onCardClickCapture : undefined}
      >
        {swipe ? (
          <button
            type="button"
            className={styles.rowBtn}
            onClick={() => onEdit?.(section, item.id)}
            aria-label={`Modifica ${item.name}`}
          >
            <span className={styles.main}>
              <span className={styles.nameRow}>
                <span className={styles.nameText}>{searchQuery ? highlight(item.name, searchQuery) : item.name}</span>
                {urgentBadge && <StatusBadge tone="open">Aperto</StatusBadge>}
                {showSection && (
                  <span className={styles.sectionBadge}>
                    <SectionIcon section={section} size={12} /> {SECTION_LABELS[section]}
                  </span>
                )}
              </span>
              {item.qty
                ? <span className={styles.qtyText}>{item.qty}</span>
                : <span className={`${styles.qtyEmpty} ${styles.hintChip}`}>+ quantità</span>}
            </span>
            {badge
              ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
              : <span className={`${styles.expiryAdd} ${styles.hintChip}`}>+ scadenza</span>}
            <Icon name="chevR" size={20} className={styles.chev} />
          </button>
        ) : table ? (
          <div className={styles.tableRow}>
            <div className={styles.tableName}>
              {nameNode}
              {urgentBadge && <StatusBadge tone="open">Aperto</StatusBadge>}
            </div>
            <div className={styles.tableCell}>{qtyNode}</div>
            <div className={styles.tableCell}>{expiryNode}</div>
            <div className={styles.tableActions}>
              {editingField ? confirmBtn : (
                <>
                  <button
                    type="button"
                    className={`${styles.tableBtn} ${item.urgent ? styles.tableBtnOn : ''}`}
                    onClick={() => onToggleUrgent(section, item.id)}
                    aria-label={`${flagLabel}: ${item.name}`}
                    aria-pressed={!!item.urgent}
                    title={flagLabel}
                  >
                    <Icon name="flag" size={20} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.tableBtn} ${expanded ? styles.tableBtnOn : ''}`}
                    onClick={() => setExpanded(v => !v)}
                    aria-label={`Sposta in un'altra sezione: ${item.name}`}
                    aria-expanded={expanded}
                    title="Sposta in un'altra sezione"
                  >
                    <Icon name="swap" size={20} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.tableBtn} ${styles.tableDelete}`}
                    onClick={() => onRemove(section, item.id)}
                    aria-label={`Elimina: ${item.name}`}
                    title="Elimina"
                  >
                    <Icon name="trash" size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.row}>
            <div className={styles.main}>
              <div className={styles.nameRow}>
                {nameNode}
                {urgentBadge && <StatusBadge tone="open">Aperto</StatusBadge>}
                {showSection && (
                  <span className={styles.sectionBadge}>
                    <SectionIcon section={section} size={12} /> {SECTION_LABELS[section]}
                  </span>
                )}
              </div>
              <div className={styles.meta}>{qtyNode}</div>
            </div>

            {expiryNode}

            {editingField ? confirmBtn : (
              <button
                type="button"
                className={`${styles.moreBtn} ${expanded ? styles.moreBtnActive : ''}`}
                onClick={() => setExpanded(v => !v)}
                aria-label={expanded ? 'Chiudi azioni' : 'Azioni'}
                aria-expanded={expanded}
              >
                <Icon name="more" size={20} fill="currentColor" strokeWidth={0} />
              </button>
            )}
          </div>
        )}

        {expanded && !swipe && (
          <div className={styles.actionStrip}>
            <div className={styles.moveGroup}>
              <span className={styles.stripLabel}>Sposta in</span>
              {SECTIONS.filter(s => s !== section).map(s => (
                <button
                  key={s}
                  type="button"
                  className={styles.moveOption}
                  onClick={() => { onMove(section, item.id, s); setExpanded(false) }}
                >
                  <SectionIcon section={s} size={14} /> {SECTION_LABELS[s]}
                </button>
              ))}
            </div>
            {!table && (
              <>
                <button
                  type="button"
                  className={`${styles.openedBtn} ${item.urgent ? styles.openedBtnOn : ''}`}
                  onClick={() => onToggleUrgent(section, item.id)}
                  aria-label={flagLabel}
                  aria-pressed={!!item.urgent}
                  title={flagLabel}
                >
                  <Icon name="flag" size={18} />
                </button>
                <button type="button" className={styles.deleteBtn} onClick={() => onRemove(section, item.id)}>
                  Elimina
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
