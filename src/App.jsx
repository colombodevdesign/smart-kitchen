import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth.js'
import { useInventory } from './hooks/useInventory.js'
import { usePantryAnalysis } from './hooks/usePantryAnalysis.js'
import { useAI } from './hooks/useAI.js'
import { useSavedRecipes } from './hooks/useSavedRecipes.js'
import { useSavedShopping } from './hooks/useSavedShopping.js'
import { useMealTracker } from './hooks/useMealTracker.js'
import { useMealPrefs } from './hooks/useMealPrefs.js'
import { usePreferences } from './hooks/usePreferences.js'
import { useChat } from './hooks/useChat.js'
import { useApiKeySync } from './hooks/useApiKeySync.js'
import { useNavigation } from './hooks/useNavigation.js'
import { useNotificationInbox } from './hooks/useNotificationInbox.js'
import { useMediaQuery } from './hooks/useMediaQuery.js'
import { useOnline } from './hooks/useOnline.js'
import { LoginScreen } from './components/LoginScreen.jsx'
import { SplashScreen } from './components/SplashScreen.jsx'
import { TodayTab } from './components/TodayTab.jsx'
import { PantryTab } from './components/PantryTab.jsx'
import { CucinaTab } from './components/CucinaTab.jsx'
import { SpesaTab } from './components/SpesaTab.jsx'
import { TuTab } from './components/TuTab.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { BottomNav } from './components/BottomNav.jsx'
import { AddFlow } from './components/AddFlow.jsx'
import { SeasonalRecipesModal } from './components/SeasonalRecipesModal.jsx'
import { NotificationInbox } from './components/NotificationInbox.jsx'
import { NotificationPanel } from './components/NotificationPanel.jsx'
import { ChatAssistant } from './components/ChatAssistant.jsx'
import { ChatFab } from './components/ChatFab.jsx'
import { useToast } from './components/ui/Toast.jsx'
import { useForegroundPush, useNotificationOpen } from './hooks/useNotifications.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
import { ShortcutsHelp } from './components/ShortcutsHelp.jsx'
import { OfflineBanner } from './components/ui/OfflineBanner.jsx'
import { MockBanner } from './components/ui/MockBanner.jsx'
import { MOCK_MODE } from './mock/mode.js'
import { todayStr } from './utils/date.js'
import { isFood } from './utils/pantry.js'
import { isPlanned } from './utils/meals.js'
import { SECTIONS, SECTION_LABELS } from './data/initialInventory.js'
import { hasApiKey } from './utils/apiKey.js'
import { shouldShowSplash, endSplash } from './utils/splash.js'
import { TABS } from './nav/tabs.js'
import styles from './App.module.css'

// How long the 'reveal' entrance in App.module.css needs (delay + duration, with margin).
const REVEAL_MS = 900

export default function App() {
  const [splash, setSplash] = useState(shouldShowSplash)
  const [authResolved, setAuthResolved] = useState(false)
  // While the splash leaves, the page underneath settles into place (data-motion 'reveal').
  const [revealing, setRevealing] = useState(false)
  const leaveSplash = useCallback(() => {
    endSplash()
    setRevealing(true)
  }, [])
  const closeSplash = useCallback(() => setSplash(false), [])
  const onAuthResolved = useCallback(() => setAuthResolved(true), [])

  useEffect(() => {
    if (!revealing) return undefined
    const id = setTimeout(() => setRevealing(false), REVEAL_MS)
    return () => clearTimeout(id)
  }, [revealing])

  // With the splash, the app mounts one frame later and in a transition: the splash
  // animations are already running and React renders the (heavy) app in slices,
  // leaving room for the frames of the logo morph.
  const [appMounted, setAppMounted] = useState(!splash)
  useEffect(() => {
    if (appMounted) return undefined
    const id = requestAnimationFrame(() => startTransition(() => setAppMounted(true)))
    return () => cancelAnimationFrame(id)
  }, [appMounted])

  return (
    <>
      {appMounted && <AppContent onAuthResolved={onAuthResolved} revealing={revealing} />}
      {splash && <SplashScreen ready={authResolved} onLeave={leaveSplash} onDone={closeSplash} />}
    </>
  )
}

