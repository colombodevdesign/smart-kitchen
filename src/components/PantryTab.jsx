import { useEffect, useRef, useState } from 'react'
import { ItemRow } from './ItemRow.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import styles from './PantryTab.module.css'

export function PantryTab({ inventory, onToggleUrgent, onUpdate, onRemove, onAdd, onMove }) {
  const [section, setSection] = useState('credenza')
  const [sortMode, setSortMode] = useState('none')
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const nameInputRef = useRef(null)
  const addRowRef    = useRef(null)
  const searchRef    = useRef(null)
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    const el = addRowRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { threshold: 0.8 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function focusAddRow() {
    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    nameInputRef.current?.focus()
  }

  function handleAdd() {
    if (!newName.trim()) return
    onAdd(section, newName, newQty, newExpiry || null)
    setNewName('')
    setNewQty('')
    setNewExpiry('')
  }

  function sortItems(items) {
    const arr = [...items]
    switch (sortMode) {
      case 'urgent':
        return arr.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
      case 'name-asc':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'it'))
      case 'name-desc':
        return arr.sort((a, b) => b.name.localeCompare(a.name, 'it'))
      case 'expiry-asc':
        return arr.sort((a, b) => {
          if (!a.expiresAt && !b.expiresAt) return 0
          if (!a.expiresAt) return 1
          if (!b.expiresAt) return -1
          return a.expiresAt - b.expiresAt
        })
      case 'expiry-desc':
        return arr.sort((a, b) => {
          if (!a.expiresAt && !b.expiresAt) return 0
          if (!a.expiresAt) return 1
          if (!b.expiresAt) return -1
          return b.expiresAt - a.expiresAt
        })
      default:
        return arr
    }
  }

  const searchActive = search.trim().length > 0
  const searchQuery  = search.trim().toLowerCase()

  const displayItems = searchActive
    ? SECTIONS.flatMap(s =>
        inventory[s]
          .filter(i => i.name.toLowerCase().includes(searchQuery))
          .map(i => ({ item: i, itemSection: s }))
      )
    : sortItems(inventory[section]).map(i => ({ item: i, itemSection: section }))

  const urgentCount = Object.values(inventory).flat().filter(i => i.urgent).length

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.sections}>
          {SECTIONS.map(s => (
            <button
              key={s}
              className={`${styles.sectionBtn} ${!searchActive && section === s ? styles.active : ''}`}
              onClick={() => { setSection(s); setSearch('') }}
            >
              {SECTION_LABELS[s]}
              <span className={styles.count}>{inventory[s].length}</span>
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <select
            className={`${styles.sortSelect} ${sortMode !== 'none' ? styles.sortActive : ''}`}
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
            aria-label="Ordina per"
          >
            <option value="none">Ordine inserimento</option>
            <option value="urgent">Urgenti prima</option>
            <option value="name-asc">Nome A → Z</option>
            <option value="name-desc">Nome Z → A</option>
            <option value="expiry-asc">Scadenza ↑</option>
            <option value="expiry-desc">Scadenza ↓</option>
          </select>
          {urgentCount > 0 && <span className={styles.urgentBadge}>{urgentCount}</span>}
        </div>
      </div>

      <div className={styles.searchWrap}>
        <SearchIcon />
        <input
          ref={searchRef}
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca in tutte le sezioni…"
          aria-label="Cerca prodotti"
        />
        {searchActive && (
          <button
            className={styles.searchClear}
            onClick={() => { setSearch(''); searchRef.current?.focus() }}
            aria-label="Cancella ricerca"
          >
            ✕
          </button>
        )}
      </div>

      {!searchActive && (
        <p className={styles.hint}>
          clicca nome, quantità o scadenza per modificare · puntino = da usare presto
        </p>
      )}

      <div className={styles.list}>
        {displayItems.length === 0 ? (
          <p className={styles.empty}>
            {searchActive
              ? `Nessun risultato per "${search.trim()}"`
              : 'Nessun prodotto in questa sezione'}
          </p>
        ) : (
          displayItems.map(({ item, itemSection }) => (
            <ItemRow
              key={item.id}
              item={item}
              section={itemSection}
              showSection={searchActive}
              onToggleUrgent={onToggleUrgent}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onMove={onMove}
            />
          ))
        )}
      </div>

      <div ref={addRowRef} className={styles.addRow}>
        <input
          ref={nameInputRef}
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
        <input
          type="date"
          className={styles.addExpiry}
          value={newExpiry}
          onChange={e => setNewExpiry(e.target.value)}
          title="Data di scadenza (opzionale)"
        />
        <button className={styles.addBtn} onClick={handleAdd}>+ Aggiungi</button>
      </div>

      <button
        className={`${styles.fab} ${showFab ? styles.fabVisible : ''}`}
        onClick={focusAddRow}
        aria-label="Aggiungi prodotto"
      >
        <PlusIcon />
      </button>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="6" r="4"/>
      <line x1="9.5" y1="9.5" x2="13" y2="13"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
