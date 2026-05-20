import { useCallback, useEffect, useState } from 'react'
import { Modal } from './Modal.jsx'
import { SECTIONS, SECTION_LABELS, SECTION_ICONS } from '../data/initialInventory.js'
import { useVoiceBatch } from '../hooks/useVoiceBatch.js'
import styles from './VoiceBatchModal.module.css'

function formatTime(ms) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function VoiceBatchModal({ open, onClose, onConfirm }) {
  const { status, elapsedMs, error, items, start, stop, cancel, reset, maxDurationMs } = useVoiceBatch()
  const [candidates, setCandidates] = useState([]) // [{ id, name, qty, section, checked }]

  // Reset on close
  useEffect(() => {
    if (!open) {
      cancel()
      setCandidates([])
    }
  }, [open, cancel])

  // When processing completes successfully, hydrate the editable candidates list.
  useEffect(() => {
    if (status === 'ready') {
      setCandidates(items.map((it, i) => ({
        ...it,
        id: `v-${Date.now()}-${i}`,
        checked: true,
      })))
    }
  }, [status, items])

  const handleRetry = useCallback(() => {
    reset()
    setCandidates([])
  }, [reset])

  const updateField = (id, patch) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  const removeRow = (id) => {
    setCandidates(prev => prev.filter(c => c.id !== id))
  }
  const toggleRow = (id) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c))
  }

  const handleConfirm = () => {
    const picked = candidates
      .filter(c => c.checked && c.name.trim())
      .map(({ name, qty, section }) => ({ name, qty, section }))
    if (picked.length === 0) return
    onConfirm(picked)
    onClose()
  }

  const handleClose = () => {
    cancel()
    onClose()
  }

  const inReview = status === 'ready'
  const selectedCount = candidates.filter(c => c.checked && c.name.trim()).length
  const progress = Math.min(1, elapsedMs / maxDurationMs)
  const warnTime = elapsedMs >= maxDurationMs - 10_000

  const footer = inReview ? (
    <>
      <button type="button" className={styles.btnSecondary} onClick={handleRetry}>
        Registra di nuovo
      </button>
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={handleConfirm}
        disabled={selectedCount === 0}
      >
        {selectedCount > 0 ? `Aggiungi ${selectedCount}` : 'Nessun item'}
      </button>
    </>
  ) : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Aggiungi con la voce"
      footer={footer}
    >
      {!inReview && (
        <div className={styles.capture}>
          {status === 'idle' && (
            <>
              <button
                type="button"
                className={styles.micBig}
                onClick={start}
                aria-label="Inizia registrazione"
              >
                <MicIcon size={36} />
              </button>
              <p className={styles.helper}>Premi e dì cosa hai comprato.</p>
              <p className={styles.example}>
                Es: "due cartoni di latte, 500g di pasta, piselli surgelati"
              </p>
            </>
          )}

          {status === 'recording' && (
            <>
              <button
                type="button"
                className={`${styles.micBig} ${styles.micRecording}`}
                onClick={stop}
                aria-label="Ferma registrazione"
              >
                <StopIcon size={28} />
              </button>
              <p className={`${styles.timer} ${warnTime ? styles.timerWarn : ''}`}>
                {formatTime(elapsedMs)}
                <span className={styles.timerMax}> / {formatTime(maxDurationMs)}</span>
              </p>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${warnTime ? styles.progressWarn : ''}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className={styles.helper}>Tocca per fermare</p>
            </>
          )}

          {status === 'processing' && (
            <>
              <div className={styles.spinner} aria-hidden="true" />
              <p className={styles.helper}>Sto analizzando…</p>
            </>
          )}

          {status === 'error' && error && (
            <>
              <div className={styles.errorIcon} aria-hidden="true">!</div>
              <p className={styles.errorMsg}>{error.message}</p>
              <button type="button" className={styles.btnPrimary} onClick={handleRetry}>
                Riprova
              </button>
            </>
          )}
        </div>
      )}

      {inReview && (
        <div className={styles.review}>
          {candidates.length === 0 ? (
            <p className={styles.empty}>
              Non ho riconosciuto nessun prodotto. Riprova parlando in modo più chiaro.
            </p>
          ) : (
            <ul className={styles.list}>
              {candidates.map(c => (
                <li key={c.id} className={`${styles.row} ${c.checked ? styles.rowOn : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.check}
                    checked={c.checked}
                    onChange={() => toggleRow(c.id)}
                    aria-label={`Includi ${c.name}`}
                  />
                  <div className={styles.fields}>
                    <input
                      className={styles.nameInput}
                      value={c.name}
                      onChange={e => updateField(c.id, { name: e.target.value })}
                      placeholder="Nome"
                    />
                    <input
                      className={styles.qtyInput}
                      value={c.qty}
                      onChange={e => updateField(c.id, { qty: e.target.value })}
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
                          onClick={() => updateField(c.id, { section: s })}
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
                    onClick={() => removeRow(c.id)}
                    aria-label={`Rimuovi ${c.name}`}
                  >×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function MicIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function StopIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
