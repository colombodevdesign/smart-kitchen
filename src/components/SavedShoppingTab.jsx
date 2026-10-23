import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { PantrySuggestionsModal } from './PantrySuggestionsModal.jsx'
import { Icon } from './ui/Icon.jsx'
import { EmptyState } from './ui/EmptyState.jsx'
import { getPantryCandidates } from '../utils/pantry.js'
import { SECTION_LABELS } from '../data/initialInventory.js'
import { toDateStr } from '../utils/date.js'
import styles from './SavedShoppingTab.module.css'

const SECTION_OPTIONS = [
  { id: 'frigo',    label: 'Frigo' },
  { id: 'credenza', label: 'Credenza' },
  { id: 'freezer',  label: 'Freezer' },
]

// The "stanno per scadere" banner can be hidden; it comes back the next day.
const BANNER_DISMISS_KEY = 'sk-expiring-banner-dismissed'

function todayKey() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function readDismissed() {
  try { return localStorage.getItem(BANNER_DISMISS_KEY) === todayKey() } catch { return false }
}

const FREEZER_RE = /freezer|surgelat|congelat/i
const FRIGO_RE   = /frigo|latticin|freschi|ortofrutta|verdura|frutta|carne|pesce|salumi|formagg|uova|banco|yogurt|affettat/i

function guessSection(category) {
  const c = category ?? ''
  if (FREEZER_RE.test(c)) return 'freezer'
  if (FRIGO_RE.test(c)) return 'frigo'
  return 'credenza'
}

const NEW_CATEGORY_KEY = '__new__'

function ShoppingItemRow({ item, onToggle, onRemove, onUpdate }) {
  const [editingField, setEditingField] = useState(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingField])

  function startEdit(field) {
    setDraft(item[field] || '')
    setEditingField(field)
  }

  function confirm() {
    if (!editingField) return
    const value = draft.trim()
    if (editingField === 'name') {
      if (value && value !== item.name) onUpdate(item.id, { name: value })
    } else if (editingField === 'qty') {
      if (value !== (item.qty || '')) onUpdate(item.id, { qty: value })
    }
    setEditingField(null)
  }

  function cancel() { setEditingField(null) }

  function onKeyDown(e) {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') cancel()
  }

  return (
    <li className={`${styles.item} ${item.checked ? styles.checked : ''} ${editingField ? styles.editing : ''}`}>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        className={styles.checkbox}
        aria-label={`Segna ${item.name}`}
      />
      <div className={styles.itemMain}>
        {editingField === 'name' ? (
          <input
            ref={inputRef}
            className={styles.nameInput}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(confirm, 120)}
          />
        ) : (
          <button type="button" className={styles.itemName} disabled={item.checked} onClick={() => startEdit('name')}>
            {item.name}
          </button>
        )}
      </div>
      {editingField === 'qty' ? (
        <input
          ref={inputRef}
          className={styles.qtyInput}
          value={draft}
          placeholder="es. 500g"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(confirm, 120)}
        />
      ) : item.qty ? (
        <button type="button" className={styles.qty} disabled={item.checked} onClick={() => startEdit('qty')}>{item.qty}</button>
      ) : (
        <button type="button" className={styles.qtyEmpty} disabled={item.checked} onClick={() => startEdit('qty')}>+ quantità</button>
      )}
      <button type="button" className={styles.deleteBtn} onClick={() => onRemove(item.id)} aria-label={`Rimuovi ${item.name}`}>
        <Icon name="close" size={16} />
      </button>
    </li>
  )
}

