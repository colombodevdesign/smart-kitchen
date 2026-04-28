import styles from './SavedShoppingTab.module.css'

export function SavedShoppingTab({ items, onToggle, onRemove, onClearChecked }) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Lista della spesa vuota.</p>
        <p className={styles.hint}>Genera suggerimenti con l'AI e salvali dalla scheda <strong>Spesa Smart</strong>.</p>
      </div>
    )
  }

  const grouped = {}
  for (const item of items) {
    const cat = item.category ?? 'Generale'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  const checkedCount = items.filter(i => i.checked).length
  const remaining = items.length - checkedCount

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>Lista della Spesa</h2>
        <div className={styles.headerRight}>
          <span className={styles.count}>{remaining} rimanenti</span>
          {checkedCount > 0 && (
            <button className={styles.clearBtn} onClick={onClearChecked}>
              Elimina acquistati ({checkedCount})
            </button>
          )}
        </div>
      </div>

      <div className={styles.categories}>
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className={styles.category}>
            <h3 className={styles.catTitle}>{cat}</h3>
            <ul className={styles.itemList}>
              {catItems.map(item => (
                <li key={item.id} className={`${styles.item} ${item.checked ? styles.checked : ''}`}>
                  <label className={styles.itemLabel}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onToggle(item.id)}
                      className={styles.checkbox}
                    />
                    <span className={styles.itemName}>{item.name}</span>
                  </label>
                  <button className={styles.deleteBtn} onClick={() => onRemove(item.id)} title="Rimuovi">✕</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
