import { useState } from 'react'
import { Icon } from './ui/Icon.jsx'
import { Select } from './ui/Select.jsx'
import { PREFERENCE_KINDS } from '../data/preferences.js'
import styles from './PreferencesSettings.module.css'

function sourceLabel(p) {
  if (p.source !== 'chat') return null
  const date = new Date(p.createdAt)
  const today = new Date()
  const same = date.toDateString() === today.toDateString()
  return `Dalla chat · ${same ? 'oggi' : date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
}

// Tu › Preferenze alimentari: what every AI prompt knows about the user's tastes.
// Added by hand here or proposed by the assistant in the chat.
export function PreferencesSettings({ preferences, onBack }) {
  const [text, setText] = useState('')
  const [kind, setKind] = useState('non-piace')
  const [notice, setNotice] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    const added = preferences.add({ kind, text, source: 'manual' })
    setNotice(added ? '' : 'C’è già.')
    if (added) setText('')
  }

  const groups = PREFERENCE_KINDS
    .map(k => ({ ...k, items: preferences.items.filter(p => p.kind === k.id) }))
    .filter(g => g.items.length > 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Indietro">
          <Icon name="chevL" size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Preferenze alimentari</h1>
      </div>
      <p className={styles.hint}>Le usa tutta l’AI: ricette, idee per la spesa, di stagione e chat. Allergie e dieta sono vincoli, i gusti indicazioni.</p>

      <form className={styles.form} onSubmit={submit}>
        <label htmlFor="pref-new" className={styles.label}>Aggiungi una preferenza</label>
        <input
          id="pref-new"
          className={styles.field}
          type="text"
          value={text}
          onChange={e => { setText(e.target.value); setNotice('') }}
          placeholder="Es. niente funghi"
          maxLength={120}
        />
        <div className={styles.formRow}>
          <Select className={styles.field} wrapClassName={styles.kind} value={kind} onChange={e => setKind(e.target.value)} aria-label="Tipo">
            {PREFERENCE_KINDS.map(k => <option key={k.id} value={k.id}>{k.option}</option>)}
          </Select>
          <button type="submit" className={styles.add} disabled={!text.trim()}>Aggiungi</button>
        </div>
        {notice && <p className={styles.notice} role="status">{notice}</p>}
      </form>

      {groups.length === 0 && (
        <p className={styles.hint}>Nessuna preferenza per ora. L’assistente te ne proporrà quando nota qualcosa nei tuoi pasti e nelle tue richieste.</p>
      )}

      {groups.map(g => (
        <section key={g.id} className={styles.group}>
          <h2 className={styles.legend}>
            {g.label}
            {g.strict && <span className={styles.strict}>vincolo</span>}
          </h2>
          <ul className={styles.list}>
            {g.items.map(p => (
              <li key={p.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span>{p.text}</span>
                  {sourceLabel(p) && (
                    <span className={styles.source}><Icon name="sparkle" size={13} /> {sourceLabel(p)}</span>
                  )}
                </div>
                <button type="button" className={styles.remove} onClick={() => preferences.remove(p.id)} aria-label={`Elimina «${p.text}»`}>
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
