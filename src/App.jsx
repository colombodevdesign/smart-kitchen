import { useCallback, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useInventory } from './hooks/useInventory.js'
import { useAI } from './hooks/useAI.js'
import { useSavedRecipes } from './hooks/useSavedRecipes.js'
import { useSavedShopping } from './hooks/useSavedShopping.js'
import { useMealTracker } from './hooks/useMealTracker.js'
import { LoginScreen } from './components/LoginScreen.jsx'
import { PantryTab } from './components/PantryTab.jsx'
import { AITab } from './components/AITab.jsx'
import { SettingsTab } from './components/SettingsTab.jsx'
import { SavedRecipesTab } from './components/SavedRecipesTab.jsx'
import { SavedShoppingTab } from './components/SavedShoppingTab.jsx'
import { MealTrackerTab } from './components/MealTrackerTab.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { BottomNav } from './components/BottomNav.jsx'
import styles from './App.module.css'

const TABS = [
  { id: 'dispensa',        label: 'Dispensa' },
  { id: 'ricette',         label: 'Ricette AI' },
  { id: 'ricette-salvate', label: 'Ricette Salvate' },
  { id: 'spesa',           label: 'Spesa Smart' },
  { id: 'lista-spesa',     label: 'Lista Spesa' },
  { id: 'pasti',           label: 'Tracker Pasti' },
  { id: 'settings',        label: '⚙' },
]

function parseRecipes(text) {
  const parts = text.split(/(?=^## )/m).filter(s => s.trim())
  if (parts.length === 0) return []
  return parts.map((content, i) => {
    const match = content.match(/^## (.+)$/m)
    const title = match ? match[1].trim() : `Ricetta ${i + 1}`
    return { key: `r-${i}-${title}`, label: title, data: { title, content: content.trim() } }
  })
}

function parseShoppingItems(text) {
  const items = []
  let category = 'Generale'
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t.startsWith('## ')) { category = t.slice(3).trim(); continue }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const name = t.slice(2).trim()
      if (name) items.push({ key: `${category}:${name}`, label: name, data: { name, category } })
    }
  }
  return items
}

export default function App() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dispensa')

  const {
    inventory,
    addItem, removeItem, updateItem, toggleUrgent,
    exportCSV, importCSV, clearInventory, getInventoryText,
  } = useInventory(user?.uid ?? null)

  const ricette = useAI(getInventoryText, 'ricette')
  const spesa   = useAI(getInventoryText, 'spesa')

  const savedRecipes   = useSavedRecipes()
  const savedShopping  = useSavedShopping()
  const mealTracker    = useMealTracker()

  const parseRecipesCb  = useCallback(parseRecipes, [])
  const parseShoppingCb = useCallback(parseShoppingItems, [])

  const mainRef = useRef(null)

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [])

  const inRicetteGroup = activeTab === 'ricette' || activeTab === 'ricette-salvate'
  const inSpesaGroup   = activeTab === 'spesa'   || activeTab === 'lista-spesa'

  // user === undefined → Firebase still initializing
  if (user === undefined) {
    return (
      <div className={styles.app}>
        <div className={styles.loadingWrap}>
          <span className={styles.loadingDot} />
        </div>
      </div>
    )
  }

  if (user === null) {
    return <LoginScreen onGoogle={signInWithGoogle} />
  }

  return (
    <div className={styles.app}>
      {/* Tablet: sticky top header with scrollable tabs */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.logo}>smart kitchen</h1>
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

      {/* Desktop: fixed sidebar (hidden on ≤1023px via CSS) */}
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <main ref={mainRef} className={styles.main}>
        {activeTab === 'dispensa' && (
          <PantryTab
            inventory={inventory}
            onToggleUrgent={toggleUrgent}
            onUpdate={updateItem}
            onRemove={removeItem}
            onAdd={addItem}
          />
        )}

        {inRicetteGroup && (
          <>
            <div className={styles.subNav}>
              <button
                className={`${styles.subNavBtn} ${activeTab === 'ricette' ? styles.subNavActive : ''}`}
                onClick={() => handleTabChange('ricette')}
              >
                Genera AI
              </button>
              <button
                className={`${styles.subNavBtn} ${activeTab === 'ricette-salvate' ? styles.subNavActive : ''}`}
                onClick={() => handleTabChange('ricette-salvate')}
              >
                Salvate ({savedRecipes.recipes.length})
              </button>
            </div>
            <div className={styles.splitWrap}>
              <div className={activeTab !== 'ricette' ? styles.hideMobile : ''}>
                <AITab
                  buttonLabel="Cosa cucino stasera? Genera ricette con quello che ho"
                  onFetch={ricette.fetchRicette}
                  loading={ricette.loading}
                  messages={ricette.messages}
                  streaming={ricette.streaming}
                  error={ricette.error}
                  cached={ricette.cached}
                  onSend={ricette.sendFollowUp}
                  parseForSave={parseRecipesCb}
                  onSaveItems={savedRecipes.addRecipes}
                />
              </div>
              <div className={activeTab !== 'ricette-salvate' ? styles.hideMobile : ''}>
                <SavedRecipesTab
                  recipes={savedRecipes.recipes}
                  onRemove={savedRecipes.removeRecipe}
                />
              </div>
            </div>
          </>
        )}

        {inSpesaGroup && (
          <>
            <div className={styles.subNav}>
              <button
                className={`${styles.subNavBtn} ${activeTab === 'spesa' ? styles.subNavActive : ''}`}
                onClick={() => handleTabChange('spesa')}
              >
                Genera AI
              </button>
              <button
                className={`${styles.subNavBtn} ${activeTab === 'lista-spesa' ? styles.subNavActive : ''}`}
                onClick={() => handleTabChange('lista-spesa')}
              >
                Lista ({savedShopping.items.length})
              </button>
            </div>
            <div className={styles.splitWrap}>
              <div className={activeTab !== 'spesa' ? styles.hideMobile : ''}>
                <AITab
                  buttonLabel="Genera lista della spesa per questa settimana"
                  onFetch={spesa.fetchSpesa}
                  loading={spesa.loading}
                  messages={spesa.messages}
                  streaming={spesa.streaming}
                  error={spesa.error}
                  cached={spesa.cached}
                  onSend={spesa.sendFollowUp}
                  parseForSave={parseShoppingCb}
                  onSaveItems={savedShopping.addItems}
                />
              </div>
              <div className={activeTab !== 'lista-spesa' ? styles.hideMobile : ''}>
                <SavedShoppingTab
                  items={savedShopping.items}
                  onToggle={savedShopping.toggleChecked}
                  onRemove={savedShopping.removeItem}
                  onClearChecked={savedShopping.clearChecked}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'pasti' && (
          <MealTrackerTab
            meals={mealTracker.meals}
            onAdd={mealTracker.addMeal}
            onRemove={mealTracker.removeMeal}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            onExport={exportCSV}
            onImport={importCSV}
            onClearInventory={clearInventory}
            onSignOut={signOut}
          />
        )}
      </main>

      {/* Mobile: fixed bottom nav (hidden on ≥601px via CSS) */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
