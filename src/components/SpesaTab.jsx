import { AITab } from './AITab.jsx'
import { SavedShoppingTab } from './SavedShoppingTab.jsx'
import { PageHeader } from './ui/PageHeader.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { parseShoppingItems } from '../utils/parsers.js'
import styles from './Containers.module.css'

// Spesa = shopping list + AI ideas. Segmented on mobile, side by side on desktop.
export function SpesaTab({ sub, onSubChange, spesa, savedShopping, inventory, onMoveToPantry }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const options = [
    { value: 'lista', label: 'Lista', count: savedShopping.items.length },
    { value: 'idee', label: 'Idee AI' },
  ]

  return (
    <div className={styles.wrap}>
      <PageHeader title="Spesa" />
      {!isDesktop && (
        <Segmented options={options} value={sub} onChange={onSubChange} ariaLabel="Sezione di Spesa" />
      )}

      <div className={`${styles.split} ${styles.splitBoth}`}>
        <div hidden={!isDesktop && sub !== 'lista'}>
          <SavedShoppingTab
            items={savedShopping.items}
            onToggle={savedShopping.toggleChecked}
            onRemove={savedShopping.removeItem}
            onClearChecked={savedShopping.clearChecked}
            onMoveToPantry={onMoveToPantry}
            onAddItem={savedShopping.addItem}
            onUpdateItem={savedShopping.updateItem}
            onAddFromPantry={savedShopping.addItems}
            inventory={inventory}
          />
        </div>
        <div hidden={!isDesktop && sub !== 'idee'}>
          <AITab
            buttonLabel="Genera lista della spesa per questa settimana"
            onFetch={spesa.fetchSpesa}
            loading={spesa.loading}
            messages={spesa.messages}
            streaming={spesa.streaming}
            error={spesa.error}
            cached={spesa.cached}
            onSend={spesa.sendFollowUp}
            parseForSave={parseShoppingItems}
            onSaveItems={savedShopping.addItems}
          />
        </div>
      </div>
    </div>
  )
}
