import { useEffect, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Icon } from './ui/Icon.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import { hasApiKey } from '../utils/apiKey.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import styles from './AddSheet.module.css'

// "Cosa aggiungi?": receipt / voice import, or type one product.
export function AddSheet({ open, section, onClose, onSwitch, onSubmit, onGoApiKey }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [expiry, setExpiry] = useState('')
  const [target, setTarget] = useState(section)
  // On touch screens focusing the name field would raise the keyboard over the sheet the moment it opens.
  const touch = useMediaQuery('(pointer: coarse)')

  useEffect(() => {
    if (open) { setName(''); setQty(''); setExpiry(''); setTarget(section) }
  }, [open, section])

  const keyOk = hasApiKey()
  const canSubmit = name.trim().length > 0

  function submit() {
    if (!canSubmit) return
    onSubmit({ section: target, name, qty, expiry: expiry || null })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cosa aggiungi?"
      autoFocus={!touch}
      footer={
        <button type="button" className={styles.submit} onClick={submit} disabled={!canSubmit}>
          Aggiungi in dispensa
        </button>
      }
    >
      <div className={styles.body}>
        <div className={styles.tiles}>
          <button type="button" className={`${styles.tile} ${styles.tileReceipt}`} onClick={() => onSwitch('receipt')} disabled={!keyOk}>
            <Icon name="receipt" size={28} />
            <span className={styles.tileText}>
              <strong>Scontrino</strong>
              <span>Foto o PDF: l'AI legge i prodotti</span>
            </span>
          </button>
          <button type="button" className={`${styles.tile} ${styles.tileVoice}`} onClick={() => onSwitch('voice')} disabled={!keyOk}>
            <Icon name="mic" size={28} />
            <span className={styles.tileText}>
              <strong>Voce</strong>
              <span>Detta quello che hai comprato</span>
            </span>
          </button>
        </div>

        {!keyOk && (
          <p className={styles.hint}>
            Scontrino e voce richiedono la chiave Gemini.{' '}
            <button type="button" className={styles.link} onClick={onGoApiKey}>Impostala in Tu</button>
          </p>
        )}

        <div className={styles.divider}><span>oppure scrivi un prodotto</span></div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Nome</span>
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
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
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="700 g"
              autoComplete="off"
            />
          </label>
        </div>

        <Segmented
          options={SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s] }))}
          value={target}
          onChange={setTarget}
          ariaLabel="Dove lo metti"
        />

        <label className={styles.field}>
          <span>Scadenza (facoltativa)</span>
          <input
            type="date"
            className={styles.input}
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  )
}
