import { useState, useRef, useEffect } from 'react'
import { formatDate } from '../utils/date.js'
import styles from './ItemRow.module.css'

export function ItemRow({ item, section, onToggleUrgent, onUpdate, onRemove }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingField])

  function startEdit(field) {
    setDraft(item[field] || '')
    setEditingField(field)
  }

  function confirm() {
    if (editingField) {
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
        <span className={styles.date}>{formatDate(item.added)}</span>
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
