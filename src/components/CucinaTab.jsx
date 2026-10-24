import { AITab } from './AITab.jsx'
import { SavedRecipesTab } from './SavedRecipesTab.jsx'
import { MealTrackerTab } from './MealTrackerTab.jsx'
import { RecipeDetail } from './RecipeDetail.jsx'
import { PageHeader } from './ui/PageHeader.jsx'
import { Segmented } from './ui/Segmented.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { parseRecipes } from '../utils/parsers.js'
import styles from './Containers.module.css'

// Cucina = AI recipes + saved recipes + meal tracker. On mobile these are three
// segments; on desktop AI and saved recipes sit side by side under "Ricette".
export function CucinaTab({
  sub, onSubChange, ricette, savedRecipes, mealTracker, inventory, onGoApiKey,
  detailId, onOpenRecipe, onCloseDetail, onCookTonight, onAddMissing,
  mealRequested, onMealHandled, onPlanRecipe, mealPrefs,
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const view = isDesktop && sub === 'salvate' ? 'ricette' : sub

  const options = isDesktop
    ? [
        { value: 'ricette', label: 'Ricette' },
        { value: 'pasti', label: 'Pasti' },
      ]
    : [
        { value: 'ricette', label: 'Ricette AI' },
        { value: 'salvate', label: 'Salvate', count: savedRecipes.recipes.length },
        { value: 'pasti', label: 'Pasti' },
      ]

  const showAI = view === 'ricette'
  const showSaved = view === 'salvate' || (isDesktop && view === 'ricette')

  const detailRecipe = detailId ? savedRecipes.recipes.find(r => r.id === detailId) : null

  return (
    <>
    {detailRecipe && (
      <RecipeDetail
        recipe={detailRecipe}
        inventory={inventory}
        onBack={onCloseDetail}
        onRemove={(id) => { savedRecipes.removeRecipe(id); onCloseDetail() }}
        onCookTonight={onCookTonight}
        onPlan={() => { onCloseDetail(); onSubChange('pasti'); onPlanRecipe?.(detailRecipe.id) }}
        onAddMissing={onAddMissing}
        onAnalyze={(r) => savedRecipes.analyzeIngredients([r])}
      />
    )}
    <div className={styles.wrap} hidden={!!detailRecipe}>
      <PageHeader title="Cucina" />
      <Segmented options={options} value={view} onChange={onSubChange} ariaLabel="Sezione di Cucina" />

      <div className={`${styles.split} ${isDesktop && view === 'ricette' ? styles.splitBoth : ''}`}>
        <div className={styles.view} data-view hidden={!showAI}>
          <AITab
            variant="cards"
            buttonLabel="Cosa cucino stasera?"
            hint="Idee per stasera, partendo da ciò che scade"
            errorTitle="Non riesco a generare le ricette"
            onGoApiKey={onGoApiKey}
            onFetch={ricette.fetchRicette}
            loading={ricette.loading}
            messages={ricette.messages}
            streaming={ricette.streaming}
            error={ricette.error}
            errorCode={ricette.errorCode}
            cached={ricette.cached}
            onSend={ricette.sendFollowUp}
            parseForSave={parseRecipes}
            onSaveItems={savedRecipes.addRecipes}
          />
        </div>
        <div className={styles.view} data-view hidden={!showSaved}>
          <SavedRecipesTab
            recipes={savedRecipes.recipes}
            inventory={inventory}
            onOpen={onOpenRecipe}
            onRemove={savedRecipes.removeRecipe}
            onCookTonight={onCookTonight}
            onAddMissing={onAddMissing}
          />
        </div>
      </div>

      <div className={styles.view} data-view hidden={view !== 'pasti'}>
        <MealTrackerTab
          meals={mealTracker.meals}
          onAdd={mealTracker.addMeal}
          onRemove={mealTracker.removeMeal}
          onUpdate={mealTracker.updateMeal}
          onMarkEaten={mealTracker.markEaten}
          savedRecipes={savedRecipes.recipes}
          inventory={inventory}
          mealPrefs={mealPrefs}
          onAddMissing={onAddMissing}
          addRequested={mealRequested}
          onAddHandled={onMealHandled}
          onOpenSavedRecipes={(id) => (id && savedRecipes.recipes.some(r => r.id === id) ? onOpenRecipe(id) : onSubChange('salvate'))}
        />
      </div>
    </div>
    </>
  )
}
