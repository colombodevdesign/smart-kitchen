import { useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { Chip } from './ui/Chip.jsx'
import { useNotifications } from '../hooks/useNotifications.js'
import { useMealPrefs } from '../hooks/useMealPrefs.js'
import { MEAL_CATEGORIES, MORNING_TIME, REMINDER_LEADS } from '../data/mealCategories.js'
import { MOCK_MODE } from '../mock/mode.js'
import styles from './MealReminderSettings.module.css'

// Tu › Notifiche › Promemoria dei pasti: reminders for planned meals, their usual
// lead time, the time of each meal and the 17:00 "plan your dinner" nudge.
export function MealReminderSettings({ user, onBack }) {
  const uid = user?.uid ?? null
  const { prefs, setMealPrefs } = useMealPrefs(uid)
  const n = useNotifications(uid ?? undefined)
  const [error, setError] = useState('')

  const save = (patch) => {
    setError('')
    setMealPrefs(patch).catch(e => setError(e?.code === 'permission-denied'
      ? 'Regole Firestore non aggiornate: pubblica quelle di docs/firestore-rules.md.'
      : 'Non sono riuscito a salvare. Riprova.'))
  }

  // Switching on also registers this device when it isn't yet (same as the expiry alerts).
  const toggle = () => {
    if (prefs.enabled) return save({ enabled: false })
    if (!uid || MOCK_MODE || n.thisDevice === 'active' || !n.supported || n.thisDevice === 'blocked') return save({ enabled: true })
    n.enableMeals(prefs)
  }

  let warning = null
  if (MOCK_MODE) warning = 'Modalità demo: le impostazioni restano su questo dispositivo e le notifiche non vengono inviate.'
  else if (prefs.enabled && !n.supported) warning = 'Questo browser non riceve notifiche. Su iPhone e iPad aggiungi prima l’app alla schermata Home.'
  else if (prefs.enabled && n.thisDevice === 'blocked') warning = 'Le notifiche sono bloccate per questo sito: consentile dalle impostazioni del browser.'
  const canRegisterHere = !MOCK_MODE && uid && prefs.enabled && n.supported && !n.loading
    && n.thisDevice !== 'active' && n.thisDevice !== 'blocked'

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Promemoria dei pasti</h1>
      </div>

      <section className={styles.master}>
        <span className={styles.masterIcon} aria-hidden="true"><Icon name="bell" size={22} /></span>
        <span className={styles.masterText}>
          <strong>{prefs.enabled ? 'Promemoria attivi' : 'Promemoria spenti'}</strong>
          <span>Per i pasti che metti in programma</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.enabled}
          aria-label="Promemoria dei pasti"
          className={`${styles.toggle} ${prefs.enabled ? styles.on : ''}`}
          onClick={toggle}
          disabled={n.busy}
        >
          <span className={styles.thumb} />
        </button>
      </section>
      {warning && <p className={styles.warning}>{warning}</p>}
      {canRegisterHere && (
        <div className={styles.warning}>
          <span>Su questo dispositivo i promemoria non arrivano ancora.</span>
          <button type="button" className={styles.bannerBtn} onClick={() => n.enableMeals(prefs)} disabled={n.busy}>
            Attiva su questo dispositivo
          </button>
        </div>
      )}
      {(error || n.error) && <p className={styles.error} role="alert">{error || n.error}</p>}

      <section className={`${styles.group} ${prefs.enabled ? '' : styles.dimmed}`} aria-labelledby="meal-lead">
        <h2 id="meal-lead" className={styles.legend}>Quando avvisarmi di solito</h2>
        <div className={styles.chips}>
          {REMINDER_LEADS.map(l => (
            <Chip key={l.value} selected={prefs.lead === l.value} onClick={() => save({ lead: l.value })}>
              {l.value === 'am' ? `${l.label} · ${MORNING_TIME}` : l.label}
            </Chip>
          ))}
        </div>
        <p className={styles.hint}>Lo cambi pasto per pasto quando lo pianifichi.</p>
      </section>

      <section className={styles.group} aria-labelledby="meal-times">
        <h2 id="meal-times" className={styles.legend}>Orari dei pasti</h2>
        <ul className={styles.times}>
          {MEAL_CATEGORIES.map(c => (
            <li key={c.id}>
              <label className={styles.timeRow}>
                <span className={styles.timeLabel}>
                  <span className={styles.dot} data-cat={c.id} aria-hidden="true" />
                  {c.label}
                </span>
                <input
                  type="time"
                  value={prefs.times[c.id]}
                  onChange={e => e.target.value && save({ times: { [c.id]: e.target.value } })}
                />
              </label>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>Sono l’orario proposto quando pianifichi un pasto.</p>
      </section>

      <section className={`${styles.master} ${prefs.enabled ? '' : styles.dimmed}`}>
        <span className={styles.masterText}>
          <strong>Ricordami di pianificare la cena</strong>
          <span>Alle 17:00, se per stasera non c’è ancora nulla</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.dinnerNudge}
          aria-label="Ricordami di pianificare la cena"
          className={`${styles.toggle} ${prefs.dinnerNudge ? styles.on : ''}`}
          onClick={() => save({ dinnerNudge: !prefs.dinnerNudge })}
        >
          <span className={styles.thumb} />
        </button>
      </section>
    </div>
  )
}
