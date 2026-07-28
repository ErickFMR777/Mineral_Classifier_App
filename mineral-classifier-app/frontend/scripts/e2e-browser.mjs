/**
 * End-to-end check of the production build in a real browser.
 *
 * Node-based verification cannot reach the parts most likely to break in
 * production: the module worker, canvas-based test-time augmentation, ONNX
 * Runtime under WebAssembly, and the model download itself. This drives the
 * built bundle through Chromium exactly as a visitor would.
 *
 *   node scripts/e2e-browser.mjs <imageDir> [--headed]
 *
 * Images are expected to be named after their class (pyrite.jpg, quartz-0.jpg).
 * Expects a server from scripts/serve-like-vercel.mjs on BASE_URL.
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { chromium } from 'playwright';

const PORT = Number(process.env.PORT ?? 5200);
const BASE_URL = `http://localhost:${PORT}`;
const ROOT = resolve(import.meta.dirname, '..');

const imageDir = process.argv[2];
const headed = process.argv.includes('--headed');
if (!imageDir) {
  console.error('Usage: node scripts/e2e-browser.mjs <imageDir> [--headed]');
  process.exit(1);
}

let failures = 0;
const check = (condition, label, detail = '') => {
  const tag = condition ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  if (!condition) failures++;
  console.log(`  ${tag} ${label}${detail ? `  ${detail}` : ''}`);
};

const waitForServer = async (attempts = 40) => {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

async function main() {
  console.log('Starting the Vercel-like server...');
  const server = spawn(process.execPath, [resolve(ROOT, 'scripts/serve-like-vercel.mjs'), String(PORT)], {
    stdio: 'ignore',
  });
  const shutdown = () => server.kill();
  process.on('exit', shutdown);

  if (!(await waitForServer())) {
    console.error('Server never became ready');
    server.kill();
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Anything logged as an error, or any request that fails, is a defect: this
  // build is what ships.
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
  });

  console.log('\n\x1b[1m1. Page loads and the model becomes ready\x1b[0m');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  check(await page.getByText('AI Mineral').first().isVisible(), 'hero renders');

  // The status pill must reach "Model ready" - this exercises the worker boot,
  // the embeddings fetch, the probe fetch and the 84 MB model download.
  console.log('  ... waiting for the model download (84 MB, first run)');
  const started = Date.now();
  await page.getByText('Model ready', { exact: false }).first().waitFor({ timeout: 300_000 });
  const loadSeconds = ((Date.now() - started) / 1000).toFixed(0);
  check(true, 'status pill reaches "Model ready"', `${loadSeconds}s`);

  const usedCdn = failedRequests.length === 0;
  check(usedCdn, 'no failed network requests during load', failedRequests.slice(0, 2).join('; '));

  console.log('\n\x1b[1m2. Classification of real photographs\x1b[0m');
  const files = readdirSync(imageDir).filter((f) => f.endsWith('.jpg'));
  let correct = 0;
  let inTop3 = 0;

  for (const file of files) {
    const expected = basename(file, '.jpg').replace(/-\d+$/, '').toLowerCase();

    await page.setInputFiles('input[type="file"]', resolve(imageDir, file));
    await page.getByRole('button', { name: /Classify Mineral/i }).click();

    // The result heading is the mineral name; wait for the "Identified" badge.
    await page.getByText('Identified', { exact: false }).first().waitFor({ timeout: 120_000 });

    const primary = (await page.locator('h2.text-3xl, h2.sm\\:text-4xl').first().innerText()).trim();
    const confidenceText = await page.locator('text=/^\\d+\\.\\d%$/').first().innerText().catch(() => '');

    // Alternatives list, in render order.
    const alts = await page.locator('div:has-text("Alternative Matches") >> xpath=following::span[contains(@class,"font-semibold")]')
      .allInnerTexts()
      .catch(() => []);
    const top3 = [primary, ...alts.slice(0, 2)].map((s) => s.toLowerCase());

    const ok1 = primary.toLowerCase() === expected;
    const ok3 = top3.includes(expected);
    if (ok1) correct++;
    if (ok3) inTop3++;

    console.log(
      `  ${ok1 ? '\x1b[32mOK  \x1b[0m' : ok3 ? '\x1b[33m~T3 \x1b[0m' : '\x1b[31mMISS\x1b[0m'} ` +
        `${expected.padEnd(12)} -> ${primary} ${confidenceText}`,
    );

    // A result card without a formula means enrichment silently failed.
    const hasFormula = await page.locator('p.font-mono.text-violet-600').first().isVisible().catch(() => false);
    if (!hasFormula) check(false, `result card for ${expected} shows a chemical formula`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Model ready', { exact: false }).first().waitFor({ timeout: 120_000 });
  }

  check(correct > 0, 'at least one photograph classified correctly', `${correct}/${files.length} top-1, ${inTop3}/${files.length} top-3`);

  console.log('\n\x1b[1m3. Catalog and About render without errors\x1b[0m');
  await page.getByRole('button', { name: /Catalog/i }).first().click();
  await page.getByText('Mineral Catalog').first().waitFor({ timeout: 15_000 });
  const cards = await page.locator('h3.font-bold').count();
  check(cards >= 30, 'catalog renders all 30 minerals', `${cards} cards`);

  await page.getByRole('button', { name: /About/i }).first().click();
  await page.getByText('About MineralClassifier').first().waitFor({ timeout: 15_000 });
  await page.getByText('Model Performance').first().waitFor({ timeout: 15_000 });
  check(true, 'About section renders');

  for (const tab of ['Per Class', 'Confusion Matrix', 'Limitations']) {
    await page.getByRole('button', { name: new RegExp(tab, 'i') }).first().click();
    await page.waitForTimeout(400);
    check(true, `metrics tab "${tab}" renders`);
  }

  const limitationsVisible = await page.getByText('no training data at all', { exact: false }).first().isVisible();
  check(limitationsVisible, 'Limitations tab shows the zero-shot coverage note');

  console.log('\n\x1b[1m4. Console cleanliness\x1b[0m');
  // ORT emits informational warnings we do not control; only real errors count.
  const realErrors = consoleErrors.filter((e) => !/onnxruntime|Some nodes were not assigned/i.test(e));
  check(realErrors.length === 0, 'no uncaught errors in the console', realErrors.slice(0, 3).join(' | '));

  await browser.close();
  server.kill();

  console.log(
    failures === 0
      ? '\n\x1b[32mBrowser end-to-end run passed.\x1b[0m'
      : `\n\x1b[31m${failures} browser checks FAILED.\x1b[0m`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
