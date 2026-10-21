import { useCallback, useRef } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useInventory } from './hooks/useInventory.js'
import { useAI } from './hooks/useAI.js'
import { useSavedRecipes } from './hooks/useSavedRecipes.js'
import { useSavedShopping } from './hooks/useSavedShopping.js'
import { useMealTracker } from './hooks/useMealTracker.js'
import { useNavigation } from './hooks/useNavigation.js'
import { LoginScreen } from './components/LoginScreen.jsx'
import { TodayTab } from './components/TodayTab.jsx'
import { PantryTab } from './components/PantryTab.jsx'
import { CucinaTab } from './components/CucinaTab.jsx'
import { SpesaTab } from './components/SpesaTab.jsx'
import { TuTab } from './components/TuTab.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { BottomNav } from './components/BottomNav.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { TABS } from './nav/tabs.js'
import styles from './App.module.css'

export default function App() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const nav = useNavigation('oggi')

  // undefined = auth still resolving, null = logged out, string = uid
  const authUid = user === undefined ? undefined : (user?.uid ?? null)

  const {
    inventory,
    addItem, addBatch, removeItem, restoreItem, updateItem, moveItem, toggleUrgent,
    exportCSV, importCSV, clearInventory, getInventoryText,
  } = useInventory(authUid)

  const ricette = useAI(getInventoryText, 'ricette')
  const spesa   = useAI(getInventoryText, 'spesa')

  const savedRecipes   = useSavedRecipes(authUid)
  const savedShopping  = useSavedShopping(authUid)
  const mealTracker    = useMealTracker(authUid)

  const handleMoveToPantry = useCallback((assignments) => {
    if (!assignments?.length) return
    addBatch(assignments)
    savedShopping.clearChecked()
  }, [savedShopping.clearChecked, addBatch])

  const mainRef = useRef(null)

  const handleTabChange = useCallback((tabId) => {
    nav.go(tabId)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [nav.go])

  // "Cosa cucino con questi?": open Cucina and generate straight away.
  const handleCook = useCallback(() => {
    nav.go('cucina', 'ricette')
    if (mainRef.current) mainRef.current.scrollTop = 0
    ricette.fetchRicette()
  }, [nav.go, ricette.fetchRicette])

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
    <ToastProvider>
      <div className={styles.app} data-detail={nav.detail ? 'true' : undefined}>
        {/* Tablet: sticky top header with scrollable tabs */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <h1 className={styles.logo}>smart kitchen</h1>
            <nav className={styles.tabs} aria-label="Navigazione principale">
              {TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.tab} ${nav.tab === t.id ? styles.tabActive : ''}`}
                  aria-current={nav.tab === t.id ? 'page' : undefined}
                  onClick={() => handleTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Desktop: fixed sidebar (hidden on ≤1023px via CSS) */}
        <Sidebar activeTab={nav.tab} onTabChange={handleTabChange} />

        <main ref={mainRef} className={styles.main}>
          {nav.tab === 'oggi' && (
            <TodayTab
              inventory={inventory}
              meals={mealTracker.meals}
              onCook={handleCook}
              onPlan={() => nav.go('cucina', 'pasti')}
              onSavedRecipes={() => nav.go('cucina', 'salvate')}
              onProfile={() => nav.go('tu')}
            />
          )}

          {nav.tab === 'dispensa' && (
            <PantryTab
              inventory={inventory}
              onToggleUrgent={toggleUrgent}
              onUpdate={updateItem}
              onRemove={removeItem}
              onRestore={restoreItem}
              onAdd={addItem}
              onAddBatch={addBatch}
              onMove={moveItem}
            />
          )}

          {nav.tab === 'cucina' && (
            <CucinaTab
              sub={nav.sub.cucina}
              onSubChange={v => nav.setSubView('cucina', v)}
              ricette={ricette}
              savedRecipes={savedRecipes}
              mealTracker={mealTracker}
            />
          )}

          {nav.tab === 'spesa' && (
            <SpesaTab
              sub={nav.sub.spesa}
              onSubChange={v => nav.setSubView('spesa', v)}
              spesa={spesa}
              savedShopping={savedShopping}
              inventory={inventory}
              onMoveToPantry={handleMoveToPantry}
            />
          )}

          {nav.tab === 'tu' && (
            <TuTab
              user={user}
              onExport={exportCSV}
              onImport={importCSV}
              onClearInventory={clearInventory}
              onSignOut={signOut}
            />
          )}
        </main>

        {/* Mobile: bottom nav (hidden on ≥601px via CSS, and in detail views) */}
        {!nav.detail && <BottomNav activeTab={nav.tab} onTabChange={handleTabChange} />}
      </div>
    </ToastProvider>
  )
}
