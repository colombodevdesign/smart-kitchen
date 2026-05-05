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

export function ItemRow({ item, section, showSection, searchQuery, onToggleUrgent, onUpdate, onRemove, onMove }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

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

  const expiry = formatExpiry(item.expiresAt)
  const status = expiryStatus(item.expiresAt)
  const expiryClass = status === 'expired' ? styles.expiryExpired : status === 'soon' ? styles.expirySoon : styles.expiry

  return (
    <div className={`${styles.card} ${item.urgent ? styles.urgent : ''} ${editingField ? styles.editing : ''} ${expanded ? styles.cardExpanded : ''}`}>
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
                {item.urgent && <span className={styles.badgeUrgent}>da usare</span>}
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
            className={`${styles.urgencyBtn} ${item.urgent ? styles.urgencyBtnOn : ''}`}
            onClick={() => onToggleUrgent(section, item.id)}
            aria-label={item.urgent ? 'Rimuovi urgenza' : 'Segna urgente'}
            title={item.urgent ? 'Rimuovi urgenza' : 'Segna urgente'}
          >
            ‼️
          </button>
          <button className={styles.deleteBtn} onClick={() => onRemove(section, item.id)}>
            Elimina
          </button>
        </div>
      )}
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