function AppContent({ onAuthResolved, revealing }) {
  const { user: authUser, signInWithGoogle, signOut } = useAuth()
  // The whole app re-renders when auth resolves: deferred, so React does it in slices
  // (it usually happens while the startup animation is playing).
  const user = useDeferredValue(authUser)
  // La splash di avvio aspetta che Firebase abbia deciso se c'è un utente.
  useEffect(() => {
    if (user !== undefined) onAuthResolved()
  }, [user, onAuthResolved])
  const nav = useNavigation('oggi')
  const toast = useToast()
  const online = useOnline()
  const mainRef = useRef(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // undefined = auth still resolving, null = logged out, string = uid
  const authUid = user === undefined ? undefined : (user?.uid ?? null)

  // Notification centre: page on mobile (detail of Oggi), panel off the sidebar on desktop.
  const inbox = useNotificationInbox(authUid)
  const [panelOpen, setPanelOpen] = useState(false)

  // "In scadenza": from Oggi, the daily notification and its foreground toast.
  const showingExpiring = nav.tab === 'oggi' && nav.detail?.type === 'scadenze'
  const openExpiring = useCallback(() => {
    if (!showingExpiring) {
      nav.go('oggi')
      nav.openDetail({ type: 'scadenze' })
    }
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [showingExpiring, nav.go, nav.openDetail])
  const openNotificationSettings = useCallback(() => {
    setPanelOpen(false)
    nav.go('tu')
    nav.openDetail({ type: 'notifiche' })
  }, [nav.go, nav.openDetail])
  // A view of the app named by a push or a notification centre entry (`open`);
  // `nid` is that entry, marked read.
  const openFromNotification = useCallback((target, nid) => {
    if (nid) inbox.markRead(nid)
    if (target === 'scadenze') openExpiring()
    else if (target === 'pasti') {
      nav.go('cucina', 'pasti')
      if (mainRef.current) mainRef.current.scrollTop = 0
    } else if (target === 'impostazioni') openNotificationSettings()
  }, [openExpiring, openNotificationSettings, nav.go, inbox.markRead])
  const openNotificationEntry = useCallback((entry) => {
    setPanelOpen(false)
    openFromNotification(entry.open, entry.id)
  }, [openFromNotification])
  const openNotifications = useCallback(() => {
    if (isDesktop) { setPanelOpen(o => !o); return }
    if (nav.tab === 'oggi' && nav.detail?.type === 'inbox') return
    nav.go('oggi')
    nav.openDetail({ type: 'inbox' })
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [isDesktop, nav.tab, nav.detail, nav.go, nav.openDetail])
  useForegroundPush(!!user && !MOCK_MODE, openFromNotification)
  useNotificationOpen(!!user && !MOCK_MODE, openFromNotification)

  const {
    inventory,
    addItem, addBatch, removeItem, restoreItem, updateItem, moveItem, toggleUrgent,
    applyAnalysis, setCategory,
    exportCSV, importCSV, clearInventory, getInventoryText,
  } = useInventory(authUid)
  // Hidden AI metadata (category, shelf life) for every product, in the background.
  usePantryAnalysis(user ? inventory : null, applyAnalysis)

  // Food preferences: part of every AI prompt (recipes, shopping, seasonal, chat).
  const preferences = usePreferences(authUid)
  const ricette = useAI(getInventoryText, 'ricette', { preferences: preferences.items })
  const spesa   = useAI(getInventoryText, 'spesa', { preferences: preferences.items })
  const stagione = useAI(getInventoryText, 'stagione', { session: false, preferences: preferences.items })
  const [seasonalIngredient, setSeasonalIngredient] = useState(null)

  const { saveApiKey } = useApiKeySync(authUid)

  const savedRecipes   = useSavedRecipes(authUid)
  const savedShopping  = useSavedShopping(authUid)
  const mealTracker    = useMealTracker(authUid)
  const { prefs: mealPrefs } = useMealPrefs(authUid)

  // The assistant chat reads the user's context when a message is sent, never
  // from an older render: the ref always holds the latest state.
  const contextRef = useRef(null)
  contextRef.current = {
    inventory, meals: mealTracker.meals, savedRecipes: savedRecipes.recipes, shopping: savedShopping.items,
    preferences: { items: preferences.items, dismissed: preferences.dismissed }, mealTimes: mealPrefs.times,
  }
  const getContextInputs = useCallback(() => contextRef.current, [])
  const chat = useChat(authUid, getContextInputs)
  const [chatOpen, setChatOpen] = useState(false)

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

  // Low priority: the menu highlight (urgent) starts sliding before the new page renders.
  const handleTabChange = useCallback((tabId) => {
    startTransition(() => nav.go(tabId))
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [nav.go])

  const handleGoApiKey = useCallback(() => {
    closeAdd()
    if (!isDesktop) setChatOpen(false)
    nav.go('tu')
  }, [closeAdd, nav.go, isDesktop])

  // Saved recipes: plan one for tonight's dinner / push its missing ingredients to the shopping list.
  const handleCookTonight = useCallback((recipe) => {
    mealTracker.addMeal(todayStr(), {
      text: recipe.title, category: 'cena', recipeId: recipe.id, recipeTitle: recipe.title,
      planned: true, time: mealPrefs.times.cena, reminder: mealPrefs.enabled ? { lead: mealPrefs.lead } : null,
    })
    toast.show({ message: 'In programma per stasera', ms: 3000 })
    nav.go('oggi')
  }, [mealTracker.addMeal, mealPrefs.times.cena, mealPrefs.enabled, mealPrefs.lead, toast.show, nav.go])

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

  // Assistant chat: open/close, where its "Vedi" links go, and the actions it proposes.
  const openChat = useCallback(() => {
    setPanelOpen(false)
    setChatOpen(true)
  }, [])
  const closeChat = useCallback(() => setChatOpen(false), [])
  const openFromChat = useCallback((target) => {
    if (!isDesktop) setChatOpen(false)
    if (target === 'spesa') nav.go('spesa', 'lista')
    else if (target === 'pasti') nav.go('cucina', 'pasti')
    else if (target === 'preferenze') {
      nav.go('tu')
      nav.openDetail({ type: 'preferenze' })
    }
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [isDesktop, nav.go, nav.openDetail])

  const handleChatAction = useCallback((chatId, msgId, index, action, decision) => {
    const set = (patch) => chat.updateAction(chatId, msgId, index, patch)
    if (decision === 'dismiss') {
      if (action.type === 'preferenza') preferences.dismiss(action.text)
      set({ status: 'dismissed' })
      return
    }
    if (decision === 'undo') {
      if (action.type === 'rimuovi' && action.removed) restoreItem(action.removed.section, action.removed.item)
      set({ status: 'pending', removed: null })
      return
    }
    if (action.type === 'spesa') {
      handleAddMissing(action.items)
      set({ status: 'done' })
    } else if (action.type === 'pasto') {
      const planned = action.date >= todayStr()
      const recipe = savedRecipes.recipes.find(r => r.title?.trim().toLowerCase() === action.text.trim().toLowerCase())
      mealTracker.addMeal(action.date, {
        text: action.text, category: action.category,
        recipeId: recipe?.id ?? null, recipeTitle: recipe?.title ?? null,
        ...(planned ? { planned: true, time: action.time, reminder: mealPrefs.enabled ? { lead: mealPrefs.lead } : null } : {}),
      })
      set({ status: 'done' })
    } else if (action.type === 'rimuovi') {
      // Same name first, then a name that contains it ("yogurt" → "Yogurt greco").
      const name = action.name.trim().toLowerCase()
      const sections = action.section ? [action.section, ...SECTIONS.filter(x => x !== action.section)] : SECTIONS
      const find = (match) => {
        for (const section of sections) {
          const item = inventory[section].find(i => match(i.name.trim().toLowerCase()))
          if (item) return { section, item }
        }
        return null
      }
      const found = find(n => n === name) ?? find(n => n.includes(name) || name.includes(n))
      if (!found) { set({ status: 'missing' }); return }
      removeItem(found.section, found.item.id)
      set({ status: 'done', removed: found })
      toast.show({
        message: `${found.item.name} tolto da ${SECTION_LABELS[found.section]}`,
        actionLabel: 'Annulla',
        onAction: () => { restoreItem(found.section, found.item); set({ status: 'pending', removed: null }) },
      })
    } else if (action.type === 'preferenza') {
      preferences.add({ kind: action.kind, text: action.text, source: 'chat' })
      set({ status: 'done' })
    }
  }, [chat.updateAction, preferences.add, preferences.dismiss, handleAddMissing, savedRecipes.recipes, mealTracker.addMeal,
    mealPrefs.enabled, mealPrefs.lead, inventory, removeItem, restoreItem, toast.show])

  const handleDeleteChat = useCallback((c) => {
    chat.deleteChat(c.id)
    toast.show({ message: 'Chat eliminata', actionLabel: 'Annulla', onAction: () => chat.restoreChat(c) })
  }, [chat.deleteChat, chat.restoreChat, toast.show])

  const handleSaveChatRecipe = useCallback((recipe) => {
    savedRecipes.addRecipes([recipe])
    toast.show({ message: 'Ricetta salvata', actionLabel: 'Vedi', onAction: () => { if (!isDesktop) setChatOpen(false); nav.go('cucina', 'salvate') } })
  }, [savedRecipes.addRecipes, toast.show, isDesktop, nav.go])

  const today = todayStr()
  const chatSummary = {
    products: SECTIONS.reduce((n, s) => n + inventory[s].filter(isFood).length, 0),
    planned: Object.entries(mealTracker.meals ?? {})
      .filter(([d]) => d >= today)
      .reduce((n, [, list]) => n + (list ?? []).filter(isPlanned).length, 0),
    toBuy: savedShopping.items.filter(i => !i.checked).length,
    prefs: preferences.items.length,
  }
  const savedTitles = new Set(savedRecipes.recipes.map(r => r.title?.trim().toLowerCase()))

  // "Cosa cucino con questi?": open Cucina and generate straight away.
  const handleCook = useCallback(() => {
    nav.go('cucina', 'ricette')
    if (mainRef.current) mainRef.current.scrollTop = 0
    ricette.fetchRicette()
  }, [nav.go, ricette.fetchRicette])

  // Keyboard shortcuts (desktop). Voice and receipt import need the Gemini key, like their buttons.
  // Section on screen in Dispensa (expanded section on desktop, selected tab otherwise):
  // "N", "S", "V" and the sidebar button add there instead of the default (frigo).
  const [pantryView, setPantryView] = useState(null)
  const openAddHere = useCallback((mode) => openAdd(mode, pantryView ?? undefined), [openAdd, pantryView])

  const [helpOpen, setHelpOpen] = useState(false)
  const [pantrySearch, setPantrySearch] = useState(false)
  const clearPantrySearch = useCallback(() => setPantrySearch(false), [])
  // true ("P": a new meal) or { recipeId } ("Pianifica" on a saved recipe).
  const [mealRequested, setMealRequested] = useState(false)
  const clearMealRequested = useCallback(() => setMealRequested(false), [])
  const planRecipe = useCallback((recipeId) => setMealRequested({ recipeId }), [])

  const needsKey = (fn) => () => {
    if (hasApiKey()) fn()
    else toast.show({ message: 'Serve la chiave Gemini', actionLabel: 'Impostala', onAction: handleGoApiKey })
  }

  useKeyboardShortcuts({
    ...Object.fromEntries(TABS.map((t, i) => [String(i + 1), () => handleTabChange(t.id)])),
    n: () => openAddHere('sheet'),
    v: needsKey(() => openAddHere('voice')),
    s: needsKey(() => openAddHere('receipt')),
    c: () => (ricette.loading ? handleTabChange('cucina') : handleCook()),
    p: () => { nav.go('cucina', 'pasti'); setMealRequested(true) },
    '\\': () => { handleTabChange('dispensa'); setPantrySearch(true) },
    '?': () => setHelpOpen(true),
    b: openNotifications,
    a: () => (isDesktop && chatOpen ? closeChat() : openChat()),
    Escape: () => { if (nav.detail) nav.closeDetail() },
  }, !!user)

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
      <div className={styles.app} data-detail={nav.detail ? 'true' : undefined} data-chat={isDesktop && chatOpen ? 'open' : undefined}>
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
        <Sidebar
          activeTab={nav.tab}
          onTabChange={handleTabChange}
          onAdd={() => openAddHere('sheet')}
          onShortcuts={() => setHelpOpen(true)}
          unread={inbox.unread}
          notificationsOpen={panelOpen}
          onNotifications={() => setPanelOpen(o => !o)}
          assistantOpen={chatOpen}
          onAssistant={() => (chatOpen ? closeChat() : openChat())}
        />
        {isDesktop && (
          <NotificationPanel
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            user={user}
            inbox={inbox}
            onOpen={openNotificationEntry}
            onCook={(entry) => { inbox.markRead(entry.id); setPanelOpen(false); handleCook() }}
            onSettings={openNotificationSettings}
          />
        )}

        <main ref={mainRef} className={styles.main}>
          {MOCK_MODE && <MockBanner />}
          {!online && <OfflineBanner />}

          {/* No box of its own: only carries the direction of the last navigation for the entrance animation (App.module.css). */}
          <div className={styles.page} data-motion={nav.motion === 'none' && revealing ? 'reveal' : nav.motion}>
          {nav.tab === 'oggi' && nav.detail?.type === 'inbox' && (
            <NotificationInbox
              user={user}
              inbox={inbox}
              onBack={nav.closeDetail}
              onOpen={openNotificationEntry}
              onCook={(entry) => { inbox.markRead(entry.id); handleCook() }}
              onSettings={openNotificationSettings}
            />
          )}
          {nav.tab === 'oggi' && nav.detail?.type !== 'inbox' && (
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
              unread={inbox.unread}
              onInbox={openNotifications}
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
              onSetCategory={setCategory}
              onOpenAdd={openAdd}
              onViewChange={setPantryView}
              onGoApiKey={handleGoApiKey}
              searchRequested={pantrySearch}
              onSearchHandled={clearPantrySearch}
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
              mealRequested={mealRequested}
              onMealHandled={clearMealRequested}
              onPlanRecipe={planRecipe}
              mealPrefs={mealPrefs}
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
              onOpenMealReminders={() => nav.openDetail({ type: 'promemoria-pasti' })}
              onOpenPreferences={() => nav.openDetail({ type: 'preferenze' })}
              preferences={preferences}
              onCloseDetail={nav.closeDetail}
              onExport={exportCSV}
              onImport={importCSV}
              onClearInventory={clearInventory}
              onSignOut={signOut}
              onSaveApiKey={saveApiKey}
            />
          )}
          </div>
        </main>

        {!isDesktop && !nav.detail && !chatOpen && (
          <ChatFab onClick={openChat} stacked={nav.tab === 'oggi' || nav.tab === 'dispensa'} />
        )}

        <ChatAssistant
          open={chatOpen}
          isDesktop={isDesktop}
          onClose={closeChat}
          chat={chat}
          archived={chat.archived}
          summary={chatSummary}
          mealPrefs={mealPrefs}
          savedTitles={savedTitles}
          onSaveRecipe={handleSaveChatRecipe}
          onAction={handleChatAction}
          onOpen={openFromChat}
          onGoApiKey={handleGoApiKey}
          onDeleteChat={handleDeleteChat}
        />

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

        <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

        {/* Mobile: bottom nav (hidden on ≥601px via CSS, and in detail views) */}
        {!nav.detail && <BottomNav activeTab={nav.tab} onTabChange={handleTabChange} />}
      </div>
    </>
  )
}
