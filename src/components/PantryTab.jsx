import { useState } from 'react'
import { ItemRow } from './ItemRow.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import styles from './PantryTab.module.css'

export function PantryTab({ inventory, onToggleUrgent, onUpdate, onRemove, onAdd }) {
  const [section, setSection] = useState('credenza')
  const [sortUrgent, setSortUrgent] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')

  function handleAdd() {
    if (!newName.trim()) return
    onAdd(section, newName, newQty)
    setNewName('')
    setNewQty('')
  }

  const items = sortUrgent
    ? [...inventory[section]].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
    : inventory[section]

  const urgentCount = Object.values(inventory).flat().filter(i => i.urgent).length

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.sections}>
          {SECTIONS.map(s => (
            <button
              key={s}
              className={`${styles.sectionBtn} ${section === s ? styles.active : ''}`}
              onClick={() => setSection(s)}
            >
              {SECTION_LABELS[s]}
              <span className={styles.count}>{inventory[s].length}</span>
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            className={`${styles.sortBtn} ${sortUrgent ? styles.sortActive : ''}`}
            onClick={() => setSortUrgent(v => !v)}
            title="Ordina per urgenza"
          >
            <SortIcon />
            urgenza
            {urgentCount > 0 && <span className={styles.urgentBadge}>{urgentCount}</span>}
          </button>
        </div>
      </div>

      <p className={styles.hint}>
        clicca nome o quantità per modificare · puntino = da usare presto
      </p>

      <div className={styles.list}>
        {items.length === 0
          ? <p className={styles.empty}>Nessun prodotto in questa sezione</p>
          : items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              section={section}
              onToggleUrgent={onToggleUrgent}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))
        }
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.addName}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nome prodotto..."
        />
        <input
          className={styles.addQty}
          value={newQty}
          onChange={e => setNewQty(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Quantità"
        />
        <button className={styles.addBtn} onClick={handleAdd}>+ Aggiungi</button>
      </div>
    </div>
  )
}

function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="1" y1="3" x2="11" y2="3"/>
      <line x1="1" y1="6" x2="8" y2="6"/>
      <line x1="1" y1="9" x2="5" y2="9"/>
    </svg>
  )
}

