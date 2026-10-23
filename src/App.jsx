import { useCallback, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useInventory } from './hooks/useInventory.js'
import { useAI } from './hooks/useAI.js'
import { useSavedRecipes } from './hooks/useSavedRecipes.js'
import { useSavedShopping } from './hooks/useSavedShopping.js'
import { useMealTracker } from './hooks/useMealTracker.js'
import { useApiKeySync } from './hooks/useApiKeySync.js'
import { useNavigation } from './hooks/useNavigation.js'
import { useOnline } from './hooks/useOnline.js'
import { LoginScreen } from './components/LoginScreen.jsx'
import { TodayTab } from './components/TodayTab.jsx'
import { PantryTab } from './components/PantryTab.jsx'
import { CucinaTab } from './components/CucinaTab.jsx'
import { SpesaTab } from './components/SpesaTab.jsx'
import { TuTab } from './components/TuTab.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { BottomNav } from './components/BottomNav.jsx'
import { AddFlow } from './components/AddFlow.jsx'
import { SeasonalRecipesModal } from './components/SeasonalRecipesModal.jsx'
import { useToast } from './components/ui/Toast.jsx'
import { useForegroundPush, useNotificationOpen } from './hooks/useNotifications.js'
import { OfflineBanner } from './components/ui/OfflineBanner.jsx'
import { todayStr } from './utils/date.js'
import { TABS } from './nav/tabs.js'
import styles from './App.module.css'

