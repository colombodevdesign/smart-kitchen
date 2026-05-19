import { useMemo, useState, useEffect } from 'react'
import { Modal } from './Modal.jsx'
import { SECTIONS, SECTION_LABELS, SECTION_ICONS } from '../data/initialInventory.js'
import { expiryStatus } from '../utils/date.js'
import styles from './PantrySuggestionsModal.module.css'

function statusRank(c) {
  if (c.status === 'expired') return 0
  if (c.urgent && c.status !== 'soon') return 1
  if (c.status === 'soon') return 2
  return 3
}

function badgeFor(c) {
  if (c.status === 'expired') return { label: 'scaduto', cls: styles.badgeExpired }
  if (c.status === 'soon')    return { label: 'in scadenza', cls: styles.badgeSoon }
  if (c.urgent)               return { label: 'da usare',   cls: styles.badgeUrgent }
  return null
}

export function PantrySuggestionsModal({ open, onClose, inventory, existingItems, onAdd }) {
  const candidates = useMemo(() => {
    if (!inventory) return []
    const existingNames = new Set(
      (existingItems ?? [])
        .filter(i => !i.checked)
        .map(i => i.name.trim().toLowerCase())
    )
    const list = []
    for (const section of SECTIONS) {
      for (const item of (inventory[section] ?? [])) {
        const status = expiryStatus(item.expiresAt)
        const include = status === 'expired' || status === 'soon' || item.urgent
        if (!include) continue
        const key = item.name.trim().toLowerCase()
        if (existingNames.has(key)) continue
        list.push({
          id: item.id,
          name: item.name,
          qty: item.qty || '',
          urgent: !!item.urgent,
          status,
          section,
        })
      }
    }
    return list.sort((a, b) => statusRank(a) - statusRank(b))
  }, [inventory, existingItems, open])

  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    if (open) setSelected(new Set(candidates.map(c => c.id)))
  }, [open, candidates])

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd() {
    const picked = candidates.filter(c => selected.has(c.id))
    if (picked.length === 0) return
    const toAdd = picked.map(c => ({
      name: c.name,
      qty: c.qty,
      category: SECTION_LABELS[c.section],
      source: 'pantry',
    }))
    onAdd(toAdd)
    onClose()
  }

  const count = selected.size

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggerimenti dalla dispensa"
      footer={
        <button
          type="button"
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={count === 0}
        >
          {count > 0 ? `Aggiungi ${count} alla lista` : 'Nessun item selezionato'}
        </button>
      }
    >
      {candidates.length === 0 ? (
        <p className={styles.empty}>
          Nessun prodotto in scadenza o urgente in dispensa.
        </p>
      ) : (
        <ul className={styles.list}>
          {candidates.map(c => {
            const badge = badgeFor(c)
            const isOn = selected.has(c.id)
            return (
              <li key={c.id} className={`${styles.item} ${isOn ? styles.itemOn : ''}`}>
                <label className={styles.label}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isOn}
                    onChange={() => toggle(c.id)}
                  />
                  <div className={styles.content}>
                    <div className={styles.nameRow}>
                      <span className={styles.name}>{c.name}</span>
                      {c.qty && <span className={styles.qty}>{c.qty}</span>}
                    </div>
                    <div className={styles.metaRow}>
                      {badge && <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>}
                      <span className={styles.section}>
                        {SECTION_ICONS[c.section]} {SECTION_LABELS[c.section]}
                      </span>
                    </div>
                  </div>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
