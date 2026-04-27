import { useState, useRef } from 'react'
import styles from './SettingsTab.module.css'

export function SettingsTab({ apiKey, onSave, onExport, onImport }) {
  const [draft, setDraft] = useState(apiKey)
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)

  function handleSave() {
    onSave(draft.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
        <h2 className={styles.sectionTitle}>API Key Gemini</h2>
        <p className={styles.desc}>
          La chiave viene salvata solo nel tuo browser (localStorage) e non viene mai inviata a server esterni — viene usata direttamente per chiamare l'API di Gemini dai tab Ricette AI e Spesa Smart.
        </p>
        <div className={styles.keyRow}>
          <input
            className={styles.keyInput}
            type={visible ? 'text' : 'password'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="AIza..."
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            spellCheck={false}
            autoComplete="off"
          />
          <button className={styles.visBtn} onClick={() => setVisible(v => !v)} title={visible ? 'Nascondi' : 'Mostra'}>
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className={styles.keyFooter}>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Ottieni una chiave su aistudio.google.com →
          </a>
          <button className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`} onClick={handleSave}>
            {saved ? '✓ Salvata' : 'Salva'}
          </button>
        </div>
        {apiKey && (
          <div className={styles.activeKey}>
            <span className={styles.dot} />
            chiave configurata · {apiKey.slice(0, 12)}...
          </div>
        )}
      </section>

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

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="7.5" cy="7.5" rx="5.5" ry="4"/>
      <circle cx="7.5" cy="7.5" r="1.5"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <line x1="2" y1="2" x2="13" y2="13"/>
      <path d="M6.5 4.1A5.3 5.3 0 0113 7.5a5.3 5.3 0 01-.9 1.5M3.5 5.5A5.3 5.3 0 002 7.5a5.3 5.3 0 007.4 3.4"/>
    </svg>
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