export default function App() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const nav = useNavigation('oggi')
  const toast = useToast()
  const online = useOnline()
  const mainRef = useRef(null)

  // "In scadenza": from Oggi, the daily notification and its foreground toast.
  const showingExpiring = nav.tab === 'oggi' && nav.detail?.type === 'scadenze'
  const openExpiring = useCallback(() => {
    if (!showingExpiring) {
      nav.go('oggi')
      nav.openDetail({ type: 'scadenze' })
    }
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [showingExpiring, nav.go, nav.openDetail])
  const openFromNotification = useCallback((target) => {
    if (target === 'scadenze') openExpiring()
  }, [openExpiring])
  useForegroundPush(!!user, openFromNotification)
  useNotificationOpen(!!user, openFromNotification)

  // undefined = auth still resolving, null = logged out, string = uid
  const authUid = user === undefined ? undefined : (user?.uid ?? null)

  const {
    inventory,
    addItem, addBatch, removeItem, restoreItem, updateItem, moveItem, toggleUrgent,
    exportCSV, importCSV, clearInventory, getInventoryText,
  } = useInventory(authUid)

  const ricette = useAI(getInventoryText, 'ricette')
  const spesa   = useAI(getInventoryText, 'spesa')
  const stagione = useAI(getInventoryText, 'stagione', { session: false })
  const [seasonalIngredient, setSeasonalIngredient] = useState(null)

  const { saveApiKey } = useApiKeySync(authUid)

  const savedRecipes   = useSavedRecipes(authUid)
  const savedShopping  = useSavedShopping(authUid)
  const mealTracker    = useMealTracker(authUid)

  const handleMoveToPantry = useCallback((assignments) => {
    if (!assignments?.length) return
    addBatch(assignments)
    savedShopping.clearChecked()
  }, [savedShopping.clearChecked, addBatch])

  // Add flow (sheet / voice / receipt) shared by Oggi, Dispensa and the sidebar.
  const [add, setAdd] = useState({ mode: 'closed', section: 'frigo' })
  const openAdd = useCallback((mode = 'sheet', section = 'frigo') => setAdd({ mode, section }), [])
  const closeAdd = useCallback(() => setAdd(a => ({ ...a, mode: 'closed' })), [])
  const switchAdd = useCallback((mode) => setAdd(a => ({ ...a, mode })), [])

  const handleTabChange = useCallback((tabId) => {
    nav.go(tabId)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [nav.go])

  const handleGoApiKey = useCallback(() => {
    closeAdd()
    nav.go('tu')
  }, [closeAdd, nav.go])

  // Saved recipes: put one on tonight's menu / push its missing ingredients to the shopping list.
  const handleCookTonight = useCallback((recipe) => {
    mealTracker.addMeal(todayStr(), {
      text: recipe.title, category: 'cena', recipeId: recipe.id, recipeTitle: recipe.title,
    })
    toast.show({ message: 'Aggiunta ai pasti di stasera', ms: 3000 })
    nav.go('oggi')
  }, [mealTracker.addMeal, toast.show, nav.go])

  const handleAddMissing = useCallback((ingredients) => {
    const already = new Set(savedShopping.items.filter(i => !i.checked).map(i => i.name.trim().toLowerCase()))
    const fresh = ingredients.filter(i => !already.has(i.name.trim().toLowerCase()))
    if (fresh.length === 0) {
      toast.show({ message: 'Sono già tutti nella lista della spesa', ms: 3000 })
      return
    }
    savedShopping.addItems(fresh.map(i => ({ name: i.name, qty: i.qty, category: 'Generale', source: 'recipe' })))
    toast.show({
      message: fresh.length === 1 ? '1 ingrediente aggiunto alla spesa' : `${fresh.length} ingredienti aggiunti alla spesa`,
      actionLabel: 'Vedi',
      onAction: () => nav.go('spesa', 'lista'),
    })
  }, [savedShopping.items, savedShopping.addItems, toast.show, nav.go])

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
    <>
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
        <Sidebar activeTab={nav.tab} onTabChange={handleTabChange} onAdd={() => openAdd('sheet')} />

        <main ref={mainRef} className={styles.main}>
          {!online && <OfflineBanner />}

          {nav.tab === 'oggi' && (
            <TodayTab
              inventory={inventory}
              meals={mealTracker.meals}
              detail={nav.detail}
              onOpenExpiring={openExpiring}
              onCloseDetail={nav.closeDetail}
              onCook={handleCook}
              onSeasonal={setSeasonalIngredient}
              onPlan={() => nav.go('cucina', 'pasti')}
              onSavedRecipes={() => nav.go('cucina', 'salvate')}
              onProfile={() => nav.go('tu')}
              onAdd={() => openAdd('sheet')}
            />
          )}

          {nav.tab === 'dispensa' && (
            <PantryTab
              inventory={inventory}
              onAdd={addItem}
              onToggleUrgent={toggleUrgent}
              onUpdate={updateItem}
              onRemove={removeItem}
              onRestore={restoreItem}
              onMove={moveItem}
              onOpenAdd={openAdd}
              onGoApiKey={handleGoApiKey}
            />
          )}

          {nav.tab === 'cucina' && (
            <CucinaTab
              sub={nav.sub.cucina}
              onSubChange={v => nav.setSubView('cucina', v)}
              ricette={ricette}
              savedRecipes={savedRecipes}
              mealTracker={mealTracker}
              inventory={inventory}
              onGoApiKey={handleGoApiKey}
              detailId={nav.detail?.type === 'recipe' ? nav.detail.id : null}
              onOpenRecipe={(id) => nav.openDetail({ type: 'recipe', id })}
              onCloseDetail={nav.closeDetail}
              onCookTonight={handleCookTonight}
              onAddMissing={handleAddMissing}
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
              onGoApiKey={handleGoApiKey}
            />
          )}

          {nav.tab === 'tu' && (
            <TuTab
              user={user}
              online={online}
              detail={nav.detail}
              onOpenNotifications={() => nav.openDetail({ type: 'notifiche' })}
              onCloseDetail={nav.closeDetail}
              onExport={exportCSV}
              onImport={importCSV}
              onClearInventory={clearInventory}
              onSignOut={signOut}
              onSaveApiKey={saveApiKey}
            />
          )}
        </main>

        <SeasonalRecipesModal
          ingredient={seasonalIngredient}
          ai={stagione}
          onClose={() => setSeasonalIngredient(null)}
          onSave={savedRecipes.addRecipes}
          onGoApiKey={handleGoApiKey}
        />

        <AddFlow
          state={add}
          onClose={closeAdd}
          onSwitch={switchAdd}
          onAdd={addItem}
          onAddBatch={addBatch}
          onGoApiKey={handleGoApiKey}
        />

        {/* Mobile: bottom nav (hidden on ≥601px via CSS, and in detail views) */}
        {!nav.detail && <BottomNav activeTab={nav.tab} onTabChange={handleTabChange} />}
      </div>
    </>
  )
}
