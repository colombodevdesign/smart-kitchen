// Service Worker for Firebase Cloud Messaging (background notifications).
// This file is a template processed by Vite: %%VAR%% placeholders are replaced
// with values from .env at build/dev time. Do not edit the built output.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            '%%VITE_FIREBASE_API_KEY%%',
  authDomain:        '%%VITE_FIREBASE_AUTH_DOMAIN%%',
  projectId:         '%%VITE_FIREBASE_PROJECT_ID%%',
  storageBucket:     '%%VITE_FIREBASE_STORAGE_BUCKET%%',
  messagingSenderId: '%%VITE_FIREBASE_MESSAGING_SENDER_ID%%',
  appId:             '%%VITE_FIREBASE_APP_ID%%',
})

const messaging = firebase.messaging()

// Customize background notification display
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  self.registration.showNotification(title ?? 'Smart Kitchen', {
    body:  body ?? '',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    data:  { url: payload.fcmOptions?.link ?? '/' },
  })
})

// Open or focus the app when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client)
          return client.focus()
      }
      return clients.openWindow(event.notification.data?.url ?? '/')
    })
  )
})
