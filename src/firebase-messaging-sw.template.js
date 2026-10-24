// Service Worker for Firebase Cloud Messaging (background notifications).
// This file is a template processed by Vite: %%VAR%% placeholders are replaced
// with values from .env at build/dev time. Do not edit the built output.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// Views the app can open from a notification (`data.open` in the message).
const OPEN_TARGETS = ['scadenze', 'pasti']

// Registered before firebase.messaging(), so it runs ahead of the SDK's own click
// handler (which would open a new window) and stops it. A tap focuses the app if it
// is open and tells it which view to show; otherwise it opens the app on that view.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()
  const data = event.notification.data ?? {}
  const open = data.FCM_MSG?.data?.open ?? data.open
  const target = OPEN_TARGETS.includes(open) ? open : null
  const url = new URL(target ? `./?apri=${target}` : './', self.registration.scope).href
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          if (target) client.postMessage({ type: 'sk-open', open: target })
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

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
