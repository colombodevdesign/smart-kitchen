// The app's one service worker: offline app shell + Firebase Cloud Messaging
// (background notifications). A scope can only have one, hence both live here.
// This file is a template processed by Vite: %%VAR%% placeholders are replaced
// with values from .env at build/dev time. Do not edit the built output.

// Replaced at build time (vite.config.js) with the files of the build. In dev it stays
// empty and the worker does no caching.
const SHELL = { version: 'dev', urls: [] }
const SHELL_CACHE_PREFIX = 'sk-shell-'
const SHELL_CACHE = SHELL_CACHE_PREFIX + SHELL.version
const NAVIGATE_TIMEOUT_MS = 5000
// Hosts add `Vary: Origin` to assets; module scripts and fonts are CORS requests, so
// without ignoreVary they would not match the copies stored by the install step.
const MATCH = { cacheName: SHELL_CACHE, ignoreVary: true }

// Paths that must always reach the network: the Firebase Auth redirect handler,
// Vercel's analytics, and the worker script itself.
const NETWORK_ONLY = ['/__/', '/_vercel/', '/firebase-messaging-sw.js']

self.addEventListener('install', (event) => {
  if (!SHELL.urls.length) return
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // `reload` skips the HTTP cache so the copy is really the one from this deploy
      .then((cache) => cache.addAll(SHELL.urls.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(SHELL_CACHE_PREFIX) && k !== SHELL_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Pages: network first, so an online visit always gets the latest deploy; if the
// network fails (or takes too long) the cached index.html opens the app.
// Everything else in the build: from the cache (file names carry a content hash).
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (!SHELL.urls.length || request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (NETWORK_ONLY.some((p) => url.pathname.startsWith(p))) return

  if (request.mode === 'navigate') {
    event.respondWith(
      new Promise((resolve) => {
        const fallback = () => caches.match('/index.html', MATCH).then((r) => r || fetch(request))
        const timer = setTimeout(() => fallback().then(resolve, () => {}), NAVIGATE_TIMEOUT_MS)
        fetch(request).then(
          (res) => { clearTimeout(timer); resolve(res) },
          () => { clearTimeout(timer); fallback().then(resolve, () => resolve(Response.error())) }
        )
      })
    )
    return
  }

  event.respondWith(
    caches.match(request, MATCH).then((hit) => hit || fetch(request))
  )
})

// Push is optional: if Google's CDN can't be reached or Firebase won't start, the
// offline shell above must still install, so a failure here only disables notifications.
let pushReady = true
try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')
} catch (err) {
  pushReady = false
  console.warn('Firebase Messaging non caricato:', err)
}

// Views the app can open from a notification (`data.open` in the message).
const OPEN_TARGETS = ['scadenze', 'pasti', 'impostazioni']

// Registered before firebase.messaging(), so it runs ahead of the SDK's own click
// handler (which would open a new window) and stops it. A tap focuses the app if it
// is open and tells it which view to show; otherwise it opens the app on that view.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()
  const data = event.notification.data ?? {}
  const open = data.FCM_MSG?.data?.open ?? data.open
  // Notification centre entry, marked read by the app.
  const nid = data.FCM_MSG?.data?.nid ?? data.nid ?? null
  const target = OPEN_TARGETS.includes(open) ? open : null
  const query = target ? `?apri=${target}${nid ? `&n=${encodeURIComponent(nid)}` : ''}` : ''
  const url = new URL(`./${query}`, self.registration.scope).href
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          if (target) client.postMessage({ type: 'sk-open', open: target, nid })
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

if (pushReady) {
  try {
    firebase.initializeApp({
      apiKey:            '%%VITE_FIREBASE_API_KEY%%',
      authDomain:        '%%VITE_FIREBASE_AUTH_DOMAIN%%',
      projectId:         '%%VITE_FIREBASE_PROJECT_ID%%',
      storageBucket:     '%%VITE_FIREBASE_STORAGE_BUCKET%%',
      messagingSenderId: '%%VITE_FIREBASE_MESSAGING_SENDER_ID%%',
      appId:             '%%VITE_FIREBASE_APP_ID%%',
    })

    // Messages carry a `notification` payload, which the SDK displays by itself in the
    // background (with the tag set by the Function). Showing it again here was the
    // cause of duplicate notifications, so there is no onBackgroundMessage handler.
    firebase.messaging()
  } catch (err) {
    console.warn('Firebase Messaging non avviato:', err)
  }
}
