// Dati di esempio per la modalità demo (deploy non di produzione).
// Le scadenze sono relative a oggi, così "In scadenza" ha sempre qualcosa da mostrare.
import { todayStr } from '../utils/date.js'
import { analysisKey } from '../ai/analyzePantry.js'

// Nessun uid: gli hook dati usano il fallback localStorage e non toccano Firestore.
export const MOCK_USER = {
  uid: null,
  displayName: 'Utente demo',
  email: 'demo@smart-kitchen.test',
  photoURL: null,
}

const KEYS = {
  inventory: 'cucina-smart-v1',
  meals: 'cucina-pasti-v1',
  recipes: 'cucina-ricette-salvate-v1',
  shopping: 'cucina-spesa-salvata-v1',
  mealPrefs: 'sk-meal-prefs',
}
const SEEDED_FLAG = 'sk-mock-seeded'

const DAY = 86400000

// Fine giornata tra `days` giorni, come scrive addItem.
function expiry(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 0)
  return d.getTime()
}

function dateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return todayStr(d)
}

// `ai`: [category, openDays, freshDays, genericName?, food?], the metadata the AI
// analysis would store (see src/ai/analyzePantry.js); without it the product is
// analysed only if a Gemini key is set. `opened`: days since it was opened.
function buildInventory() {
  const now = Date.now()
  let n = 0
  const item = (section, name, qty, { days = null, opened = null, ago = 2, ai = null } = {}) => {
    const it = {
      id: section[0] + (now + n++),
      name,
      qty,
      urgent: opened !== null,
      added: now - Math.max(ago, opened ?? 0) * DAY,
      expiresAt: days === null ? null : expiry(days),
    }
    if (opened !== null) it.openedAt = now - opened * DAY
    if (ai) {
      const [category, openDays, freshDays, generic = name.toLowerCase(), food = true] = ai
      it.ai = { key: analysisKey(it, section), name: generic, category, food, openDays, freshDays }
    }
    return it
  }
  return {
    credenza: [
      item('credenza', 'Pasta penne', '500 g', { ai: ['pasta-cereali', 180, null, 'pasta penne'] }),
      item('credenza', 'Riso Carnaroli', '1 kg', { opened: 20, ai: ['pasta-cereali', 180, null, 'riso carnaroli'] }),
      item('credenza', 'Passata di pomodoro', '2 bottiglie', { ai: ['conserve', 4, null, 'passata di pomodoro'] }),
      item('credenza', 'Lenticchie', '400 g', { days: 120, ai: ['legumi', 3, null] }),
      item('credenza', 'Tonno in scatola', '3 scatole', { days: 300, ai: ['conserve', 2, null, 'tonno'] }),
      item('credenza', 'Farina 00', '1 kg', { opened: 10, ai: ['pasta-cereali', 90, null, 'farina'] }),
      item('credenza', 'Biscotti frollini', '1 pacco', { opened: 9, ai: ['dolci', 14, null, 'biscotti'] }),
      item('credenza', 'Integratore multivitaminico', '60 compresse', { ai: ['non-alimentare', null, null, 'integratore', false] }),
      item('credenza', 'Cipolle', '3', { ago: 8, ai: ['verdura', null, 30, 'cipolle'] }),
    ],
    frigo: [
      item('frigo', 'Latte intero', '1 l', { days: 0, ai: ['latticini', 3, null, 'latte'] }),
      item('frigo', 'Yogurt greco', '2 vasetti', { days: 1, ai: ['latticini', 3, null, 'yogurt greco'] }),
      item('frigo', 'Zucchine', '4', { ago: 5, ai: ['verdura', null, 6] }),
      item('frigo', 'Mozzarella', '2 pezzi', { days: 3, ai: ['latticini', 2, null] }),
      item('frigo', 'Spinaci freschi', '300 g', { days: -1, ai: ['verdura', 2, 4, 'spinaci'] }),
      item('frigo', 'Uova', '6', { days: 12, ai: ['uova', null, null] }),
      item('frigo', 'Parmigiano Reggiano', '200 g', { opened: 6, ai: ['latticini', 30, null, 'parmigiano'] }),
      item('frigo', 'Zucca', '1/2', { days: 6, ai: ['verdura', 5, 30] }),
      item('frigo', 'Alici sott\'olio', '1 vasetto', { opened: 4, ai: ['pesce', 5, null, 'alici'] }),
      item('frigo', 'Ketchup', '', { opened: 25, ai: ['salse', 60, null] }),
      item('frigo', 'Maionese', '', { opened: 12, ai: ['salse', 60, null] }),
      item('frigo', 'Pesto alla genovese', '1 vasetto', { opened: 3, ai: ['salse', 5, null, 'pesto'] }),
      item('frigo', 'Carote', '1 kg', { ago: 3, ai: ['verdura', null, 14] }),
    ],
    freezer: [
      item('freezer', 'Piselli surgelati', '450 g', { days: 90, ai: ['verdura', 60, null, 'piselli'] }),
      item('freezer', 'Petto di pollo', '600 g', { days: 60, ai: ['carne', 60, 180, 'petto di pollo'] }),
      item('freezer', 'Pane a fette', '1 pacco'),
      item('freezer', 'Gelato al caffè', '1 vaschetta', { opened: 15, ai: ['dolci', 30, null, 'gelato'] }),
    ],
  }
}

