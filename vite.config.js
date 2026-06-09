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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), firebaseSwPlugin(env)],
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
