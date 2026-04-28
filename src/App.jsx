import { useState } from 'react'
import { useInventory } from './hooks/useInventory.js'
import { useAI } from './hooks/useAI.js'
import { PantryTab } from './components/PantryTab.jsx'
import { AITab } from './components/AITab.jsx'
import { SettingsTab } from './components/SettingsTab.jsx'
import styles from './App.module.css'

const TABS = [
  { id: 'dispensa', label: 'Dispensa' },
  { id: 'ricette',  label: 'Ricette AI' },
  { id: 'spesa',    label: 'Spesa Smart' },
  { id: 'settings', label: '⚙' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dispensa')
  const {
    inventory,
    addItem, removeItem, updateItem, toggleUrgent,
    exportCSV, importCSV, getInventoryText,
  } = useInventory()

  const ricette = useAI(getInventoryText, 'ricette')
  const spesa   = useAI(getInventoryText, 'spesa')

  function handleTabChange(id) {
    setActiveTab(id)
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.logo}>cucina smart</h1>
          <nav className={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                onClick={() => handleTabChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === 'dispensa' && (
          <PantryTab
            inventory={inventory}
            onToggleUrgent={toggleUrgent}
            onUpdate={updateItem}
            onRemove={removeItem}
            onAdd={addItem}
          />
        )}
        {activeTab === 'ricette' && (
          <AITab
            buttonLabel="Cosa cucino stasera? Genera ricette con quello che ho"
            onFetch={ricette.fetchRicette}
            loading={ricette.loading}
            messages={ricette.messages}
            streaming={ricette.streaming}
            error={ricette.error}
            cached={ricette.cached}
            onSend={ricette.sendFollowUp}
          />
        )}
        {activeTab === 'spesa' && (
          <AITab
            buttonLabel="Genera lista della spesa per questa settimana"
            onFetch={spesa.fetchSpesa}
            loading={spesa.loading}
            messages={spesa.messages}
            streaming={spesa.streaming}
            error={spesa.error}
            cached={spesa.cached}
            onSend={spesa.sendFollowUp}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab onExport={exportCSV} onImport={importCSV} />
        )}
      </main>
    </div>
  )
}
