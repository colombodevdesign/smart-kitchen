import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { PantrySuggestionsModal } from './PantrySuggestionsModal.jsx'
import styles from './SavedShoppingTab.module.css'

const SECTION_OPTIONS = [
  { id: 'frigo',    label: 'Frigo' },
  { id: 'credenza', label: 'Credenza' },
  { id: 'freezer',  label: 'Freezer' },
]

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
          <span className={styles.itemName} onClick={() => !item.checked && startEdit('name')}>
            {item.name}
          </span>
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
        <span className={styles.qty} onClick={() => !item.checked && startEdit('qty')}>{item.qty}</span>
      ) : (
        <span className={styles.qtyEmpty} onClick={() => !item.checked && startEdit('qty')}>+ qty</span>
      )}
      <button className={styles.deleteBtn} onClick={() => onRemove(item.id)} title="Rimuovi">✕</button>
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

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>Lista della Spesa</h2>
        <div className={styles.headerRight}>
          {items.length > 0 && <span className={styles.count}>{remaining} rimanenti</span>}
          <button
            type="button"
            className={styles.pantryBtn}
            onClick={() => setSuggestOpen(true)}
            title="Aggiungi prodotti dalla dispensa"
          >
            + Da dispensa
          </button>
          {checkedCount > 0 && (
            <>
              <button
                className={styles.moveBtn}
                onClick={() => {
                  const initial = {}
                  items.filter(i => i.checked).forEach(item => {
                    initial[item.id] = guessSection(item.category)
                  })
                  setItemSections(initial)
                  setSectionPickerOpen(true)
                }}
              >
                → Dispensa ({checkedCount})
              </button>
              <button className={styles.clearBtn} onClick={onClearChecked}>
                Elimina ({checkedCount})
              </button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p>Lista della spesa vuota.</p>
          <p className={styles.hint}>
            Aggiungi un prodotto qui sotto, pesca dalla dispensa, oppure genera
            suggerimenti dalla scheda <strong>Spesa Smart</strong>.
          </p>
        </div>
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
