const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp }  = require('firebase-admin/app')
const { getFirestore }   = require('firebase-admin/firestore')
const { getMessaging }   = require('firebase-admin/messaging')
const { runTick, sendTest } = require('./lib/notify')

initializeApp()

/**
 * Runs every 15 minutes. Each user picks their own delivery time, days of notice
 * and time zone (users/{uid}/notificationPrefs/data); a user is handled when their
 * local time falls within 30 minutes after the chosen time, once per local day.
 * Name kept from the daily version so deploying updates the existing job in place.
 */
exports.sendExpiryNotifications = onSchedule(
  { schedule: '*/15 * * * *', timeoutSeconds: 300 },
  async () => {
    const summary = await runTick({ db: getFirestore(), messaging: getMessaging() })
    console.log('expiry notifications tick', JSON.stringify(summary))
  }
)

/**
 * "Invia notifica di prova": sends a test push to every device of the caller and
 * reports the outcome per device.
 */
exports.sendTestNotification = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Accedi per inviare una notifica di prova.')
  return sendTest({ db: getFirestore(), messaging: getMessaging(), uid: request.auth.uid })
})
