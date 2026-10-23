import { useEffect, useRef, useState } from 'react'
import { Icon, SectionIcon } from './ui/Icon.jsx'
import { SECTION_LABELS } from '../data/initialInventory.js'
import { hasApiKey } from '../utils/apiKey.js'
import styles from './PantryComposer.module.css'

// Add form that lives inside the expanded section: the destination is the
// section itself, so there is no section picker. Enter adds and keeps the
// cursor in the name field to enter several products in a row.
export function PantryComposer({ section, onAdd, onOpenAdd, onGoApiKey }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [expiry, setExpiry] = useState('')
  const nameRef = useRef(null)
  const keyOk = hasApiKey()
  const canSubmit = name.trim().length > 0
  const label = SECTION_LABELS[section].toLowerCase()

  useEffect(() => { nameRef.current?.focus({ preventScroll: true }) }, [])

  function submit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onAdd(section, name, qty, expiry || null)
    setName('')
    setQty('')
    setExpiry('')
    nameRef.current?.focus({ preventScroll: true })
  }

  return (
    <form className={styles.composer} onSubmit={submit} aria-label={`Aggiungi in ${label}`}>
      <div className={styles.head}>
        <h3 className={styles.title}><SectionIcon section={section} size={18} /> Aggiungi in {label}</h3>
        <span className={styles.hint}>Invio per aggiungere e continuare</span>
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Nome</span>
          <input
            ref={nameRef}
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="es. Passata di pomodoro"
            autoComplete="off"
          />
        </label>
        <label className={`${styles.field} ${styles.fieldQty}`}>
          <span>Quantità</span>
          <input
            className={styles.input}
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="700 g"
            autoComplete="off"
          />
        </label>
        <label className={`${styles.field} ${styles.fieldDate}`}>
          <span>Scadenza (facoltativa)</span>
          <input
            type="date"
            className={styles.input}
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <span className={styles.or}>oppure</span>
        <button type="button" className={`${styles.import} ${styles.receipt}`} onClick={() => onOpenAdd('receipt', section)} disabled={!keyOk}>
          <Icon name="receipt" size={20} /> Scontrino
        </button>
        <button type="button" className={`${styles.import} ${styles.voice}`} onClick={() => onOpenAdd('voice', section)} disabled={!keyOk}>
          <Icon name="mic" size={20} /> Voce
        </button>
        <span className={styles.spacer} />
        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          <Icon name="plus" size={20} strokeWidth={2} /> Aggiungi
        </button>
      </div>

      {!keyOk && (
        <button type="button" className={styles.keyHint} onClick={onGoApiKey}>
          Scontrino e voce richiedono la chiave Gemini: impostala in Tu
        </button>
      )}
    </form>
  )
}
