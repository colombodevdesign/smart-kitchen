const { onSchedule } = require('firebase-functions/v2/scheduler')
const { initializeApp }  = require('firebase-admin/app')
const { getFirestore }   = require('firebase-admin/firestore')
const { getMessaging }   = require('firebase-admin/messaging')

initializeApp()

/**
 * Runs daily at 09:00 Europe/Rome.
 * For every user with push notifications enabled, checks the inventory for
 * items expiring tomorrow (expiresAt in [tomorrow 00:00, tomorrow 23:59])
 * and sends a single FCM push notification listing those items.
 */
exports.sendExpiryNotifications = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Europe/Rome', timeoutSeconds: 300 },
  async () => {
    const db        = getFirestore()
    const messaging = getMessaging()

    // Build the "tomorrow" window in the server's local time
    const now           = new Date()
    const tomorrow      = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStart = new Date(
      tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0
    ).getTime()
    const tomorrowEnd   = new Date(
      tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59
    ).getTime()

    // List all user documents (sub-collection roots only)
    const userRefs = await db.collection('users').listDocuments()

    const sends = []

    for (const userRef of userRefs) {
      const uid = userRef.id

      // Check for a valid, enabled FCM token
      const tokenSnap = await db.doc(`users/${uid}/pushToken/data`).get()
      if (!tokenSnap.exists) continue
      const { token, enabled } = tokenSnap.data()
      if (!enabled || !token) continue

      // Read the user's inventory
      const invSnap = await db.doc(`users/${uid}/inventory/data`).get()
      if (!invSnap.exists) continue
      const inventory = invSnap.data()

      const expiring = []
      for (const section of ['credenza', 'frigo', 'freezer']) {
        for (const item of (inventory[section] ?? [])) {
          if (
            item.expiresAt &&
            item.expiresAt >= tomorrowStart &&
            item.expiresAt <= tomorrowEnd
          ) {
            expiring.push(item.name)
          }
        }
      }

      if (expiring.length === 0) continue

      const names  = expiring.slice(0, 3).join(', ')
      const suffix = expiring.length > 3 ? ` +${expiring.length - 3} altri` : ''

      sends.push(
        messaging.send({
          token,
          notification: {
            title: '⏰ Scade domani',
            body:  `${names}${suffix}`,
          },
          webpush: {
            notification: {
              icon:  '/icon-192.png',
              badge: '/icon-192.png',
            },
          },
        }).catch(async (err) => {
          // Clean up stale tokens automatically
          const stale = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
          ]
          if (stale.includes(err.code)) {
            await db.doc(`users/${uid}/pushToken/data`).delete().catch(() => {})
          }
        })
      )
    }

    await Promise.all(sends)
  }
)
