import { useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { Chip } from './ui/Chip.jsx'
import { StatusBadge } from './ui/StatusBadge.jsx'
import { useNotifications } from '../hooks/useNotifications.js'
import { useMealPrefs } from '../hooks/useMealPrefs.js'
import { REMINDER_LEADS } from '../data/mealCategories.js'
import styles from './NotificationSettings.module.css'

const PRESET_HOURS = [7, 8, 9, 12, 18, 20]
const DAY_OPTIONS = [
  { value: 0, label: 'Il giorno stesso' },
  { value: 1, label: '1 giorno prima' },
  { value: 2, label: '2 giorni prima' },
  { value: 3, label: '3 giorni prima' },
]
const TEST_LABELS = {
  ok: 'consegnata',
  stale: 'dispositivo non più raggiungibile',
  error: 'errore di consegna',
}

const pad = n => String(n).padStart(2, '0')
const timeStr = (h, m) => `${pad(h)}:${pad(m)}`

function dayText(days) {
  if (days.length === 1) {
    const d = days[0]
    return d === 0 ? 'nel giorno di scadenza' : d === 1 ? '1 giorno prima della scadenza' : `${d} giorni prima della scadenza`
  }
  return `${days.map(d => (d === 0 ? 'il giorno stesso' : `${d}g prima`)).join(', ')}`
}

function formatDay(ms) {
  return new Date(ms).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function deviceDetail(d, mine) {
  const sent = d.lastOkAt ? `ultimo avviso ${formatDay(d.lastOkAt)}` : null
  if (mine) return ['Questo dispositivo', sent].filter(Boolean).join(' · ')
  const seen = d.lastSeenAt ? `aperta il ${formatDay(d.lastSeenAt)}` : 'mai aperta da questa versione'
  const text = [sent, seen].filter(Boolean).join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function NotificationSettings({ user, online = true, onBack, onOpenMealReminders }) {
  const n = useNotifications(user?.uid)
  const { prefs } = n
  const { prefs: mealPrefs } = useMealPrefs(user?.uid ?? null)
  const mealSummary = mealPrefs.enabled
    ? `Attivi · ${REMINDER_LEADS.find(l => l.value === mealPrefs.lead)?.label.toLowerCase() ?? ''}${mealPrefs.dinnerNudge ? ' · cena alle 17:00' : ''}`
    : 'Spenti'
  const [customOpen, setCustomOpen] = useState(false)
  const [tipFor, setTipFor] = useState(null)
  const [confirmFor, setConfirmFor] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState(null)

  const isPreset = prefs.minute === 0 && PRESET_HOURS.includes(prefs.hour)
  const showCustom = customOpen || !isPreset
  const activeHere = prefs.enabled && n.thisDevice === 'active'

  function toggleDay(day) {
    const has = prefs.daysBefore.includes(day)
    if (has && prefs.daysBefore.length === 1) return
    n.setSchedule({ daysBefore: has ? prefs.daysBefore.filter(d => d !== day) : [...prefs.daysBefore, day] })
  }

  function onCustomTime(e) {
    const [h, m] = e.target.value.split(':').map(Number)
    if (Number.isFinite(h) && Number.isFinite(m)) n.setSchedule({ hour: h, minute: m })
  }

  async function runTest() {
    setTesting(true)
    setTestResults(null)
    const results = await n.sendTest()
    setTestResults(results)
    setTesting(false)
  }

  let banner
  if (!n.supported) {
    banner = {
      tone: 'warn', title: 'Notifiche non disponibili',
      text: 'Questo browser non le supporta. Su iPhone e iPad aggiungi prima l’app alla schermata Home.',
    }
  } else if (n.thisDevice === 'blocked') {
    banner = {
      tone: 'warn', title: 'Notifiche bloccate',
      text: 'Le hai bloccate per questo sito: consentile dalle impostazioni del browser e torna qui.',
    }
  } else if (activeHere) {
    banner = {
      tone: 'ok', title: 'Avvisi di scadenza attivi',
      text: `Ogni giorno alle ${timeStr(prefs.hour, prefs.minute)} su questo dispositivo.`,
    }
  } else if (prefs.enabled) {
    banner = {
      tone: 'warn', title: 'Attivi, ma non qui',
      text: 'Questo dispositivo non è ancora registrato per ricevere gli avvisi.',
      action: 'Attiva su questo dispositivo',
    }
  } else {
    banner = { tone: 'off', title: 'Avvisi di scadenza disattivi', text: 'Attivali per ricevere una notifica quando un prodotto sta per scadere.' }
  }
  const canSwitch = n.supported && n.thisDevice !== 'blocked'

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Notifiche</h1>
      </div>

      <section className={`${styles.banner} ${styles[banner.tone]}`} aria-live="polite">
        <div className={styles.bannerText}>
          <strong>{banner.title}</strong>
          <span>{banner.text}</span>
          {banner.action && (
            <button type="button" className={styles.bannerBtn} onClick={n.enable} disabled={n.busy}>
              {banner.action}
            </button>
          )}
        </div>
        {canSwitch && (
          <button
            type="button"
            role="switch"
            aria-checked={prefs.enabled}
            aria-label="Avvisi di scadenza"
            className={`${styles.toggle} ${prefs.enabled ? styles.on : ''}`}
            onClick={prefs.enabled ? n.disable : n.enable}
            disabled={n.busy || n.loading}
          >
            <span className={styles.thumb} />
          </button>
        )}
      </section>
      {n.error && <p className={styles.error} role="alert">{n.error}</p>}

      <section className={`${styles.group} ${prefs.enabled ? '' : styles.dimmed}`} aria-labelledby="notif-hour">
        <h2 id="notif-hour" className={styles.legend}>A che ora</h2>
        <div className={styles.chips}>
          {PRESET_HOURS.map(h => (
            <Chip
              key={h}
              selected={prefs.minute === 0 && prefs.hour === h && !customOpen}
              disabled={!prefs.enabled}
              onClick={() => { setCustomOpen(false); n.setSchedule({ hour: h, minute: 0 }) }}
            >
              {timeStr(h, 0)}
            </Chip>
          ))}
          <Chip selected={showCustom} disabled={!prefs.enabled} onClick={() => setCustomOpen(true)}>
            {isPreset ? 'Altro orario' : `Altro · ${timeStr(prefs.hour, prefs.minute)}`}
          </Chip>
        </div>
        {showCustom && (
          <label className={styles.custom}>
            <span>Orario</span>
            <input
              type="time"
              step={900}
              value={timeStr(prefs.hour, prefs.minute)}
              disabled={!prefs.enabled}
              onChange={onCustomTime}
            />
          </label>
        )}
      </section>

      <section className={`${styles.group} ${prefs.enabled ? '' : styles.dimmed}`} aria-labelledby="notif-days">
        <h2 id="notif-days" className={styles.legend}>Con quanto anticipo</h2>
        <div className={styles.chips}>
          {DAY_OPTIONS.map(o => (
            <Chip key={o.value} selected={prefs.daysBefore.includes(o.value)} disabled={!prefs.enabled} onClick={() => toggleDay(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
        <p className={styles.hint}>
          Riceverai un solo avviso al giorno con i prodotti che scadono {dayText(prefs.daysBefore)}.
        </p>
      </section>

      {onOpenMealReminders && (
        <button type="button" className={styles.linkRow} onClick={onOpenMealReminders}>
          <span className={styles.deviceIcon} aria-hidden="true"><Icon name="bowl" size={22} /></span>
          <span className={styles.deviceText}>
            <strong>Promemoria dei pasti</strong>
            <span>{mealSummary}</span>
          </span>
          <Icon name="chevR" size={20} strokeWidth={2} />
        </button>
      )}

      <section className={styles.group} aria-labelledby="notif-devices">
        <h2 id="notif-devices" className={styles.legend}>Dispositivi</h2>
        {n.loading ? (
          <p className={styles.hint}>Caricamento…</p>
        ) : n.devices.length === 0 ? (
          <p className={styles.hint}>Nessun dispositivo registrato. Attiva gli avvisi per aggiungere questo.</p>
        ) : (
          <ul className={styles.devices}>
            {n.devices.map(d => {
              const mine = d.id === n.myId
              const active = d.status === 'active'
              return (
                <li key={d.id} className={styles.device}>
                  <span className={styles.deviceIcon}>
                    <Icon name={/iPhone|iPad|Android/.test(d.platform ?? '') ? 'phone' : 'monitor'} size={22} />
                  </span>
                  <span className={styles.deviceText}>
                    <strong>{d.label}</strong>
                    <span>{deviceDetail(d, mine)}</span>
                    <StatusBadge tone={active ? 'ok' : 'soon'} className={styles.deviceBadge}>
                      {active ? 'Attivo' : 'Non raggiungibile'}
                    </StatusBadge>
                  </span>
                  {!active && (
                    <button
                      type="button"
                      className={styles.info}
                      aria-label="Perché non è raggiungibile?"
                      aria-expanded={tipFor === d.id}
                      aria-describedby={tipFor === d.id ? `tip-${d.id}` : undefined}
                      onClick={() => setTipFor(tipFor === d.id ? null : d.id)}
                    >
                      <Icon name="info" size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.info}
                    aria-label={`Rimuovi ${d.label}`}
                    aria-expanded={confirmFor === d.id}
                    onClick={() => setConfirmFor(confirmFor === d.id ? null : d.id)}
                    disabled={n.busy}
                  >
                    <Icon name="trash" size={20} />
                  </button>
                  {tipFor === d.id && (
                    <span id={`tip-${d.id}`} role="tooltip" className={styles.tip}>
                      Apri l’app su quel dispositivo per riattivarlo, oppure rimuovilo.
                    </span>
                  )}
                  {confirmFor === d.id && (
                    <span className={styles.confirm} role="group" aria-label={`Rimuovere ${d.label}?`}>
                      <span>
                        {mine
                          ? 'Questo dispositivo non riceverà più gli avvisi finché non li riattivi qui.'
                          : 'Non riceverà più gli avvisi. Se lo usi ancora, riattivali aprendo l’app lì.'}
                      </span>
                      <span className={styles.confirmActions}>
                        <button
                          type="button"
                          className={styles.confirmRemove}
                          onClick={async () => { await n.removeDevice(d.id); setConfirmFor(null) }}
                          disabled={n.busy}
                        >
                          Rimuovi
                        </button>
                        <button type="button" className={styles.confirmCancel} onClick={() => setConfirmFor(null)}>
                          Annulla
                        </button>
                      </span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          className={styles.testBtn}
          onClick={runTest}
          disabled={testing || !online || !prefs.enabled || n.devices.length === 0}
        >
          <Icon name="bell" size={20} /> {testing ? 'Invio in corso…' : 'Invia notifica di prova'}
        </button>
        {testResults && (
          <div className={styles.results} role="status">
            {testResults.length === 0 ? (
              <span>Nessun dispositivo a cui inviare.</span>
            ) : testResults.map(r => (
              <span key={r.deviceId} className={r.status === 'ok' ? styles.resOk : styles.resBad}>
                <Icon name={r.status === 'ok' ? 'check' : 'alert'} size={16} strokeWidth={2.4} />
                {r.label}: {TEST_LABELS[r.status] ?? r.status}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
