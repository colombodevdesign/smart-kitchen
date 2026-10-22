import { useEffect, useMemo, useRef, useState } from 'react'
import { ItemRow } from './ItemRow.jsx'
import { Icon, SectionIcon } from './ui/Icon.jsx'
import { PageHeader } from './ui/PageHeader.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { EmptyState } from './ui/EmptyState.jsx'
import { useToast } from './ui/Toast.jsx'
import { SECTIONS, SECTION_LABELS } from '../data/initialInventory.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { expiryStatus } from '../utils/date.js'
import { getPantryCandidates, statusRank } from '../utils/pantry.js'
import { hasApiKey } from '../utils/apiKey.js'
import styles from './PantryTab.module.css'

const SORT_LABELS = {
  priority:      'Da usare prima',
  none:          'Ordine inserimento',
  urgent:        'Aperti prima',
  'name-asc':    'Nome A → Z',
  'name-desc':   'Nome Z → A',
  'expiry-asc':  'Scadenza ↑',
  'expiry-desc': 'Scadenza ↓',
}

const EMPTY_TITLE = {
  credenza: 'La credenza è vuota',
  frigo: 'Il frigo è vuoto',
  freezer: 'Il freezer è vuoto',
}

function byExpiry(dir) {
  return (a, b) => {
    if (!a.item.expiresAt && !b.item.expiresAt) return 0
    if (!a.item.expiresAt) return 1
    if (!b.item.expiresAt) return -1
    return dir * (a.item.expiresAt - b.item.expiresAt)
  }
}

// Sort operates on {item, itemSection} pairs — works for one section or all of them.
function sortPairs(pairs, sortMode) {
  const arr = [...pairs]
  switch (sortMode) {
    case 'priority':
      return arr.sort((a, b) => {
        const ra = statusRank({ status: expiryStatus(a.item.expiresAt), urgent: a.item.urgent })
        const rb = statusRank({ status: expiryStatus(b.item.expiresAt), urgent: b.item.urgent })
        return ra - rb || byExpiry(1)(a, b) || a.item.name.localeCompare(b.item.name, 'it')
      })
    case 'urgent':
      return arr.sort((a, b) => (b.item.urgent ? 1 : 0) - (a.item.urgent ? 1 : 0))
    case 'name-asc':
      return arr.sort((a, b) => a.item.name.localeCompare(b.item.name, 'it'))
    case 'name-desc':
      return arr.sort((a, b) => b.item.name.localeCompare(a.item.name, 'it'))
    case 'expiry-asc':
      return arr.sort(byExpiry(1))
    case 'expiry-desc':
      return arr.sort(byExpiry(-1))
    default:
      return arr
  }
}

