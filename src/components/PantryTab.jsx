import { useEffect, useRef, useState } from 'react'
import { ItemRow } from './ItemRow.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import styles from './PantryTab.module.css'

const SORT_LABELS = {
  none:          'Ordine inserimento',
  urgent:        'Urgenti prima',
  'name-asc':    'Nome A → Z',
  'name-desc':   'Nome Z → A',
  'expiry-asc':  'Scadenza ↑',
  'expiry-desc': 'Scadenza ↓',
}

export function PantryTab({ inventory, onToggleUrgent, onUpdate, onRemove, onAdd, onMove }) {
  const [section, setSection] = useState('all')
  const [addSection, setAddSection] = useState('credenza')
  const [sortMode, setSortMode] = useState('expiry-asc')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const nameInputRef = useRef(null)
  const addRowRef    = useRef(null)
  const searchRef    = useRef(null)
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  function openSearch() { setSearchOpen(true) }
  function closeSearch() { setSearch(''); setSearchOpen(false) }

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
    const target = section === 'all' ? addSection : section
    onAdd(target, newName, newQty, newExpiry || null)
    setNewName('')
    setNewQty('')
    setNewExpiry('')
  }

  // Sort operates on {item, itemSection} pairs — works uniformly for single-section and "all"
  function sortPairs(pairs) {
    const arr = [...pairs]
    switch (sortMode) {
      case 'urgent':
        return arr.sort((a, b) => (b.item.urgent ? 1 : 0) - (a.item.urgent ? 1 : 0))
      case 'name-asc':
        return arr.sort((a, b) => a.item.name.localeCompare(b.item.name, 'it'))
      case 'name-desc':
        return arr.sort((a, b) => b.item.name.localeCompare(a.item.name, 'it'))
      case 'expiry-asc':
        return arr.sort((a, b) => {
          if (!a.item.expiresAt && !b.item.expiresAt) return 0
          if (!a.item.expiresAt) return 1
          if (!b.item.expiresAt) return -1
          return a.item.expiresAt - b.item.expiresAt
        })
      case 'expiry-desc':
        return arr.sort((a, b) => {
          if (!a.item.expiresAt && !b.item.expiresAt) return 0
          if (!a.item.expiresAt) return 1
          if (!b.item.expiresAt) return -1
          return b.item.expiresAt - a.item.expiresAt
        })
      default:
        return arr
    }
  }

  const searchQuery  = search.trim().toLowerCase()
  const searchActive = searchQuery.length > 0

  // When searching show all sections regardless of active tab
  const basePairs = (searchActive || section === 'all')
    ? SECTIONS.flatMap(s => inventory[s].map(i => ({ item: i, itemSection: s })))
    : inventory[section].map(i => ({ item: i, itemSection: section }))

  const displayItems = searchActive
    ? basePairs.filter(({ item }) => item.name.toLowerCase().includes(searchQuery))
    : sortPairs(basePairs)

  const showSectionBadge = section === 'all' || searchActive
  const totalCount = SECTIONS.reduce((n, s) => n + inventory[s].length, 0)

  return (
    <div className={styles.wrap}>
      {searchOpen ? (
        <div className={styles.searchBar}>
          <div className={styles.searchBarInner}>
            <SearchIcon />
            <input
              ref={searchRef}
              className={styles.searchBarInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca prodotti…"
              aria-label="Cerca prodotti"
            />
            {search && (
              <button
                className={styles.searchBarClear}
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                aria-label="Cancella testo"
              >✕</button>
            )}
          </div>
          <button className={styles.searchCancel} onClick={closeSearch}>Annulla</button>
        </div>
      ) : (
        <div className={styles.toolbar}>
          <div className={styles.sections}>
            <button
              className={`${styles.sectionBtn} ${section === 'all' ? styles.active : ''}`}
              onClick={() => setSection('all')}
            >
              Tutto
              <span className={styles.count}>{totalCount}</span>
            </button>
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
            <button className={styles.searchIconBtn} onClick={openSearch} aria-label="Cerca">
              <SearchIcon />
            </button>
            <div
              className={`${styles.sortWrap} ${sortMode !== 'none' ? styles.sortActive : ''}`}
              title={SORT_LABELS[sortMode]}
            >
              <SortIcon />
              {sortMode !== 'none' && <span className={styles.sortDot} />}
              <select
                className={styles.sortOverlay}
                value={sortMode}
                onChange={e => setSortMode(e.target.value)}
                aria-label="Ordina per"
              >
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
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
              showSection={showSectionBadge}
              onToggleUrgent={onToggleUrgent}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onMove={onMove}
            />
          ))
        )}
      </div>

      <div ref={addRowRef} className={styles.addRow}>
        {section === 'all' && (
          <select
            className={styles.addSectionSelect}
            value={addSection}
            onChange={e => setAddSection(e.target.value)}
            aria-label="Sezione di destinazione"
          >
            {SECTIONS.map(s => (
              <option key={s} value={s}>{SECTION_LABELS[s]}</option>
            ))}
          </select>
        )}
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

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="12" y2="4"/>
      <line x1="2" y1="7" x2="9" y2="7"/>
      <line x1="2" y1="10" x2="6" y2="10"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
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
