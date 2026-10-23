import { useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Icon } from './ui/Icon.jsx'
import { PageHeader } from './ui/PageHeader.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { useNotifications } from '../hooks/useNotifications.js'
import { useToast } from './ui/Toast.jsx'
import { validateApiKey } from '../ai/validateKey.js'
import { getApiKey } from '../utils/apiKey.js'
import { getPref, setPref } from '../utils/theme.js'
import { MOCK_MODE } from '../mock/mode.js'
import styles from './ProfileTab.module.css'

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
]

export function ProfileTab({ user, online, onExport, onImport, onClearInventory, onSignOut, onOpenNotifications, onSaveApiKey }) {
  const push = useNotifications(user?.uid)
  const alertsOn = push.prefs.enabled && push.thisDevice === 'active'
  const pad = n => String(n).padStart(2, '0')
  const [theme, setTheme] = useState(getPref)
  const [dialog, setDialog] = useState(null) // 'api' | 'csv' | 'clear'

  // API key
  const [apiKey, setApiKey] = useState(getApiKey)
  const [showKey, setShowKey] = useState(false)
  const [keyChecking, setKeyChecking] = useState(false)
  const [keyError, setKeyError] = useState('')
  const hasKey = !!getApiKey()
  const toast = useToast()

  function openKeyDialog() {
    setApiKey(getApiKey())
    setKeyError('')
    setDialog('api')
  }

  function closeKeyDialog() {
    if (keyChecking) return
    setDialog(null)
  }

  async function saveKey() {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      await onSaveApiKey('')
      setDialog(null)
      toast.show({ message: 'Chiave API rimossa' })
      return
    }
    setKeyChecking(true)
    setKeyError('')
    const result = await validateApiKey(trimmed)
    if (!result.ok) {
      setKeyChecking(false)
      setKeyError(result.message)
      return
    }
    const where = await onSaveApiKey(trimmed)
    setKeyChecking(false)
    setDialog(null)
    toast.show({
      message: where === 'synced'
        ? 'Chiave API verificata e salvata nel tuo account'
        : 'Chiave API verificata, salvata solo su questo dispositivo',
    })
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
            {MOCK_MODE ? 'Modalità demo · solo su questo dispositivo' : `Google · ${online ? 'sincronizzato' : 'offline'}`}
          </span>
        </div>
      </section>

      <button type="button" className={styles.linkCard} onClick={onOpenNotifications}>
        <span className={styles.bell}><Icon name="bell" size={24} /></span>
        <span className={styles.linkText}>
          <strong>Avvisi di scadenza</strong>
          <span>{alertsOn ? `Ogni giorno alle ${pad(push.prefs.hour)}:${pad(push.prefs.minute)}` : push.prefs.enabled ? 'Da completare su questo dispositivo' : 'Disattivati'}</span>
        </span>
        <StatusBadge tone={alertsOn ? 'ok' : push.prefs.enabled ? 'soon' : 'neutral'}>{alertsOn ? 'Attivi' : push.prefs.enabled ? 'Da attivare' : 'Disattivi'}</StatusBadge>
        <Icon name="chevR" size={20} className={styles.chev} />
      </button>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Aspetto</h2>
        <Segmented options={THEME_OPTIONS} value={theme} onChange={changeTheme} ariaLabel="Aspetto dell'app" />
      </section>

      <ul className={styles.list}>
        <li>
          <button type="button" className={styles.row} onClick={openKeyDialog}>
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

      <button type="button" className={styles.signOut} onClick={onSignOut}>{MOCK_MODE ? 'Ripristina dati demo' : 'Esci'}</button>

      <Modal open={dialog === 'api'} onClose={closeKeyDialog} title="Chiave API Gemini">
        <form
          className={styles.dialogBody}
          onSubmit={e => { e.preventDefault(); if (!keyChecking) saveKey() }}
        >
          <p className={styles.desc}>
            Prima di salvarla verifichiamo la chiave con Google. Viene salvata nel tuo account, così la ritrovi su tutti i dispositivi.
          </p>
          <div className={styles.keyField}>
            <div className={styles.keyRow}>
              <input
                className={`${styles.keyInput} ${keyError ? styles.keyInputErr : ''}`}
                type={showKey ? 'text' : 'password'}
                placeholder="Incolla la tua API key…"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); if (keyError) setKeyError('') }}
                spellCheck={false}
                autoComplete="off"
                readOnly={keyChecking}
                aria-label="Chiave API Gemini"
                aria-invalid={keyError ? 'true' : undefined}
                aria-describedby={keyError ? 'api-key-error' : undefined}
              />
              <button type="button" className={styles.visBtn} onClick={() => setShowKey(v => !v)} aria-label={showKey ? 'Nascondi chiave' : 'Mostra chiave'}>
                <Icon name={showKey ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </div>
            {keyError && <p id="api-key-error" role="alert" className={styles.err}>{keyError}</p>}
          </div>
          <a className={styles.link} href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
            Ottieni una API key gratuita
          </a>
          <button type="submit" className={styles.primary} disabled={keyChecking} aria-busy={keyChecking}>
            {keyChecking ? 'Verifico…' : 'Salva'}
          </button>
        </form>
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
