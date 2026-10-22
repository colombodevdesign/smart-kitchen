// Theme preference: 'system' | 'light' | 'dark', kept in localStorage.
// The same resolution runs inline in index.html before first paint (to avoid a
// flash); keep the two in sync.
const STORAGE_KEY = 'theme'
const THEME_COLORS = { light: '#F3F5F0', dark: '#101A14' }

export function getPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function resolve(pref = getPref()) {
  if (pref === 'light' || pref === 'dark') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function apply(pref = getPref()) {
  const theme = resolve(pref)
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = THEME_COLORS[theme]
  return theme
}

export function setPref(pref) {
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, pref)
  } catch {}
  return apply(pref)
}

// Follow the OS while the preference is "system".
export function watchSystemTheme() {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mq) return () => {}
  const onChange = () => { if (getPref() === 'system') apply('system') }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
