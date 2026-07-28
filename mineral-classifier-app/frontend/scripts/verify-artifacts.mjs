/**
 * Pre-deploy sanity check for the things that break silently.
 *
 * Each of these has a failure mode that produces no error at build time and no
 * obvious symptom at runtime — a card rendered without a chemical formula, a
 * dashboard quietly missing a column, a 21 MB runtime fetched from someone
 * else's CDN. `npm run build` catches none of them.
 *
 *   npm run verify            # artifacts + metrics + contract
 *   npm run verify -- --dist  # also check a build in dist/
 *
 * The scoring assertions import src/ml/scoring.ts directly (Node strips the
 * types), so if the temperature, the blend weight or the ranking changes, this
 * script exercises the new behaviour rather than a stale copy of the old one.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  TOP_K,
  ZERO_SHOT_TEMPERATURE,
  ZERO_SHOT_WEIGHT,
  classProbabilities,
  decodeEmbeddings,
  rank,
} from '../src/ml/scoring.ts';

const ROOT = resolve(import.meta.dirname, '..');
const REPO = resolve(ROOT, '../..');
const MODELS = resolve(ROOT, 'public/models');
const DIST = resolve(ROOT, 'dist');

const checkDist = process.argv.includes('--dist');

let failures = 0;
let checks = 0;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'));

function ok(label, detail = '') {
  checks++;
  console.log(`  \x1b[32mPASS\x1b[0m ${label}${detail ? `  ${detail}` : ''}`);
}

function fail(label, detail) {
  checks++;
  failures++;
  console.log(`  \x1b[31mFAIL\x1b[0m ${label}${detail ? `  ${detail}` : ''}`);
}

function assert(condition, label, detail = '') {
  if (condition) ok(label, detail);
  else fail(label, detail);
  return condition;
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// ---------------------------------------------------------------------------
section('1. Model artefacts');
// ---------------------------------------------------------------------------

const classes = readJson(resolve(REPO, 'data/mineral_classes.json'));
const minerals = readJson(resolve(REPO, 'data/minerals.json'));

const embPath = resolve(MODELS, 'text-embeddings.json');
if (!assert(existsSync(embPath), 'text-embeddings.json exists', embPath)) {
  console.log('\n  Run "npm run build:embeddings" first.');
  process.exit(1);
}

const embFile = readJson(embPath);
const [embRows, embDim] = embFile.shape;
const textEmbeddings = decodeEmbeddings(embFile.data);

assert(embRows === classes.length, 'embedding rows match the class list', `${embRows} vs ${classes.length}`);
assert(
  textEmbeddings.length === embRows * embDim,
  'embedding payload length matches its declared shape',
  `${textEmbeddings.length} floats`,
);
assert(
  JSON.stringify(embFile.classes) === JSON.stringify(classes),
  'embedding class order is identical to mineral_classes.json',
);

// A drifted or truncated payload usually shows up as rows that are no longer
// unit-length, which would silently distort every cosine similarity.
let worstNorm = 0;
for (let i = 0; i < embRows; i++) {
  let sum = 0;
  for (let d = 0; d < embDim; d++) {
    const v = textEmbeddings[i * embDim + d];
    sum += v * v;
  }
  worstNorm = Math.max(worstNorm, Math.abs(Math.sqrt(sum) - 1));
}
assert(worstNorm < 1e-4, 'every text embedding is unit length', `max deviation ${worstNorm.toExponential(2)}`);

const probePath = resolve(MODELS, 'probe.json');
const probe = existsSync(probePath) ? readJson(probePath) : null;

if (probe) {
  assert(probe.coef.length === probe.classes.length, 'probe has one coefficient row per class', `${probe.coef.length} rows`);
  assert(probe.intercept.length === probe.classes.length, 'probe has one intercept per class');
  assert(
    probe.coef.every((row) => row.length === embDim),
    'probe coefficient width matches the embedding dimension',
    `${embDim}`,
  );
  assert(
    probe.classes.every((i) => Number.isInteger(i) && i >= 0 && i < classes.length),
    'every probe class index is within range',
    `max ${Math.max(...probe.classes)} < ${classes.length}`,
  );
  assert(new Set(probe.classes).size === probe.classes.length, 'probe class indices are unique');
  assert(
    probe.coef.every((row) => row.every(Number.isFinite)) && probe.intercept.every(Number.isFinite),
    'probe contains no NaN or Infinity',
  );
} else {
  console.log('  \x1b[33mNOTE\x1b[0m no probe.json — the app would run pure zero-shot');
}

// ---------------------------------------------------------------------------
section('2. Metrics consumed by the About dashboard');
// ---------------------------------------------------------------------------

const metrics = readJson(resolve(REPO, 'data/model_metrics.json'));
const mi = metrics.model_info;
const om = metrics.overall_metrics;

const requiredInfo = [
  'total_classes', 'trained_classes', 'zero_shot_classes',
  'training_samples', 'validation_samples', 'test_samples',
  'base_model', 'classifier_head', 'embedding_dim', 'training_dataset',
];
const missingInfo = requiredInfo.filter((k) => mi[k] === undefined);
assert(missingInfo.length === 0, 'model_info has every key the dashboard reads', missingInfo.join(', '));

const requiredOverall = ['accuracy', 'macro_precision', 'macro_recall', 'macro_f1',
  'weighted_precision', 'weighted_recall', 'weighted_f1'];
const missingOverall = requiredOverall.filter((k) => om[k] === undefined);
assert(missingOverall.length === 0, 'overall_metrics has every required key', missingOverall.join(', '));

assert(
  Object.values(om).every((v) => typeof v === 'number' && v >= 0 && v <= 1),
  'every overall metric is a rate in 0..1',
);

const cm = metrics.confusion_matrix;
assert(cm.matrix.length === cm.labels.length, 'confusion matrix is square against its labels',
  `${cm.matrix.length}x${cm.labels[0] === undefined ? '?' : cm.matrix[0].length}`);
assert(cm.matrix.every((r) => r.length === cm.labels.length), 'every confusion matrix row has full width');

const cmTotal = cm.matrix.flat().reduce((a, b) => a + b, 0);
assert(cmTotal === mi.test_samples, 'confusion matrix totals the test set', `${cmTotal} vs ${mi.test_samples}`);

const supportTotal = metrics.per_class_metrics.reduce((a, c) => a + c.support, 0);
assert(supportTotal === mi.test_samples, 'per-class support totals the test set', `${supportTotal} vs ${mi.test_samples}`);

const named = metrics.per_class_metrics.map((c) => c.name);
assert(named.length === classes.length, 'per_class_metrics covers every class', `${named.length} of ${classes.length}`);
assert(new Set(named).size === named.length, 'no class appears twice in per_class_metrics');
assert(classes.every((c) => named.includes(c)), 'per_class_metrics names match mineral_classes.json');

// The zero-shot list drives a visible badge; if it disagrees with the probe the
// dashboard would label trained classes as untrained, or vice versa.
if (probe) {
  const trainedNames = probe.classes.map((i) => classes[i]).sort();
  const claimedZeroShot = [...mi.zero_shot_classes].sort();
  const derivedZeroShot = classes.filter((c) => !trainedNames.includes(c)).sort();
  assert(
    JSON.stringify(claimedZeroShot) === JSON.stringify(derivedZeroShot),
    'zero_shot_classes agrees with the shipped probe',
    claimedZeroShot.join(', '),
  );
  assert(mi.trained_classes === probe.classes.length, 'trained_classes count matches the probe',
    `${mi.trained_classes} vs ${probe.classes.length}`);
}

// ---------------------------------------------------------------------------
section('3. Output contract the UI depends on');
// ---------------------------------------------------------------------------

const ctx = { classes: embFile.classes, textEmbeddings, embeddingDim: embDim, probe };

console.log(`  \x1b[2m(temperature ${ZERO_SHOT_TEMPERATURE}, zero-shot weight ${ZERO_SHOT_WEIGHT}, top-k ${TOP_K})\x1b[0m`);

// Drive the real scoring with the text embeddings themselves: an image that
// embeds exactly like the "Pyrite" prompt must come back as Pyrite under the
// zero-shot path, which makes this a meaningful end-to-end assertion rather
// than a shape check on random noise.
let contractOk = true;
for (const probeIdx of [0, 7, classes.length - 1]) {
  const embedding = textEmbeddings.slice(probeIdx * embDim, (probeIdx + 1) * embDim);
  const probs = classProbabilities(embedding, ctx);
  const ranked = rank(probs, ctx.classes, TOP_K);

  const sum = probs.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-6) { contractOk = false; fail('probabilities sum to 1', `${sum}`); }
  if (probs.some((p) => p < 0 || p > 1 || !Number.isFinite(p))) {
    contractOk = false; fail('all probabilities are finite and within 0..1');
  }
  if (ranked.length !== TOP_K) { contractOk = false; fail('ranking returns TOP_K entries', `${ranked.length}`); }
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].confidence > ranked[i - 1].confidence) {
      contractOk = false; fail('confidences are non-increasing', `at ${i}`);
    }
  }
  if (!ranked.every((r) => classes.includes(r.class))) {
    contractOk = false; fail('every predicted name exists in the class list');
  }
}
if (contractOk) {
  ok('probabilities normalised, finite, ranked descending, names valid', `${TOP_K} per prediction`);
}

// Self-retrieval on the zero-shot path: an embedding identical to class i's own
// text embedding must rank class i first. Nothing else pins down the row stride
// and orientation of the similarity computation — a transposed or off-by-one
// read would still produce a plausible, normalised, descending distribution.
const zeroShotOnly = { ...ctx, probe: null };
const misretrieved = [];
for (let i = 0; i < classes.length; i++) {
  const embedding = textEmbeddings.slice(i * embDim, (i + 1) * embDim);
  const top = rank(classProbabilities(embedding, zeroShotOnly), ctx.classes, 1)[0];
  if (top.class !== classes[i]) misretrieved.push(`${classes[i]}->${top.class}`);
}
assert(
  misretrieved.length === 0,
  'zero-shot retrieves each class from its own text embedding',
  misretrieved.slice(0, 4).join(', '),
);

// Enrichment: a name present in mineral_classes.json but absent (or renamed) in
// minerals.json renders a result card with no formula, hardness or description.
const byName = new Map(minerals.map((m) => [m.name, m]));
const unenriched = classes.filter((c) => !byName.has(c));
assert(unenriched.length === 0, 'every class has a record in minerals.json', unenriched.join(', '));

const incomplete = classes.filter((c) => {
  const m = byName.get(c);
  return !m?.chemical_formula || !m?.hardness || !m?.description || !m?.uses?.length;
});
assert(incomplete.length === 0, 'every mineral record has the fields the result card renders', incomplete.join(', '));

const prompts = readJson(resolve(REPO, 'data/mineral_prompts.json'));
const missingPrompts = classes.filter((c) => !prompts[c]?.length);
assert(missingPrompts.length === 0, 'every class has zero-shot prompts', missingPrompts.join(', '));

// ---------------------------------------------------------------------------
if (checkDist) {
  section('4. Build output');

  if (!existsSync(DIST)) {
    fail('dist/ exists', 'run "npm run build" first');
  } else {
    assert(existsSync(resolve(DIST, 'models/text-embeddings.json')),
      'text-embeddings.json is emitted into dist');
    if (probe) {
      assert(existsSync(resolve(DIST, 'models/probe.json')), 'probe.json is emitted into dist');
    }

    const assets = existsSync(resolve(DIST, 'assets')) ? readdirSync(resolve(DIST, 'assets')) : [];
    const wasm = assets.filter((f) => f.endsWith('.wasm'));
    assert(wasm.length > 0, 'the ONNX Runtime wasm is emitted into dist', wasm.join(', '));

    // transformers.js defaults wasmPaths to its jsDelivr CDN; worker.ts clears
    // it so the runtime is served from our own origin. A dependency upgrade can
    // quietly undo that, and nothing else would notice.
    const workerBundle = assets.find((f) => f.startsWith('worker-') && f.endsWith('.js'));
    if (!workerBundle) {
      fail('worker bundle is present in dist/assets');
    } else {
      const src = readFileSync(resolve(DIST, 'assets', workerBundle), 'utf-8');
      const localRef = src.match(/new URL\("([^"]*ort-wasm[^"]*)"/);
      assert(localRef !== null && localRef[1].startsWith('/'),
        'the wasm resolves to a self-hosted URL, not a CDN', localRef?.[1] ?? 'no reference found');
    }
  }
}

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? `\n\x1b[32m${checks} checks passed.\x1b[0m`
    : `\n\x1b[31m${failures} of ${checks} checks FAILED.\x1b[0m`,
);
process.exit(failures === 0 ? 0 : 1);