export function SavedShoppingTab({
  items,
  onToggle,
  onRemove,
  onClearChecked,
  onMoveToPantry,
  onAddItem,
  onUpdateItem,
  onAddFromPantry,
  inventory,
}) {
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newCategory, setNewCategory] = useState('Generale')
  const [customCategoryMode, setCustomCategoryMode] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(readDismissed)
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false)
  const [itemSections, setItemSections] = useState({})
  const nameInputRef = useRef(null)

  const existingCategories = useMemo(() => {
    const set = new Set(['Generale', ...items.map(i => i.category ?? 'Generale')])
    return [...set]
  }, [items])

  function handleCategoryChange(e) {
    const value = e.target.value
    if (value === NEW_CATEGORY_KEY) {
      setCustomCategoryMode(true)
      setCustomCategory('')
    } else {
      setNewCategory(value)
    }
  }

  function handleAdd() {
    if (!newName.trim()) return
    const category = customCategoryMode
      ? (customCategory.trim() || 'Generale')
      : newCategory
    onAddItem({ name: newName, qty: newQty, category, source: 'manual' })
    setNewName('')
    setNewQty('')
    if (customCategoryMode) {
      setNewCategory(category)
      setCustomCategoryMode(false)
      setCustomCategory('')
    }
    nameInputRef.current?.focus()
  }

  const grouped = useMemo(() => {
    const g = {}
    for (const item of items) {
      const cat = item.category ?? 'Generale'
      if (!g[cat]) g[cat] = []
      g[cat].push(item)
    }
    return g
  }, [items])

  const checkedCount = items.filter(i => i.checked).length
  const remaining = items.length - checkedCount

  // Pantry products that are expiring or opened and not already on the list.
  const candidates = useMemo(() => {
    const names = new Set(items.filter(i => !i.checked).map(i => i.name.trim().toLowerCase()))
    return getPantryCandidates(inventory, names)
  }, [inventory, items])

  function addAllCandidates() {
    onAddFromPantry(candidates.map(c => ({
      name: c.name, qty: c.qty, category: SECTION_LABELS[c.section], source: 'pantry',
    })))
  }

  function dismissBanner() {
    setBannerDismissed(true)
    try { localStorage.setItem(BANNER_DISMISS_KEY, todayKey()) } catch { /* private mode: hidden until reload */ }
  }

  function openMovePicker() {
    const initial = {}
    items.filter(i => i.checked).forEach(item => { initial[item.id] = guessSection(item.category) })
    setItemSections(initial)
    setSectionPickerOpen(true)
  }

  return (
    <div className={styles.wrap}>
      {items.length > 0 && <p className={styles.summary}>{remaining} {remaining === 1 ? 'rimanente' : 'rimanenti'}</p>}

      {candidates.length > 0 && !bannerDismissed && (
        <section className={styles.suggest} aria-label="Prodotti che stanno per scadere">
          <div className={styles.suggestText}>
            <strong>
              {candidates.length === 1 ? '1 prodotto sta' : `${candidates.length} prodotti stanno`} per scadere
            </strong>
            <span className={styles.suggestNames}>{candidates.slice(0, 3).map(c => c.name).join(', ')}{candidates.length > 3 ? '…' : ''}</span>
            <div className={styles.suggestActions}>
              <button type="button" className={styles.suggestAdd} onClick={addAllCandidates}>Aggiungi tutti</button>
              <button type="button" className={styles.suggestPick} onClick={() => setSuggestOpen(true)}>Scegli</button>
            </div>
          </div>
          <button type="button" className={styles.suggestClose} onClick={dismissBanner} aria-label="Nascondi suggerimento">
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </section>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="cart"
          title="Lista della spesa vuota"
          text="Aggiungi un prodotto qui sotto, riprendi quelli che stanno per scadere o genera idee dalla scheda Idee AI."
        />
      ) : (
        <div className={styles.categories}>
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className={styles.category}>
              <h3 className={styles.catTitle}>{cat}</h3>
              <ul className={styles.itemList}>
                {catItems.map(item => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onRemove={onRemove}
                    onUpdate={onUpdateItem}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {checkedCount > 0 && (
        <div className={styles.actionBar}>
          <button type="button" className={styles.moveBtn} onClick={openMovePicker}>
            <Icon name="check" size={20} strokeWidth={2} /> Sposta {checkedCount} in dispensa
          </button>
          <button type="button" className={styles.clearBtn} onClick={onClearChecked} aria-label={`Elimina ${checkedCount} prodotti spuntati`}>
            <Icon name="trash" size={20} />
          </button>
        </div>
      )}

      <div className={styles.addBar}>
        <div className={styles.addRow}>
          <input
            ref={nameInputRef}
            className={styles.addName}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nome prodotto…"
            aria-label="Nome prodotto"
          />
          <input
            className={styles.addQty}
            value={newQty}
            onChange={e => setNewQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Quantità"
            aria-label="Quantità"
          />
          {customCategoryMode ? (
            <input
              className={styles.addCategory}
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setCustomCategoryMode(false); setCustomCategory('') }
              }}
              placeholder="Nuova categoria"
              aria-label="Nuova categoria"
              autoFocus
            />
          ) : (
            <select
              className={styles.addCategory}
              value={newCategory}
              onChange={handleCategoryChange}
              aria-label="Categoria"
            >
              {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value={NEW_CATEGORY_KEY}>+ Nuova categoria…</option>
            </select>
          )}
          <button type="button" className={styles.addBtn} onClick={handleAdd}>+ Aggiungi</button>
        </div>
      </div>

      <PantrySuggestionsModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        inventory={inventory}
        existingItems={items}
        onAdd={onAddFromPantry}
      />

      <Modal
        open={sectionPickerOpen}
        onClose={() => setSectionPickerOpen(false)}
        title="Sposta in dispensa"
        footer={
          <button
            className={styles.confirmBtn}
            onClick={() => {
              const assignments = items
                .filter(i => i.checked)
                .map(item => ({ name: item.name, qty: item.qty, section: itemSections[item.id] ?? 'credenza' }))
              onMoveToPantry(assignments)
              setSectionPickerOpen(false)
            }}
          >
            Aggiungi {checkedCount} {checkedCount === 1 ? 'prodotto' : 'prodotti'} alla dispensa
          </button>
        }
      >
        <div className={styles.assignmentList}>
          {items.filter(i => i.checked).map(item => (
            <div key={item.id} className={styles.assignmentRow}>
              <span className={styles.assignmentName}>
                {item.name}
                {item.qty && <span className={styles.assignmentQty}> {item.qty}</span>}
              </span>
              <div className={styles.sectionToggle}>
                {SECTION_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={itemSections[item.id] === s.id}
                    className={`${styles.sectionOption} ${itemSections[item.id] === s.id ? styles.sectionOptionActive : ''}`}
                    onClick={() => setItemSections(prev => ({ ...prev, [item.id]: s.id }))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
