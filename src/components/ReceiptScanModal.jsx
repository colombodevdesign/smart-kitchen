import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { BatchReviewList, batchStyles } from './BatchReview.jsx'
import { useReceiptScan } from '../hooks/useReceiptScan.js'
import { useBatchCandidates } from '../hooks/useBatchCandidates.js'
import styles from './ReceiptScanModal.module.css'

export function ReceiptScanModal({ open, onClose, onConfirm }) {
  const { status, error, items, preview, scan, reset } = useReceiptScan()
  const { candidates, hydrate, clear, update, remove, toggle, selected, picked } =
    useBatchCandidates('r')
  const [zoom, setZoom] = useState(false)

  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  // Reset on close
  useEffect(() => {
    if (!open) {
      reset()
      clear()
      setZoom(false)
    }
  }, [open, reset, clear])

  // When the scan completes, hydrate the editable candidates list.
  useEffect(() => {
    if (status === 'ready') hydrate(items)
  }, [status, items, hydrate])

  const handleRetry = useCallback(() => {
    reset()
    clear()
    setZoom(false)
  }, [reset, clear])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    // Reset the input so picking the same photo twice still fires onChange.
    e.target.value = ''
    if (file) scan(file)
  }

  const handleConfirm = () => {
    const chosen = picked()
    if (chosen.length === 0) return
    onConfirm(chosen)
    onClose()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const inReview = status === 'ready'

  const footer = inReview ? (
    <>
      <button type="button" className={batchStyles.btnSecondary} onClick={handleRetry}>
        Nuova foto
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
      title="Importa da scontrino"
      footer={footer}
    >
      {status === 'idle' && (
        <div className={styles.capture}>
          <button
            type="button"
            className={styles.camBig}
            onClick={() => cameraRef.current?.click()}
            aria-label="Scatta foto dello scontrino"
            data-autofocus
          >
            <CameraIcon size={36} />
          </button>
          <p className={styles.helper}>Fotografa lo scontrino della spesa.</p>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => galleryRef.current?.click()}
          >
            Scegli dalla galleria
          </button>
          <p className={styles.example}>
            Inquadra tutto lo scontrino, ben disteso e illuminato.
          </p>
        </div>
      )}

      {status === 'processing' && (
        <div className={styles.capture}>
          {preview
            ? <img src={preview} alt="" className={styles.previewSmall} />
            : <div className={styles.previewPlaceholder} aria-hidden="true" />}
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.helper}>Sto leggendo lo scontrino…</p>
        </div>
      )}

      {status === 'error' && error && (
        <div className={styles.capture}>
          <div className={styles.errorIcon} aria-hidden="true">!</div>
          <p className={styles.errorMsg}>{error.message}</p>
          <button
            type="button"
            className={batchStyles.btnPrimary}
            onClick={handleRetry}
            data-autofocus
          >
            Riprova
          </button>
        </div>
      )}

      {inReview && (
        <div className={styles.review}>
          {preview && (
            <button
              type="button"
              className={`${styles.thumbBtn} ${zoom ? styles.thumbBtnOpen : ''}`}
              onClick={() => setZoom(z => !z)}
              aria-expanded={zoom}
              aria-label={zoom ? 'Riduci la foto' : 'Ingrandisci la foto'}
            >
              <img src={preview} alt="Scontrino scansionato" className={styles.thumb} />
            </button>
          )}
          <BatchReviewList
            candidates={candidates}
            emptyMessage="Non ho riconosciuto nessun prodotto. Riprova con una foto più nitida dello scontrino."
            onToggle={toggle}
            onUpdate={update}
            onRemove={remove}
          />
        </div>
      )}

      {/* Two inputs: `capture` opens the camera on mobile, the other the gallery. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={handleFile}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFile}
        tabIndex={-1}
        aria-hidden="true"
      />
    </Modal>
  )
}

function CameraIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h3l1.6-2.4A1 1 0 0 1 8.4 5h7.2a1 1 0 0 1 .8.6L18 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
