// Matches recipe ingredients against pantry items. Pure, no imports other than
// helpers, so it can be exercised with plain node.
import { SOON_DAYS, expiryStatus } from './date.js'
import { USE_SOON_DAYS, estimateRemaining, isFood } from './pantry.js'

const STOPWORDS = new Set([
  'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'al', 'alla', 'allo', 'ai', 'alle',
  'a', 'e', 'con', 'per', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'in', 'da',
  'fresco', 'fresca', 'freschi', 'fresche', 'intero', 'intera', 'bio',
])

const UNITS = new Set(['g', 'gr', 'kg', 'mg', 'l', 'ml', 'cl', 'dl', 'pz', 'pezzi', 'pezzo', 'cucchiaio', 'cucchiai', 'cucchiaino', 'cucchiaini', 'spicchio', 'spicchi', 'bicchiere', 'bicchieri', 'tazza', 'tazze'])

const QB_RE = /q\.?\s?b\.?|quanto basta|pizzico|a piacere|abbondante/i

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// "pomodori" and "pomodoro" must meet: drop trailing vowels (and a final "h"
// left behind by "funghi"/"fungo"), but only on words long enough to keep a root.
function stem(token) {
  if (token.length < 4) return token
  let t = token
  while (t.length > 3 && /[aeiou]$/.test(t)) t = t.slice(0, -1)
  if (t.length > 3 && t.endsWith('h')) t = t.slice(0, -1)
  return t
}

// Ordered stems of a product name, e.g. "Pasta penne" -> ['past', 'penn'].
export function stemList(name) {
  const cleaned = stripAccents(String(name ?? '').toLowerCase())
    .replace(/\([^)]*\)/g, ' ')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
  return cleaned
    .split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w) && !UNITS.has(w))
    .map(stem)
}

export function stems(name) {
  return new Set(stemList(name))
}

function isSubset(small, big) {
  if (small.size === 0) return false
  for (const t of small) if (!big.has(t)) return false
  return true
}

// ingredients: [{ name, qty, qb? }]; inventory: { credenza: [], frigo: [], freezer: [] }
// Returns { rows: [{ ingredient, state, item, section }], have, total } where state is
// 'qb' | 'have' | 'soon' | 'expired' | 'open' | 'missing'.
// Matching is approximate (name stems, no quantities): "latte" also matches "latte di soia".
// A product matches by its own name or by the generic name from the AI analysis
// (item.ai.name: "fagioli" for "Fagioli alla Bud Spencer"); non-food is skipped.
export function matchIngredients(ingredients, inventory, now = Date.now()) {
  const pantry = []
  for (const section of Object.keys(inventory ?? {})) {
    for (const item of inventory[section] ?? []) {
      if (!isFood(item)) continue
      const variants = [item.name, item.ai?.name].filter(Boolean).map(name => {
        const list = stemList(name)
        return { head: list[0], stems: new Set(list) }
      })
      pantry.push({ item, section, variants })
    }
  }

  const rows = (ingredients ?? []).map(ingredient => {
    if (ingredient.qb || QB_RE.test(ingredient.qty ?? '')) {
      return { ingredient, state: 'qb', item: null, section: null }
    }
    const wantList = stemList(ingredient.name)
    const want = new Set(wantList)
    // Same head noun AND every word of the ingredient present in the product:
    // "pasta" matches "pasta penne", but "pomodori" does not match
    // "passata di pomodoro" and "pasta sfoglia" does not match "pasta penne".
    const found = pantry.find(p => p.variants.some(v => v.head === wantList[0] && isSubset(want, v.stems)))
    if (!found) return { ingredient, state: 'missing', item: null, section: null }
    const status = expiryStatus(found.item.expiresAt)
    // Opened products only count as "to use" when they don't keep for long.
    const est = estimateRemaining(found.item, found.section, now)
    let state = 'have'
    if (status === 'expired') state = 'expired'
    else if (status === 'soon') state = 'soon'
    else if (found.item.urgent && est && est.days <= USE_SOON_DAYS) state = 'open'
    else if (est?.source === 'fresh' && est.days <= SOON_DAYS) state = 'soon'
    return { ingredient, state, item: found.item, section: found.section }
  })

  const counted = rows.filter(r => r.state !== 'qb')
  const have = counted.filter(r => r.state !== 'missing').length
  return { rows, have, total: counted.length }
}

// Availability of a saved recipe against the pantry, or null when the recipe has
// no ingredient list yet. { rows, have, total, tone, missing: [ingredient] }.
export function recipeAvailability(recipe, inventory) {
  if (!recipe?.ingredients?.length) return null
  const m = matchIngredients(recipe.ingredients, inventory)
  const tone = m.total === 0 || m.have === m.total ? 'ok' : m.have * 2 >= m.total ? 'soon' : 'neutral'
  return { ...m, tone, missing: m.rows.filter(r => r.state === 'missing').map(r => r.ingredient) }
}
