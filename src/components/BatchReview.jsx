import { SECTIONS, SECTION_LABELS, SECTION_ICONS } from '../data/initialInventory.js'
import styles from './BatchReview.module.css'

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
        <li key={c.id} className={`${styles.row} ${c.checked ? styles.rowOn : ''}`}>
          <input
            type="checkbox"
            className={styles.check}
            checked={c.checked}
            onChange={() => onToggle(c.id)}
            aria-label={`Includi ${c.name}`}
          />
          <div className={styles.fields}>
            {c.hint && (
              <p className={styles.hint} title={c.hint}>{c.hint}</p>
            )}
            <input
              className={styles.nameInput}
              value={c.name}
              onChange={e => onUpdate(c.id, { name: e.target.value })}
              placeholder="Nome"
            />
            <input
              className={styles.qtyInput}
              value={c.qty}
              onChange={e => onUpdate(c.id, { qty: e.target.value })}
              placeholder="Quantità"
            />
            <div className={styles.segmented} role="radiogroup" aria-label="Sezione">
              {SECTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={c.section === s}
                  className={`${styles.segBtn} ${c.section === s ? styles.segOn : ''}`}
                  data-s={s}
                  onClick={() => onUpdate(c.id, { section: s })}
                  title={SECTION_LABELS[s]}
                >
                  <span aria-hidden="true">{SECTION_ICONS[s]}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemove(c.id)}
            aria-label={`Rimuovi ${c.name}`}
          >×</button>
        </li>
      ))}
    </ul>
  )
}
