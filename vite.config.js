import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Vite plugin: processes src/firebase-messaging-sw.template.js
// replacing %%VAR_NAME%% placeholders with values from .env at build/dev time
function firebaseSwPlugin(env) {
  function buildSw() {
    const tpl = fs.readFileSync(
      path.join(process.cwd(), 'src/firebase-messaging-sw.template.js'),
      'utf-8'
    )
    return tpl.replace(/%%(\w+)%%/g, (_, key) => env[key] ?? '')
  }

  return {
    name: 'firebase-messaging-sw',
    // Serve in dev mode
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Service-Worker-Allowed', '/')
        res.end(buildSw())
      })
    },
    // Emit in production build
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'firebase-messaging-sw.js', source: buildSw() })
    },
  }
}

// Modalità demo: utente finto + dati di esempio, senza Firebase Auth/Firestore.
// Attiva su ogni deploy Vercel il cui branch NON è quello di produzione, oppure in
// locale con VITE_MOCK_MODE=true nel .env. Mai su deploy di produzione (VERCEL_ENV),
// anche se la variabile fosse impostata per errore.
const PRODUCTION_BRANCH = 'master'

function resolveMockMode(env) {
  if (process.env.VERCEL_ENV === 'production') return false
  if (env.VITE_MOCK_MODE === 'true') return true
  if (env.VITE_MOCK_MODE === 'false') return false
  const branch = process.env.VERCEL_GIT_COMMIT_REF
  return !!branch && branch !== PRODUCTION_BRANCH
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mock = resolveMockMode(env)
  return {
    plugins: [react(), firebaseSwPlugin(env)],
    // Costante di build: nel bundle di produzione il codice mock viene eliminato.
    define: { 'import.meta.env.VITE_MOCK_MODE': JSON.stringify(String(mock)) },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
          },
        },
      },
    },
  }
})
