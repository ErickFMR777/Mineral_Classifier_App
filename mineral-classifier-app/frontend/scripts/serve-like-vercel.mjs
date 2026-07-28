/**
 * Serves the production build the way Vercel will.
 *
 * Static files win over rewrites, `/api/*` is routed the way vercel.json maps
 * it, and the JSON responses mirror api/index.py. This exists so the built
 * bundle — not the dev server — can be driven by a real browser before
 * deploying.
 *
 *   node scripts/serve-like-vercel.mjs [port]
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const DATA = resolve(ROOT, '../../data');
const PORT = Number(process.argv[2] ?? 5200);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const readData = (f) => JSON.parse(readFileSync(resolve(DATA, f), 'utf-8'));

/** Mirrors route_request() in api/index.py. */
function apiRoute(route) {
  const segments = route.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments.length === 0) {
    return [200, { service: 'Mineral Classifier API', version: '2.0.0' }];
  }
  if (segments[0] === 'health' && segments.length === 1) {
    return [200, { status: 'ok', service: 'mineral-classifier-api', version: '2.0.0' }];
  }
  if (segments[0] === 'model-metrics' && segments.length === 1) {
    return [200, readData('model_metrics.json')];
  }
  if (segments[0] === 'reference' && segments[1] === 'minerals') {
    const minerals = readData('minerals.json');
    if (segments.length === 2) {
      const list = minerals.map((m) => ({
        id: m.id, name: m.name, category: m.category,
        chemical_formula: m.chemical_formula, hardness: m.hardness_short,
        color: m.color, luster: m.luster, crystal_system: m.crystal_system,
        description: m.description, uses: m.uses,
      }));
      return [200, { minerals: list, total: list.length }];
    }
    if (segments.length === 3) {
      const wanted = segments[2].toLowerCase();
      const found = minerals.find((m) => m.name.toLowerCase() === wanted);
      return found
        ? [200, { mineral: found.name, details: found }]
        : [404, { detail: `Mineral '${segments[2]}' not found` }];
    }
  }
  if (segments.join('/') === 'classify/mineral') {
    return [410, { detail: 'Server-side classification has been removed.' }];
  }
  return [404, { detail: `Unknown endpoint: /api/${route}` }];
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const [status, payload] = apiRoute(pathname.replace(/^\/api\/?/, ''));
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(body);
  }

  // Filesystem first — this is what makes the SPA catch-all rewrite safe.
  const candidate = resolve(DIST, `.${pathname}`);
  if (candidate.startsWith(DIST) && existsSync(candidate) && statSync(candidate).isFile()) {
    const body = readFileSync(candidate);
    res.writeHead(200, {
      'Content-Type': MIME[extname(candidate)] ?? 'application/octet-stream',
      'Content-Length': body.length,
    });
    return res.end(body);
  }

  const html = readFileSync(resolve(DIST, 'index.html'));
  res.writeHead(200, { 'Content-Type': MIME['.html'], 'Content-Length': html.length });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Serving ${DIST} like Vercel on http://localhost:${PORT}`);
});
