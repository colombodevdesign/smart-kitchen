// Dati di esempio per la modalità demo (deploy non di produzione).
// Le scadenze sono relative a oggi, così "In scadenza" ha sempre qualcosa da mostrare.
import { todayStr } from '../utils/date.js'

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

function buildInventory() {
  const now = Date.now()
  let n = 0
  const item = (section, name, qty, { days = null, urgent = false, ago = 2 } = {}) => ({
    id: section[0] + (now + n++),
    name,
    qty,
    urgent,
    added: now - ago * DAY,
    expiresAt: days === null ? null : expiry(days),
  })
  return {
    credenza: [
      item('credenza', 'Pasta penne', '500 g'),
      item('credenza', 'Riso Carnaroli', '1 kg'),
      item('credenza', 'Passata di pomodoro', '2 bottiglie'),
      item('credenza', 'Lenticchie', '400 g', { days: 120 }),
      item('credenza', 'Tonno in scatola', '3 scatole', { days: 300 }),
      item('credenza', 'Farina 00', '1 kg', { urgent: true }),
    ],
    frigo: [
      item('frigo', 'Latte intero', '1 l', { days: 0 }),
      item('frigo', 'Yogurt greco', '2 vasetti', { days: 1 }),
      item('frigo', 'Zucchine', '4', { days: 2 }),
      item('frigo', 'Mozzarella', '2 pezzi', { days: 3 }),
      item('frigo', 'Spinaci freschi', '300 g', { days: -1 }),
      item('frigo', 'Uova', '6', { days: 12 }),
      item('frigo', 'Parmigiano Reggiano', '200 g', { urgent: true }),
      item('frigo', 'Zucca', '1/2', { days: 6 }),
    ],
    freezer: [
      item('freezer', 'Piselli surgelati', '450 g', { days: 90 }),
      item('freezer', 'Petto di pollo', '600 g', { days: 60 }),
      item('freezer', 'Pane a fette', '1 pacco'),
    ],
  }
}

function buildMeals() {
  const meal = (id, text, category, extra = {}) => ({
    id, text, category, recipeId: null, recipeTitle: null, createdAt: Date.now(), ...extra,
  })
  return {
    [dateStr(0)]: [
      meal('m-today-1', 'Yogurt greco e miele', 'colazione'),
      meal('m-today-2', 'Pasta al pomodoro', 'pranzo'),
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
      meal('m-t-1', 'Frittata di zucchine', 'cena'),
    ],
  }
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
}

export function resetMockData() {
  seedMockData({ force: true })
  window.location.reload()
}
