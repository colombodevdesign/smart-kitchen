// Checks that firestore.rules compiles, without credentials: run inside the
// Firestore emulator (firebase emulators:exec --only firestore …), which loads the
// rules from firebase.json and reports a syntax error on the first request.
// An unauthenticated read must come back 403 (rules evaluated), not 400.
const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const project = process.env.GCLOUD_PROJECT ?? 'demo-smart-kitchen'
const url = `http://${host}/v1/projects/${project}/databases/(default)/documents/users/check/inventory/data`

const res = await fetch(url)
const body = await res.text()
if (res.status === 400 && body.includes('compiling rules')) {
  const message = JSON.parse(body).error?.message ?? body
  console.error(`firestore.rules non compila:\n${message}`)
  process.exit(1)
}
if (res.status !== 403) {
  console.error(`Risposta inattesa dall'emulatore (${res.status}): ${body.slice(0, 300)}`)
  process.exit(1)
}
console.log('firestore.rules compila (lettura anonima negata, come previsto).')