export function PantryTab({
  inventory, onToggleUrgent, onUpdate, onRemove, onRestore, onMove, onOpenAdd, onGoApiKey,
}) {
  const [section, setSection] = useState('frigo')
  const [sortMode, setSortMode] = useState('priority')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const toast = useToast()

  // Deleting from the list keeps the product around for a few seconds so it can be undone.
  function handleRemove(itemSection, id) {
    const item = inventory[itemSection]?.find(i => i.id === id)
    onRemove(itemSection, id)
    if (item) {
      toast.show({
        message: `${item.name} eliminato`,
        actionLabel: 'Annulla',
        onAction: () => onRestore?.(itemSection, item),
      })
    }
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  function closeSearch() { setSearch(''); setSearchOpen(false) }

  const searchQuery  = search.trim().toLowerCase()
  const searchActive = searchQuery.length > 0

  // Desktop shows one column per section; everywhere else one section at a time
  // (a search always looks across all sections).
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const showColumns = isDesktop && !searchActive

  const pairs = (s) => inventory[s].map(i => ({ item: i, itemSection: s }))
  const displayItems = searchActive
    ? SECTIONS.flatMap(pairs).filter(({ item }) => item.name.toLowerCase().includes(searchQuery))
    : sortPairs(pairs(section), sortMode)

  const useSoonCount = useMemo(() => {
    const only = { credenza: [], frigo: [], freezer: [], [section]: inventory[section] }
    return getPantryCandidates(only).length
  }, [inventory, section])

  const sectionOptions = SECTIONS.map(s => ({ value: s, label: SECTION_LABELS[s], count: inventory[s].length }))
  const keyOk = hasApiKey()

  function renderRows(list, { showSection, query }) {
    return list.map(({ item, itemSection }) => (
      <ItemRow
        key={item.id}
        item={item}
        section={itemSection}
        showSection={showSection}
        searchQuery={query}
        onToggleUrgent={onToggleUrgent}
        onUpdate={onUpdate}
        onRemove={handleRemove}
        onMove={onMove}
      />
    ))
  }

  return (
    <div className={styles.wrap}>
      <PageHeader title="Dispensa">
        <div className={styles.actions}>
          <button type="button" className={styles.iconBtn} onClick={() => setSearchOpen(true)} aria-label="Cerca prodotti">
            <Icon name="search" size={20} />
          </button>
          <div
            className={`${styles.iconBtn} ${styles.sortWrap} ${sortMode !== 'priority' ? styles.sortActive : ''}`}
            title={SORT_LABELS[sortMode]}
          >
            <Icon name="sort" size={20} />
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
      </PageHeader>

      {searchOpen && (
        <div className={styles.searchBar}>
          <div className={styles.searchBarInner}>
            <Icon name="search" size={18} />
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
                type="button"
                className={styles.searchBarClear}
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                aria-label="Cancella testo"
              ><Icon name="close" size={16} /></button>
            )}
          </div>
          <button type="button" className={styles.searchCancel} onClick={closeSearch}>Annulla</button>
        </div>
      )}

      {!searchOpen && !showColumns && (
        <Segmented options={sectionOptions} value={section} onChange={setSection} ariaLabel="Sezione della dispensa" />
      )}

      {showColumns ? (
        <div className={styles.columns}>
          {SECTIONS.map(s => {
            const colItems = sortPairs(pairs(s), sortMode)
            return (
              <section key={s} className={styles.column} aria-label={SECTION_LABELS[s]}>
                <header className={styles.columnHead}>
                  <span className={styles.columnTitle}><SectionIcon section={s} size={18} /> {SECTION_LABELS[s]}</span>
                  <span className={styles.columnCount}>{colItems.length}</span>
                </header>
                <div className={styles.columnList}>
                  {colItems.length === 0
                    ? <p className={styles.columnEmpty}>Vuoto</p>
                    : renderRows(colItems, { showSection: false, query: '' })}
                </div>
              </section>
            )
          })}
        </div>
      ) : displayItems.length === 0 ? (
        searchActive ? (
          <p className={styles.empty}>Nessun risultato per "{search.trim()}"</p>
        ) : (
          <EmptyState
            icon="pantry"
            title={EMPTY_TITLE[section]}
            text="Aggiungi quello che hai: fotografa uno scontrino, detta la spesa o scrivi un prodotto."
          >
            <button
              type="button"
              className={styles.emptyPrimary}
              onClick={() => onOpenAdd('receipt', section)}
              disabled={!keyOk}
            >
              <Icon name="receipt" size={22} /> Fotografa uno scontrino
            </button>
            <div className={styles.emptyRow}>
              <button
                type="button"
                className={styles.emptyYellow}
                onClick={() => onOpenAdd('voice', section)}
                disabled={!keyOk}
              >
                <Icon name="mic" size={20} /> Detta
              </button>
              <button type="button" className={styles.emptyLine} onClick={() => onOpenAdd('sheet', section)}>
                <Icon name="pencil" size={20} /> Scrivi
              </button>
            </div>
            {!keyOk && (
              <button type="button" className={styles.keyHint} onClick={onGoApiKey}>
                Scontrino e voce richiedono la chiave Gemini: impostala in Tu
              </button>
            )}
          </EmptyState>
        )
      ) : (
        <>
          {!searchActive && (
            <div className={styles.summary}>
              <span>
                {inventory[section].length === 1 ? '1 prodotto' : `${inventory[section].length} prodotti`}
                {' '}in {SECTION_LABELS[section].toLowerCase()}
              </span>
              {useSoonCount > 0 && <span className={styles.summaryUrgent}>{useSoonCount} da usare presto</span>}
            </div>
          )}
          <div className={styles.list}>
            {renderRows(displayItems, { showSection: searchActive, query: searchActive ? searchQuery : '' })}
          </div>
        </>
      )}

      <button
        type="button"
        className={`${styles.fab} ${toast.visible ? styles.fabHidden : ''}`}
        onClick={() => onOpenAdd('sheet', section)}
        aria-label="Aggiungi prodotto"
      >
        <Icon name="plus" size={26} strokeWidth={2} />
      </button>
    </div>
  )
}
