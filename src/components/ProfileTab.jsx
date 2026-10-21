import { useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Icon } from './ui/Icon.jsx'
import { PageHeader } from './ui/PageHeader.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { usePushNotifications } from '../hooks/usePushNotifications.js'
import { getApiKey, GEMINI_API_KEY_STORAGE } from '../utils/apiKey.js'
import { getPref, setPref } from '../utils/theme.js'
import styles from './ProfileTab.module.css'

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
]

export function ProfileTab({ user, online, onExport, onImport, onClearInventory, onSignOut, onOpenNotifications }) {
  const push = usePushNotifications(user?.uid)
  const [theme, setTheme] = useState(getPref)
  const [dialog, setDialog] = useState(null) // 'api' | 'csv' | 'clear'

  // API key
  const [apiKey, setApiKey] = useState(getApiKey)
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const hasKey = !!getApiKey()

  function saveKey() {
    const trimmed = apiKey.trim()
    try {
      if (trimmed) localStorage.setItem(GEMINI_API_KEY_STORAGE, trimmed)
      else localStorage.removeItem(GEMINI_API_KEY_STORAGE)
    } catch {}
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  // CSV
  const fileInputRef = useRef(null)
  const [importStatus, setImportStatus] = useState(null)

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
    await onClearInventory()
    setDialog(null)
  }

  function changeTheme(value) {
    setTheme(value)
    setPref(value)
  }

  const initial = (user.displayName || user.email || '?')[0].toUpperCase()

  return (
    <div className={styles.wrap}>
      <PageHeader title="Tu" />

      <section className={styles.account} aria-label="Account">
        {user.photoURL
          ? <img className={styles.avatar} src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          : <div className={styles.avatarFallback}>{initial}</div>}
        <div className={styles.accountInfo}>
          <span className={styles.accountName}>{user.displayName || 'Il tuo account'}</span>
          <span className={styles.accountEmail}>{user.email}</span>
          <span className={`${styles.sync} ${online ? '' : styles.syncOff}`}>
            Google · {online ? 'sincronizzato' : 'offline'}
          </span>
        </div>
      </section>

      <button type="button" className={styles.linkCard} onClick={onOpenNotifications}>
        <span className={styles.bell}><Icon name="bell" size={24} /></span>
        <span className={styles.linkText}>
          <strong>Avvisi di scadenza</strong>
          <span>{push.enabled ? 'Attivi su questo dispositivo' : 'Disattivati'}</span>
        </span>
        <StatusBadge tone={push.enabled ? 'ok' : 'neutral'}>{push.enabled ? 'Attivi' : 'Disattivi'}</StatusBadge>
        <Icon name="chevR" size={20} className={styles.chev} />
      </button>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Aspetto</h2>
        <Segmented options={THEME_OPTIONS} value={theme} onChange={changeTheme} ariaLabel="Aspetto dell'app" />
      </section>

      <ul className={styles.list}>
        <li>
          <button type="button" className={styles.row} onClick={() => setDialog('api')}>
            <span className={styles.rowLabel}>Chiave API Gemini</span>
            <StatusBadge tone={hasKey ? 'ok' : 'soon'}>{hasKey ? 'Impostata' : 'Mancante'}</StatusBadge>
            <Icon name="chevR" size={20} className={styles.chev} />
          </button>
        </li>
        <li>
          <button type="button" className={styles.row} onClick={() => setDialog('csv')}>
            <span className={styles.rowLabel}>Esporta o importa CSV</span>
            <Icon name="chevR" size={20} className={styles.chev} />
          </button>
        </li>
        <li>
          <button type="button" className={`${styles.row} ${styles.danger}`} onClick={() => setDialog('clear')}>
            <span className={styles.rowLabel}>Svuota dispensa</span>
          </button>
        </li>
      </ul>

      <button type="button" className={styles.signOut} onClick={onSignOut}>Esci</button>

      <Modal open={dialog === 'api'} onClose={() => setDialog(null)} title="Chiave API Gemini">
        <div className={styles.dialogBody}>
          <p className={styles.desc}>
            La chiave viene salvata solo nel tuo browser e non viene mai inviata a server esterni.
          </p>
          <div className={styles.keyRow}>
            <input
              className={styles.keyInput}
              type={showKey ? 'text' : 'password'}
              placeholder="Incolla la tua API key…"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              spellCheck={false}
              aria-label="Chiave API Gemini"
            />
            <button type="button" className={styles.visBtn} onClick={() => setShowKey(v => !v)} aria-label={showKey ? 'Nascondi chiave' : 'Mostra chiave'}>
              <Icon name={showKey ? 'eyeOff' : 'eye'} size={20} />
            </button>
          </div>
          <a className={styles.link} href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
            Ottieni una API key gratuita
          </a>
          <button type="button" className={styles.primary} onClick={saveKey}>{keySaved ? 'Salvata' : 'Salva'}</button>
        </div>
      </Modal>

      <Modal open={dialog === 'csv'} onClose={() => setDialog(null)} title="Backup e trasferimento">
        <div className={styles.dialogBody}>
          <p className={styles.desc}>
            Esporta la dispensa in CSV per un backup locale. Importa un CSV esportato in precedenza (sovrascrive la dispensa attuale).
          </p>
          <div className={styles.dataRow}>
            <button type="button" className={styles.secondary} onClick={onExport}>
              <Icon name="download" size={18} /> Esporta CSV
            </button>
            <label className={styles.secondary}>
              <Icon name="upload" size={18} /> Importa CSV
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
            <p role="status" className={importStatus.ok ? styles.ok : styles.err}>{importStatus.msg}</p>
          )}
        </div>
      </Modal>

      <Modal open={dialog === 'clear'} onClose={() => setDialog(null)} title="Svuotare la dispensa?">
        <div className={styles.dialogBody}>
          <p className={styles.desc}>
            Cancella tutti gli elementi dalla dispensa, anche dal cloud. L'operazione è irreversibile.
          </p>
          <button type="button" className={styles.dangerBtn} onClick={handleClear}>Cancella tutti i dati della dispensa</button>
          <button type="button" className={styles.secondary} onClick={() => setDialog(null)}>Annulla</button>
        </div>
      </Modal>
    </div>
  )
}
