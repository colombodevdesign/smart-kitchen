import { useState, useRef, useEffect } from 'react'
import { formatDate, formatExpiry, expiryStatus } from '../utils/date.js'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import styles from './ItemRow.module.css'
import { Icon, SectionIcon } from './ui/Icon.jsx'

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

function applyOffset(card, px, animate) {
  if (!card) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  card.style.transition = animate && !reduce ? 'transform 0.22s ease-out' : 'none'
  card.style.transform = px ? `translateX(${px}px)` : ''
}

export function ItemRow({ item, section, showSection, searchQuery, onToggleUrgent, onUpdate, onRemove, onMove }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  // Swipe gesture state
  const [revealed, setRevealed] = useState(false)
  const cardRef = useRef(null)
  const drag = useRef({ startX: 0, startY: 0, startOffset: 0, offset: 0, active: false, pastSnap: false })
  const closer = useRef(null)
  if (!closer.current) {
    closer.current = () => {
      applyOffset(cardRef.current, 0, true)
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
    applyOffset(cardRef.current, offset, false)

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
    applyOffset(cardRef.current, open ? -ACTIONS_WIDTH : 0, true)
    setRevealed(open)
    if (open) openRowCloser = closer.current
    else if (openRowCloser === closer.current) openRowCloser = null
  }

  function onTouchCancel() {
    if (!drag.current.active) return
    drag.current.active = false
    applyOffset(cardRef.current, revealed ? -ACTIONS_WIDTH : 0, true)
  }

  // A tap on the card while the actions are open just closes them.
  function onCardClickCapture(e) {
    if (!revealed) return
    e.stopPropagation()
    e.preventDefault()
    closer.current()
  }

  // ────────────────────────────────────────────────────────────────

  const expiry = formatExpiry(item.expiresAt)
  const status = expiryStatus(item.expiresAt)
  const expiryClass = status === 'expired' ? styles.expiryExpired : status === 'soon' ? styles.expirySoon : styles.expiry

  return (
    <div className={styles.swipeWrapper}>
      {/* Actions revealed by swiping the card to the left */}
      <div className={styles.swipeActions} aria-hidden={!revealed}>
        <button
          className={`${styles.swipeBtn} ${styles.swipeOpen}`}
          tabIndex={revealed ? 0 : -1}
          onClick={() => { onToggleUrgent(section, item.id); closer.current() }}
          aria-label={item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'}
        >
          <FlagIcon />
          <span>{item.urgent ? 'Rimuovi' : 'Aperto'}</span>
        </button>
        <button
          className={`${styles.swipeBtn} ${styles.swipeDelete}`}
          tabIndex={revealed ? 0 : -1}
          onClick={() => onRemove(section, item.id)}
          aria-label="Elimina prodotto"
        >
          <TrashIcon />
          <span>Elimina</span>
        </button>
      </div>

      <div
        ref={cardRef}
        className={`${styles.card} ${item.urgent ? styles.opened : ''} ${editingField ? styles.editing : ''} ${expanded ? styles.cardExpanded : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onClickCapture={onCardClickCapture}
      >
        <div className={styles.row}>
          <div className={styles.main}>
            <div className={styles.nameRow}>
              {editingField === 'name' ? (
                <input
                  ref={inputRef}
                  className={styles.nameInput}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  onBlur={() => setTimeout(cancel, 120)}
                />
              ) : (
                <span className={styles.name} onClick={() => startEdit('name')}>
                  {searchQuery ? highlight(item.name, searchQuery) : item.name}
                  {item.urgent && <span className={styles.badgeOpened}>aperto</span>}
                </span>
              )}
              {showSection && (
                <span className={styles.sectionBadge} data-s={section}>
                  <SectionIcon section={section} /> {SECTION_LABELS[section]}
                </span>
              )}
            </div>
            <div className={styles.meta}>
              <span className={styles.date}>{formatDate(item.added)}</span>
              {editingField === 'expiresAt' ? (
                <input
                  ref={inputRef}
                  type="date"
                  className={styles.expiryInput}
                  value={draft}
                  onChange={e => {
                    const val = e.target.value
                    setDraft(val)
                    const ts = val ? new Date(val + 'T23:59:59').getTime() : null
                    onUpdate(section, item.id, { expiresAt: ts })
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') cancel() }}
                  onBlur={() => setTimeout(() => setEditingField(null), 120)}
                />
              ) : expiry ? (
                <span className={expiryClass} onClick={() => startEdit('expiresAt')}>
                  {expiry}
                </span>
              ) : (
                <span className={styles.expiryAdd} onClick={() => startEdit('expiresAt')}>
                  + scad.
                </span>
              )}
            </div>
          </div>

          {editingField === 'qty' ? (
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
            <span className={styles.qty} onClick={() => startEdit('qty')}>{item.qty}</span>
          ) : (
            <span className={styles.qtyEmpty} onClick={() => startEdit('qty')}>+ qty</span>
          )}

          {editingField ? (
            <button className={`${styles.iconBtn} ${styles.confirm}`} onClick={confirm} title="Salva">✓</button>
          ) : (
            <button
              className={`${styles.moreBtn} ${expanded ? styles.moreBtnActive : ''}`}
              onClick={() => setExpanded(v => !v)}
              aria-label={expanded ? 'Chiudi azioni' : 'Azioni'}
            >
              <MoreIcon />
            </button>
          )}
        </div>

        {expanded && (
          <div className={styles.actionStrip}>
            <div className={styles.moveGroup}>
              <span className={styles.stripLabel}>Sposta in</span>
              {SECTIONS.filter(s => s !== section).map(s => (
                <button
                  key={s}
                  className={styles.moveOption}
                  data-s={s}
                  onClick={() => { onMove(section, item.id, s); setExpanded(false) }}
                >
                  <SectionIcon section={s} /> {SECTION_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              className={`${styles.openedBtn} ${item.urgent ? styles.openedBtnOn : ''}`}
              onClick={() => onToggleUrgent(section, item.id)}
              aria-label={item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'}
              title={item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'}
            >
              <Icon name="flag" size={16} />
            </button>
            <button className={styles.deleteBtn} onClick={() => onRemove(section, item.id)}>
              Elimina
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FlagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
      <circle cx="2" cy="2" r="1.5"/>
      <circle cx="8" cy="2" r="1.5"/>
      <circle cx="14" cy="2" r="1.5"/>
    </svg>
  )
}
