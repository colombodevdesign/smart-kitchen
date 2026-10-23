import { useEffect, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Icon } from './ui/Icon.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import { todayStr } from '../utils/date.js'
import styles from './ItemEditSheet.module.css'

// Expiry shortcuts: most dates are "tomorrow" or "next week", so the date
// picker is rarely needed. [label, days from today] (null = no expiry).
const QUICK_EXPIRY = [
  ['Nessuna', null],
  ['Domani', 1],
  ['+3 giorni', 3],
  ['+1 sett.', 7],
]

function inDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

const toIso = ts => (ts ? todayStr(new Date(ts)) : '')
const toTs = iso => (iso ? new Date(iso + 'T23:59:59').getTime() : null)

// Bottom sheet to edit a pantry product: name, quantity, expiry, "aperto" flag,
// section. Opened by tapping a row on mobile/tablet.
export function ItemEditSheet({ open, item, section, onClose, onSave, onRemove }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [expiry, setExpiry] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [target, setTarget] = useState(section)

  const itemId = item?.id
  useEffect(() => {
    if (!open || !item) return
    setName(item.name)
    setQty(item.qty ?? '')
    setExpiry(toIso(item.expiresAt))
    setUrgent(!!item.urgent)
    setTarget(section)
    // Reset only when a different product is opened, not on every live update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId, section])

  const canSave = name.trim().length > 0

  function save(e) {
    e?.preventDefault()
    if (!canSave) return
    onSave({ name: name.trim(), qty: qty.trim(), expiresAt: toTs(expiry), urgent, section: target })
  }

  return (
    <Modal
      open={open && !!item}
      onClose={onClose}
      title="Modifica prodotto"
      autoFocus={false}
      footer={
        <>
          <button type="button" className={styles.remove} onClick={onRemove}>
            <Icon name="trash" size={20} /> Elimina
          </button>
          <button type="button" className={styles.save} onClick={save} disabled={!canSave}>Salva</button>
        </>
      }
    >
      <form className={styles.body} onSubmit={save}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Nome</span>
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldQty}`}>
            <span>Quantità</span>
            <input
              className={styles.input}
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="es. 300 g"
              autoComplete="off"
            />
          </label>
        </div>

        <div className={styles.group}>
          <label className={styles.field}>
            <span>Scadenza</span>
            <input
              type="date"
              className={styles.input}
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
            />
          </label>
          <div className={styles.chips}>
            {QUICK_EXPIRY.map(([label, days]) => {
              const iso = days == null ? '' : inDays(days)
              const on = expiry === iso
              return (
                <button
                  key={label}
                  type="button"
                  className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                  aria-pressed={on}
                  onClick={() => setExpiry(iso)}
                >{label}</button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={urgent}
          className={styles.switchRow}
          onClick={() => setUrgent(v => !v)}
        >
          <span className={styles.switchText}>
            <strong>Aperto</strong>
            <span>Da consumare presto, anche senza scadenza</span>
          </span>
          <span className={`${styles.track} ${urgent ? styles.trackOn : ''}`} aria-hidden="true">
            <span className={styles.knob} />
          </span>
        </button>

        <div className={styles.field}>
          <span>Sposta in</span>
          <Segmented
            options={SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))}
            value={target}
            onChange={setTarget}
            ariaLabel="Sposta in"
          />
        </div>
      </form>
    </Modal>
  )
}
