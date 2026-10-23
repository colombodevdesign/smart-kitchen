import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import styles from './BatchReview.module.css'
import { Icon } from './ui/Icon.jsx'

// Shared by VoiceBatchModal and ReceiptScanModal so the two review screens
// (and their footer buttons) stay visually identical.
export { styles as batchStyles }

/**
 * Review/edit step of a batch import: one editable row per candidate with
 * name, quantity and the credenza/frigo/freezer segmented control.
 */
export function BatchReviewList({ candidates, emptyMessage, onToggle, onUpdate, onRemove }) {
  if (candidates.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <ul className={styles.list}>
      {candidates.map(c => (
        <li key={c.id} className={`${styles.row} ${c.checked ? '' : styles.rowOff}`}>
          <div className={styles.top}>
            <label className={styles.include}>
              <input
                type="checkbox"
                className={styles.check}
                checked={c.checked}
                onChange={() => onToggle(c.id)}
              />
              <span className={styles.hint} title={c.hint || undefined}>{c.hint || 'Includi'}</span>
            </label>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => onRemove(c.id)}
              aria-label={`Rimuovi ${c.name}`}
            ><Icon name="close" size={18} strokeWidth={2.2} /></button>
          </div>
          <div className={styles.fields}>
            <input
              className={styles.nameInput}
              value={c.name}
              onChange={e => onUpdate(c.id, { name: e.target.value })}
              placeholder="Nome"
              aria-label="Nome prodotto"
            />
            <input
              className={styles.qtyInput}
              value={c.qty}
              onChange={e => onUpdate(c.id, { qty: e.target.value })}
              placeholder="Quantità"
              aria-label="Quantità"
            />
          </div>
          <div className={styles.segmented} role="radiogroup" aria-label="Sezione">
            {SECTIONS.map(sec => (
              <button
                key={sec}
                type="button"
                role="radio"
                aria-checked={c.section === sec}
                className={`${styles.segBtn} ${c.section === sec ? styles.segOn : ''}`}
                data-s={sec}
                onClick={() => onUpdate(c.id, { section: sec })}
              >
                {SECTION_LABELS[sec]}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
