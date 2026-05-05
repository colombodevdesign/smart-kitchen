import { useState, useRef, useEffect } from 'react'
import { formatDate, formatExpiry, expiryStatus } from '../utils/date.js'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import styles from './ItemRow.module.css'

export function ItemRow({ item, section, showSection, onToggleUrgent, onUpdate, onRemove, onMove }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const [moving, setMoving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      if (editingField !== 'expiresAt') inputRef.current.select()
    }
  }, [editingField])

  function startEdit(field) {
    setMoving(false)
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

  function cancel() {
    setEditingField(null)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') cancel()
  }

  const expiry = formatExpiry(item.expiresAt)
  const status = expiryStatus(item.expiresAt)
  const expiryClass = status === 'expired' ? styles.expiryExpired : status === 'soon' ? styles.expirySoon : styles.expiry

  return (
    <div className={`${styles.row} ${editingField ? styles.editing : ''} ${item.urgent ? styles.urgent : ''}`}>
      <button
        className={`${styles.dot} ${item.urgent ? styles.dotOn : styles.dotOff}`}
        onClick={() => onToggleUrgent(section, item.id)}
        title="Segna come da usare presto"
        aria-label={item.urgent ? 'Rimuovi urgenza' : 'Segna urgente'}
      />

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
            <span
              className={styles.name}
              onClick={() => startEdit('name')}
              title="Clicca per rinominare"
            >
              {item.name}
              {item.urgent && <span className={styles.badgeUrgent}>da usare</span>}
            </span>
          )}
          {showSection && (
            <span className={styles.sectionBadge}>{SECTION_LABELS[section]}</span>
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
            <span
              className={expiryClass}
              onClick={() => startEdit('expiresAt')}
              title="Clicca per modificare scadenza"
            >
              · {expiry}
            </span>
          ) : (
            <span
              className={styles.expiryAdd}
              onClick={() => startEdit('expiresAt')}
              title="Aggiungi data di scadenza"
            >
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
        <span className={styles.qty} onClick={() => startEdit('qty')} title="Clicca per modificare">
          {item.qty}
        </span>
      ) : (
        <span className={styles.qtyEmpty} onClick={() => startEdit('qty')} title="Aggiungi quantità">
          + qty
        </span>
      )}

      {editingField && (
        <button className={`${styles.iconBtn} ${styles.confirm}`} onClick={confirm} title="Salva">✓</button>
      )}

      {moving ? (
        <div className={styles.moveOptions}>
          {SECTIONS.filter(s => s !== section).map(s => (
            <button
              key={s}
              className={styles.moveOption}
              onClick={() => { onMove(section, item.id, s); setMoving(false) }}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
          <button className={styles.iconBtn} onClick={() => setMoving(false)} title="Annulla">✕</button>
        </div>
      ) : (
        <>
          <button
            className={`${styles.iconBtn} ${styles.moveBtn}`}
            onClick={() => { setEditingField(null); setMoving(true) }}
            title="Sposta in altra sezione"
            aria-label="Sposta elemento"
          >
            <MoveIcon />
          </button>
          <button className={styles.iconBtn} onClick={() => onRemove(section, item.id)} title="Rimuovi" aria-label="Rimuovi elemento">✕</button>
        </>
      )}
    </div>
  )
}

function MoveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h8M7 3l3 3-3 3"/>
    </svg>
  )
}
