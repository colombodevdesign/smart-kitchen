import { Modal } from './Modal.jsx'
import { SHORTCUT_GROUPS } from '../nav/shortcuts.js'
import styles from './ShortcutsHelp.module.css'

export function ShortcutsHelp({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Scorciatoie da tastiera">
      <div className={styles.groups}>
        {SHORTCUT_GROUPS.map(group => (
          <section key={group.title} aria-label={group.title}>
            <h4 className={styles.groupTitle}>{group.title}</h4>
            <dl className={styles.list}>
              {group.items.map(item => (
                <div key={item.label} className={styles.row}>
                  <dt className={styles.label}>{item.label}</dt>
                  <dd className={styles.keys}>
                    {item.keys.map(k => <kbd key={k} className={styles.kbd}>{k}</kbd>)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className={styles.note}>
          Sono tasti singoli, uguali su Windows e Mac. Non scattano mentre scrivi in un campo.
        </p>
      </div>
    </Modal>
  )
}
