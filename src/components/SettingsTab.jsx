import { useState, useRef } from 'react'
import styles from './SettingsTab.module.css'

export function SettingsTab({ onExport, onImport }) {
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      await onImport(file)
      setImportStatus({ ok: true, msg: 'Importazione completata' })
    } catch (err) {
      setImportStatus({ ok: false, msg: err.message || 'Errore importazione' })
    }
    setTimeout(() => setImportStatus(null), 3000)
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Backup e trasferimento</h2>
        <p className={styles.desc}>
          Esporta la dispensa in CSV per fare un backup o trasferirla su un altro dispositivo. Importa un CSV precedentemente esportato per ripristinare i dati (sovrascrive la dispensa attuale).
        </p>
        <div className={styles.dataRow}>
          <button className={styles.actionBtn} onClick={onExport}>
            <DownloadIcon /> Esporta CSV
          </button>
          <label className={styles.actionBtn} style={{ cursor: 'pointer' }}>
            <UploadIcon /> Importa CSV
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className={styles.hiddenInput}
              onChange={handleImport}
            />
          </label>
        </div>
        {importStatus && (
          <p className={importStatus.ok ? styles.importSuccess : styles.importError}>
            {importStatus.msg}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dati locali</h2>
        <p className={styles.desc}>
          Tutti i dati della dispensa sono salvati nel localStorage del tuo browser.
        </p>
        <button
          className={styles.dangerBtn}
          onClick={() => {
            if (confirm('Vuoi davvero cancellare tutti i dati della dispensa? L\'operazione è irreversibile.')) {
              localStorage.removeItem('cucina-smart-v1')
              window.location.reload()
            }
          }}
        >
          Cancella tutti i dati dispensa
        </button>
      </section>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 2v7M4 6l3 3 3-3M2 11h10"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 10V3M4 6l3-3 3 3M2 11h10"/>
    </svg>
  )
}
