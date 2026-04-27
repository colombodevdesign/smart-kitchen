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
    inventory, apiKey, saveApiKey,
    addItem, removeItem, updateItem, toggleUrgent,
    exportCSV, getInventoryText,
  } = useInventory()

  const ricette = useAI(apiKey, getInventoryText)
  const spesa   = useAI(apiKey, getInventoryText)

  function handleTabChange(id) {
    setActiveTab(id)
    if (id === 'ricette') ricette.clearOutput()
    if (id === 'spesa')   spesa.clearOutput()
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
            onExport={exportCSV}
          />
        )}
        {activeTab === 'ricette' && (
          <AITab
            buttonLabel="Cosa cucino stasera? Genera ricette con quello che ho"
            onFetch={ricette.fetchRicette}
            loading={ricette.loading}
            output={ricette.output}
            error={ricette.error}
            hasApiKey={!!apiKey}
          />
        )}
        {activeTab === 'spesa' && (
          <AITab
            buttonLabel="Genera lista della spesa per questa settimana"
            onFetch={spesa.fetchSpesa}
            loading={spesa.loading}
            output={spesa.output}
            error={spesa.error}
            hasApiKey={!!apiKey}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab apiKey={apiKey} onSave={saveApiKey} />
        )}
      </main>
    </div>
  )
}
