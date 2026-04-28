import { useState, useRef } from 'react'
import styles from './SettingsTab.module.css'

const GEMINI_API_KEY_STORAGE = 'gemini-api-key'

export function SettingsTab({ user, onExport, onImport, onClearInventory, onSignOut }) {
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(GEMINI_API_KEY_STORAGE) ?? '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSaveKey() {
    const trimmed = apiKey.trim()
    if (trimmed) localStorage.setItem(GEMINI_API_KEY_STORAGE, trimmed)
    else localStorage.removeItem(GEMINI_API_KEY_STORAGE)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const savedKey = localStorage.getItem(GEMINI_API_KEY_STORAGE)

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

  async function handleClear() {
    if (confirm('Vuoi davvero cancellare tutti i dati della dispensa? L\'operazione è irreversibile.')) {
      await onClearInventory()
    }
  }

  return (
    <div className={styles.wrap}>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.accountRow}>
          {user.photoURL
            ? <img className={styles.avatar} src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            : <div className={styles.avatarFallback}>{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
          }
          <div className={styles.accountInfo}>
            {user.displayName && <span className={styles.accountName}>{user.displayName}</span>}
            <span className={styles.accountEmail}>{user.email}</span>
          </div>
        </div>
        <button className={styles.signOutBtn} onClick={onSignOut}>
          Disconnetti
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>API Key Gemini</h2>
        <p className={styles.desc}>
          La chiave viene salvata solo nel tuo browser. Non viene mai inviata a server esterni.
        </p>
        <div className={styles.keyRow}>
          <input
            className={styles.keyInput}
            type={showKey ? 'text' : 'password'}
            placeholder="Incolla la tua API key..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            spellCheck={false}
          />
          <button className={styles.visBtn} onClick={() => setShowKey(v => !v)} title={showKey ? 'Nascondi' : 'Mostra'}>
            {showKey ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className={styles.keyFooter}>
          <a className={styles.link} href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
            Ottieni una API key gratuita →
          </a>
          <button className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`} onClick={handleSaveKey}>
            {saved ? 'Salvata!' : 'Salva'}
          </button>
        </div>
        {savedKey && (
          <div className={styles.activeKey}>
            <span className={styles.dot} />
            {savedKey.slice(0, 8)}…{savedKey.slice(-4)}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Backup e trasferimento</h2>
        <p className={styles.desc}>
          Esporta la dispensa in CSV per un backup locale. Importa un CSV precedentemente esportato (sovrascrive la dispensa attuale).
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
        <h2 className={styles.sectionTitle}>Zona pericolosa</h2>
        <p className={styles.desc}>
          Cancella tutti gli elementi dalla dispensa. I dati vengono rimossi anche dal cloud.
        </p>
        <button className={styles.dangerBtn} onClick={handleClear}>
          Cancella tutti i dati dispensa
        </button>
      </section>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 7.5C1 7.5 3.5 3 7.5 3s6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5S1 7.5 1 7.5Z"/>
      <circle cx="7.5" cy="7.5" r="1.5"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 1l13 13M6.3 6.4A1.5 1.5 0 0 0 9 8.7M3.7 3.8C2.3 4.8 1 7.5 1 7.5s2.5 4.5 6.5 4.5c1.3 0 2.5-.4 3.5-1M6 3.1C6.5 3 7 3 7.5 3c4 0 6.5 4.5 6.5 4.5s-.6 1.1-1.7 2.2"/>
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
