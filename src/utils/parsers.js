// Recipes are split on "## " headings. Sub-sections inside a recipe use "###",
// so they never start a new recipe. Text before the first heading is dropped.
export function parseRecipes(text) {
  const parts = text.split(/(?=^## )/m).filter(s => s.trim().startsWith('## '))
  return parts.map((content, i) => {
    const match = content.match(/^## (.+)$/m)
    const title = match ? match[1].trim() : `Ricetta ${i + 1}`
    return { key: `r-${i}-${title}`, label: title, data: { title, content: content.trim() } }
  })
}

const QTY_UNITS = 'g|kg|gr|l|ml|cl|pz|pezzi|conf\\.?|bottiglie|lattine|scatole|mazzi|spicchi'
const QTY_PREFIX = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*(?:${QTY_UNITS}))\\s+(.+)$`, 'i')
const QTY_SUFFIX = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?\\s*(?:${QTY_UNITS}))$`, 'i')

export function extractQty(raw) {
  const pre = raw.match(QTY_PREFIX)
  if (pre) return { name: pre[2].trim(), qty: pre[1].trim() }
  const suf = raw.match(QTY_SUFFIX)
  if (suf) return { name: suf[1].trim(), qty: suf[2].trim() }
  return { name: raw, qty: '' }
}

export function parseShoppingItems(text) {
  const items = []
  let category = 'Generale'
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t.startsWith('## ')) { category = t.slice(3).trim(); continue }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const raw = t.slice(2).trim()
      if (!raw) continue
      const { name, qty } = extractQty(raw)
      if (!name) continue
      items.push({
        key: `${category}:${name}`,
        label: qty ? `${name} (${qty})` : name,
        data: { name, category, qty },
      })
    }
  }
  return items
}
