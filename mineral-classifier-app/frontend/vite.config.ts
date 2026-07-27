import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const REPO_ROOT = resolve(__dirname, '../..')
const DATA_DIR = resolve(REPO_ROOT, 'data')

/**
 * Serves the same read-only endpoints as api/index.py during `vite dev`, so the
 * app runs locally with nothing but Node — no Python, no `vercel dev`. Keep the
 * responses in sync with api/index.py.
 */
function devApi(): Plugin {
  const readData = (file: string) =>
    JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8'))

  return {
    name: 'mineral-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api')) return next()

        const route = url.replace(/^\/api\/?/, '').split('?')[0]
        const send = (status: number, payload: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(payload))
        }

        try {
          if (route === 'health') {
            return send(200, { status: 'ok', service: 'mineral-classifier-api', version: '2.0.0' })
          }
          if (route === 'model-metrics') {
            return send(200, readData('model_metrics.json'))
          }
          if (route === 'reference/minerals') {
            const minerals = readData('minerals.json').map((m: Record<string, unknown>) => ({
              id: m.id,
              name: m.name,
              category: m.category,
              chemical_formula: m.chemical_formula,
              hardness: m.hardness_short,
              color: m.color,
              luster: m.luster,
              crystal_system: m.crystal_system,
              description: m.description,
              uses: m.uses,
            }))
            return send(200, { minerals, total: minerals.length })
          }
          if (route.startsWith('reference/minerals/')) {
            const wanted = decodeURIComponent(route.slice('reference/minerals/'.length)).toLowerCase()
            const found = readData('minerals.json').find(
              (m: { name: string }) => m.name.toLowerCase() === wanted,
            )
            return found
              ? send(200, { mineral: found.name, details: found })
              : send(404, { detail: `Mineral not found` })
          }
          return send(404, { detail: `Unknown endpoint: /api/${route}` })
        } catch (err) {
          return send(500, { detail: String(err) })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    fs: {
      // data/ lives at the repo root, outside Vite's project root.
      allow: [REPO_ROOT],
    },
  },
  // onnxruntime-web ships prebuilt ESM + wasm; pre-bundling it breaks the
  // worker's dynamic wasm loading.
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    // The inference worker is a module worker and is code-split.
    format: 'es',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
})
