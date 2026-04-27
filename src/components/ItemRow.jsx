import { useState, useRef, useEffect } from 'react'
import { formatDate, formatExpiry, expiryStatus } from '../utils/date.js'
import styles from './ItemRow.module.css'

export function ItemRow({ item, section, onToggleUrgent, onUpdate, onRemove }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      if (editingField !== 'expiresAt') inputRef.current.select()
    }
  }, [editingField])

  function startEdit(field) {
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
        <div className={styles.meta}>
          <span className={styles.date}>{formatDate(item.added)}</span>
          {editingField === 'expiresAt' ? (
            <input
              ref={inputRef}
              type="date"
              className={styles.expiryInput}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => setTimeout(confirm, 120)}
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
          onBlur={() => setTimeout(cancel, 120)}
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

      <button className={styles.iconBtn} onClick={() => onRemove(section, item.id)} title="Rimuovi">✕</button>
    </div>
  )
}
