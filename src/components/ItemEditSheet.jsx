import { useEffect, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Icon } from './ui/Icon.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import { FOOD_CATEGORIES } from '../data/foodCategories.js'
import { analysisKey } from '../ai/analyzePantry.js'
import { estimatedExpiry } from '../utils/pantry.js'
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
const fmtDate = ts => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

// "Analisi AI": the metadata the AI worked out for the product, closed by default.
function AiInfo({ item, section }) {
  if (!item.ai) return <p className={styles.aiNote}>Non ancora analizzato</p>
  const estimate = estimatedExpiry(item, section)
  const rows = [
    ['Alimento', item.ai.food ? 'Sì' : 'No'],
    ['Nome generico', item.ai.name || '—'],
    ['Dopo l’apertura', item.ai.openDays ? `${item.ai.openDays} giorni` : '—'],
    ['Dall’acquisto', item.ai.freshDays ? `${item.ai.freshDays} giorni` : '—'],
    ['Scadenza stimata', item.expiresAt ? 'c’è una scadenza stampata' : estimate ? fmtDate(estimate) : '—'],
  ]
  return (
    <>
      <table className={styles.aiTable}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>
          ))}
        </tbody>
      </table>
      {item.ai.key !== analysisKey(item, section) && (
        <p className={styles.aiNote}>In attesa di una nuova analisi</p>
      )}
    </>
  )
}

// Bottom sheet to edit a pantry product: name, quantity, expiry, "aperto" flag,
// section. Opened by tapping a row on mobile/tablet.
// withCategory: show the AI category picker (a manual choice survives re-analysis).
// Without a printed date the expiry field starts from the AI estimate; saving it unchanged keeps it.
export function ItemEditSheet({ open, item, section, withCategory = false, onClose, onSave, onRemove }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [expiry, setExpiry] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [target, setTarget] = useState(section)
  const [category, setCategory] = useState('')

  const itemId = item?.id
  useEffect(() => {
    if (!open || !item) return
    setName(item.name)
    setQty(item.qty ?? '')
    setExpiry(toIso(item.expiresAt ?? estimatedExpiry(item, section)))
    setUrgent(!!item.urgent)
    setTarget(section)
    setCategory(item.ai?.category ?? '')
    // Reset only when a different product is opened, not on every live update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId, section])

  const estimateIso = item ? toIso(estimatedExpiry(item, section)) : ''
  const showEstimate = !!estimateIso && expiry === estimateIso

  const canSave = name.trim().length > 0

  function save(e) {
    e?.preventDefault()
    if (!canSave) return
    onSave({ name: name.trim(), qty: qty.trim(), expiresAt: toTs(expiry), urgent, section: target, category })
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
          {showEstimate && <span className={styles.hint}>Stima dell’AI: resta se non cambi la data</span>}
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

        {withCategory && (
          <label className={styles.field}>
            <span>Categoria</span>
            {/* Set by the AI; a choice made here is kept when the product is analysed again. */}
            <select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{item?.ai?.category ? 'Rianalizza con l\u2019AI' : 'Da analizzare'}</option>
              {FOOD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        )}

        {item && (
          <details className={styles.details}>
            <summary className={styles.summary}>Analisi AI</summary>
            <AiInfo item={item} section={section} />
          </details>
        )}

        {item && (
          <p className={styles.dates}>
            {item.added && <span>Aggiunto il {fmtDate(item.added)}</span>}
            {item.updatedAt && <span>Modificato il {fmtDate(item.updatedAt)}</span>}
          </p>
        )}
      </form>
    </Modal>
  )
}
