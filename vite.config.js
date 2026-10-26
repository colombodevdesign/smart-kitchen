import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Vite plugin: processes src/firebase-messaging-sw.template.js
// replacing %%VAR_NAME%% placeholders with values from .env at build/dev time.
// The worker also precaches the app shell (offline support): after the build it is
// rewritten with the list of every file in dist/, so it is written in writeBundle,
// once all of them (including public/) exist.
const SHELL_PLACEHOLDER = "{ version: 'dev', urls: [] }"
const SW_FILE = 'firebase-messaging-sw.js'

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')]
  })
}

function firebaseSwPlugin(env) {
  function buildSw(shell) {
    const tpl = fs.readFileSync(
      path.join(process.cwd(), 'src/firebase-messaging-sw.template.js'),
      'utf-8'
    )
    return tpl
      .replace(/%%(\w+)%%/g, (_, key) => env[key] ?? '')
      .replace(SHELL_PLACEHOLDER, () => (shell ? JSON.stringify(shell) : SHELL_PLACEHOLDER))
  }

  return {
    name: 'firebase-messaging-sw',
    // Serve in dev mode (no precache: the dev server's modules are not cacheable files)
    configureServer(server) {
      server.middlewares.use(`/${SW_FILE}`, (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Service-Worker-Allowed', '/')
        res.end(buildSw())
      })
    },
    // Emit in production build
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve('dist')
      const files = listFiles(outDir).filter((f) => f !== SW_FILE && !f.endsWith('.map')).sort()
      const hash = crypto.createHash('sha1')
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(outDir, f)))
      const shell = { version: hash.digest('hex').slice(0, 12), urls: files.map((f) => `/${f}`) }
      fs.writeFileSync(path.join(outDir, SW_FILE), buildSw(shell))
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