// `plan(time, lead)`: a meal still to eat (Pasti as a planner), with its reminder.
function buildMeals() {
  const meal = (id, text, category, extra = {}) => ({
    id, text, category, recipeId: null, recipeTitle: null, createdAt: Date.now(), ...extra,
  })
  const plan = (time, lead = null) => ({ planned: true, time, reminder: lead ? { lead } : null })
  const recipe = (id, title) => ({ recipeId: id, recipeTitle: title })
  return {
    [dateStr(0)]: [
      meal('m-today-1', 'Yogurt greco e miele', 'colazione'),
      meal('m-today-2', 'Pasta al pomodoro', 'pranzo'),
      meal('m-today-3', 'Pasta con zucchine e mozzarella', 'cena', {
        ...recipe('mock-r1', 'Pasta con zucchine e mozzarella'), ...plan('19:30', '30'),
      }),
    ],
    [dateStr(-1)]: [
      meal('m-y-1', 'Risotto alla zucca', 'cena', { recipeId: 'mock-r2', recipeTitle: 'Risotto alla zucca' }),
      meal('m-y-2', 'Mela', 'spuntino'),
    ],
    [dateStr(-2)]: [
      meal('m-2-1', 'Insalata di tonno', 'pranzo'),
      meal('m-2-2', 'Minestrone', 'cena'),
    ],
    [dateStr(1)]: [
      meal('m-t-1', 'Zuppa di ceci', 'pranzo', plan('12:30', '30')),
    ],
    [dateStr(3)]: [
      meal('m-3-1', 'Frittata di spinaci', 'cena', { ...recipe('mock-r3', 'Frittata di spinaci'), ...plan('20:00', '60') }),
    ],
    [dateStr(4)]: [
      meal('m-4-1', 'Lasagne', 'pranzo', plan('13:00')),
    ],
  }
}

// Meal reminders on, so the planner shows its reminder times (no push in the demo).
const MEAL_PREFS = {
  enabled: true, lead: '30', dinnerNudge: false,
  times: { colazione: '08:00', pranzo: '12:30', spuntino: '16:30', cena: '19:30' },
}

const RECIPE_PASTA_ZUCCHINE = `## Pasta con zucchine e mozzarella
**Tempo:** 25 minuti · **Porzioni:** 2

### Ingredienti
- 200 g di pasta penne
- 3 zucchine
- 1 mozzarella
- 1 spicchio d'aglio
- Olio extravergine, sale e pepe q.b.

### Procedimento
1. Taglia le zucchine a rondelle e rosolale in padella con aglio e olio per 8 minuti.
2. Lessa la pasta in acqua salata e scolala al dente.
3. Unisci la pasta alle zucchine, aggiungi la mozzarella a cubetti e mescola finché fila.
4. Pepa e servi subito.`

