import { useState, useRef, useEffect } from 'react'
import { formatDate, formatExpiry, expiryStatus } from '../utils/date.js'
import { SECTIONS, SECTION_LABELS, SECTION_ICONS } from '../data/initialInventory.js'
import styles from './ItemRow.module.css'

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

const SWIPE_THRESHOLD = 80

export function ItemRow({ item, section, showSection, searchQuery, onToggleUrgent, onUpdate, onRemove, onMove }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  // Swipe gesture refs
  const cardRef    = useRef(null)
  const bgDeleteRef = useRef(null)
  const bgOpenRef  = useRef(null)
  const drag = useRef({ startX: 0, startY: 0, active: false, dir: null, hitThreshold: false })

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
    const t = e.touches[0]
    drag.current = { startX: t.clientX, startY: t.clientY, active: false, dir: null, hitThreshold: false }
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
      d.dir = dx > 0 ? 'right' : 'left'
    }
    if (!d.active) return

    // Clamp translation with slight resistance past threshold
    const offset = d.dir === 'right'
      ? Math.min(dx, SWIPE_THRESHOLD * 1.4)
      : Math.max(dx, -SWIPE_THRESHOLD * 1.4)

    const card = cardRef.current
    if (card) {
      card.style.transform = `translateX(${offset}px)`
      card.style.transition = 'none'
    }

    const progress = Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1)

    if (d.dir === 'right' && bgDeleteRef.current) {
      bgDeleteRef.current.style.opacity = String(progress)
      const icon = bgDeleteRef.current.querySelector('[data-swipe-icon]')
      if (icon) icon.style.transform = `scale(${0.7 + 0.4 * progress})`
    }
    if (d.dir === 'left' && bgOpenRef.current) {
      bgOpenRef.current.style.opacity = String(progress)
      const icon = bgOpenRef.current.querySelector('[data-swipe-icon]')
      if (icon) icon.style.transform = `scale(${0.7 + 0.4 * progress})`
    }

    if (Math.abs(offset) >= SWIPE_THRESHOLD && !d.hitThreshold) {
      d.hitThreshold = true
      navigator.vibrate?.(40)
    } else if (Math.abs(offset) < SWIPE_THRESHOLD && d.hitThreshold) {
      d.hitThreshold = false
    }
  }

  function onTouchEnd() {
    const d = drag.current
    if (!d.active) return

    const card = cardRef.current
    const bgDel = bgDeleteRef.current
    const bgOpn = bgOpenRef.current

    function resetBg() {
      if (bgDel) { bgDel.style.opacity = '0' }
      if (bgOpn) { bgOpn.style.opacity = '0' }
    }

    if (d.hitThreshold) {
      if (card) {
        card.style.transition = 'transform 0.18s ease-in'
        card.style.transform = `translateX(${d.dir === 'right' ? '110%' : '-110%'})`
      }
      const dir = d.dir
      setTimeout(() => {
        if (dir === 'right') {
          onRemove(section, item.id)
        } else {
          onToggleUrgent(section, item.id)
        }
        if (card) { card.style.transition = 'none'; card.style.transform = '' }
        resetBg()
      }, 180)
    } else {
      if (card) {
        card.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)'
        card.style.transform = ''
      }
      resetBg()
    }

    d.active = false
  }

  function onTouchCancel() {
    const d = drag.current
    if (!d.active) return
    const card = cardRef.current
    if (card) {
      card.style.transition = 'transform 0.25s ease'
      card.style.transform = ''
    }
    if (bgDeleteRef.current) bgDeleteRef.current.style.opacity = '0'
    if (bgOpenRef.current) bgOpenRef.current.style.opacity = '0'
    d.active = false
  }

  // ────────────────────────────────────────────────────────────────

  const expiry = formatExpiry(item.expiresAt)
  const status = expiryStatus(item.expiresAt)
  const expiryClass = status === 'expired' ? styles.expiryExpired : status === 'soon' ? styles.expirySoon : styles.expiry

  return (
    <div className={styles.swipeWrapper}>
      {/* Background revealed on swipe-right → delete */}
      <div ref={bgDeleteRef} className={styles.bgDelete} aria-hidden="true">
        <span data-swipe-icon="" className={styles.bgIcon}>🗑️</span>
        <span className={styles.bgLabel}>Elimina</span>
      </div>
      {/* Background revealed on swipe-left → toggle opened */}
      <div ref={bgOpenRef} className={styles.bgOpen} aria-hidden="true">
        <span className={styles.bgLabel}>{item.urgent ? 'Rimuovi' : 'Aperto'}</span>
        <span data-swipe-icon="" className={styles.bgIcon}>📂</span>
      </div>

      <div
        ref={cardRef}
        className={`${styles.card} ${item.urgent ? styles.opened : ''} ${editingField ? styles.editing : ''} ${expanded ? styles.cardExpanded : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
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
                  {SECTION_ICONS[section]} {SECTION_LABELS[section]}
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
                  {SECTION_ICONS[s]} {SECTION_LABELS[s]}
                </button>
              ))}
            </div>
            <button
              className={`${styles.openedBtn} ${item.urgent ? styles.openedBtnOn : ''}`}
              onClick={() => onToggleUrgent(section, item.id)}
              aria-label={item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'}
              title={item.urgent ? 'Rimuovi flag aperto' : 'Segna come aperto'}
            >
              📂
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

function MoreIcon() {
  return (
    <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
      <circle cx="2" cy="2" r="1.5"/>
      <circle cx="8" cy="2" r="1.5"/>
      <circle cx="14" cy="2" r="1.5"/>
    </svg>
  )
}
