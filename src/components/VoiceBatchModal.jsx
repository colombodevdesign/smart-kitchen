import { useCallback, useEffect } from 'react'
import { Modal } from './Modal.jsx'
import { BatchReviewList, batchStyles } from './BatchReview.jsx'
import { useVoiceBatch } from '../hooks/useVoiceBatch.js'
import { useBatchCandidates } from '../hooks/useBatchCandidates.js'
import styles from './VoiceBatchModal.module.css'

function formatTime(ms) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function VoiceBatchModal({ open, onClose, onConfirm }) {
  const { status, elapsedMs, error, items, start, stop, cancel, reset, maxDurationMs } = useVoiceBatch()
  const { candidates, hydrate, clear, update, remove, toggle, selected, picked } =
    useBatchCandidates('v')

  // Reset on close
  useEffect(() => {
    if (!open) {
      cancel()
      clear()
    }
  }, [open, cancel, clear])

  // When processing completes successfully, hydrate the editable candidates list.
  useEffect(() => {
    if (status === 'ready') hydrate(items)
  }, [status, items, hydrate])

  const handleRetry = useCallback(() => {
    reset()
    clear()
  }, [reset, clear])

  const handleConfirm = () => {
    const chosen = picked()
    if (chosen.length === 0) return
    onConfirm(chosen)
    onClose()
  }

  const handleClose = () => {
    cancel()
    onClose()
  }

  const inReview = status === 'ready'
  const progress = Math.min(1, elapsedMs / maxDurationMs)
  const warnTime = elapsedMs >= maxDurationMs - 10_000

  const footer = inReview ? (
    <>
      <button type="button" className={batchStyles.btnSecondary} onClick={handleRetry}>
        Registra di nuovo
      </button>
      <button
        type="button"
        className={batchStyles.btnPrimary}
        onClick={handleConfirm}
        disabled={selected.length === 0}
      >
        {selected.length > 0 ? `Aggiungi ${selected.length}` : 'Nessun item'}
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
              <button type="button" className={batchStyles.btnPrimary} onClick={handleRetry}>
                Riprova
              </button>
            </>
          )}
        </div>
      )}

      {inReview && (
        <BatchReviewList
          candidates={candidates}
          emptyMessage="Non ho riconosciuto nessun prodotto. Riprova parlando in modo più chiaro."
          onToggle={toggle}
          onUpdate={update}
          onRemove={remove}
        />
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