const RECIPE_RISOTTO_ZUCCA = `## Risotto alla zucca
**Tempo:** 40 minuti · **Porzioni:** 3

### Ingredienti
- 240 g di riso Carnaroli
- 400 g di zucca
- 1/2 cipolla
- 1 l di brodo vegetale
- 40 g di parmigiano
- Burro e sale q.b.

### Procedimento
1. Soffriggi la cipolla con una noce di burro, aggiungi la zucca a cubetti e cuoci 10 minuti.
2. Tosta il riso un minuto, poi bagna con il brodo caldo un mestolo alla volta.
3. A cottura (circa 16 minuti) manteca con burro e parmigiano.`

const RECIPE_FRITTATA = `## Frittata di spinaci
**Tempo:** 15 minuti · **Porzioni:** 2

### Ingredienti
- 4 uova
- 200 g di spinaci
- 30 g di parmigiano
- Olio, sale e noce moscata q.b.

### Procedimento
1. Salta gli spinaci in padella con un filo d'olio e strizzali.
2. Sbatti le uova con parmigiano, sale e noce moscata, unisci gli spinaci.
3. Cuoci in padella coperta a fuoco basso 6 minuti per lato.`

function buildRecipes() {
  const ts = Date.now() - 3 * DAY
  const ing = (name, qty = '', qb = false) => ({ name, qty, qb })
  return [
    {
      id: 'mock-r1', title: 'Pasta con zucchine e mozzarella', content: RECIPE_PASTA_ZUCCHINE, savedAt: ts,
      ingredients: [ing('pasta penne', '200 g'), ing('zucchine', '3'), ing('mozzarella', '1'), ing('aglio', '1 spicchio'), ing('olio extravergine', '', true)],
    },
    {
      id: 'mock-r2', title: 'Risotto alla zucca', content: RECIPE_RISOTTO_ZUCCA, savedAt: ts + 1,
      ingredients: [ing('riso Carnaroli', '240 g'), ing('zucca', '400 g'), ing('cipolla', '1/2'), ing('brodo vegetale', '1 l'), ing('parmigiano', '40 g'), ing('burro', '', true)],
    },
    {
      id: 'mock-r3', title: 'Frittata di spinaci', content: RECIPE_FRITTATA, savedAt: ts + 2,
      ingredients: [ing('uova', '4'), ing('spinaci', '200 g'), ing('parmigiano', '30 g'), ing('noce moscata', '', true)],
    },
  ]
}

function buildShopping() {
  const now = Date.now()
  const item = (i, name, category, qty, checked = false) => ({
    id: `mock-s${i}`, name, category, qty, savedAt: now - i * 1000, updatedAt: now - i * 1000, checked, source: 'manual',
  })
  return [
    item(1, 'Pomodori', 'Frutta e verdura', '500 g'),
    item(2, 'Basilico', 'Frutta e verdura', '1 mazzo'),
    item(3, 'Pane', 'Panetteria', '1'),
    item(4, 'Prosciutto cotto', 'Salumi e formaggi', '150 g'),
    item(5, 'Detersivo piatti', 'Generale', '1', true),
  ]
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// Scrive i dati di esempio nelle chiavi localStorage usate dagli hook senza account.
// Una volta per scheda: un ricarico mantiene le modifiche fatte durante il test,
// una scheda nuova (o "Ripristina") riparte dagli stessi dati.
export function seedMockData({ force = false } = {}) {
  try {
    if (!force && sessionStorage.getItem(SEEDED_FLAG)) return
    sessionStorage.setItem(SEEDED_FLAG, '1')
  } catch {}
  write(KEYS.inventory, buildInventory())
  write(KEYS.meals, buildMeals())
  write(KEYS.recipes, buildRecipes())
  write(KEYS.shopping, buildShopping())
  write(KEYS.mealPrefs, MEAL_PREFS)
}

export function resetMockData() {
  seedMockData({ force: true })
  window.location.reload()
}
