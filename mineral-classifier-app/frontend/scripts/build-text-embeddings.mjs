/**
 * Pre-computes the CLIP text embeddings used by the zero-shot path.
 *
 * This is the Node/ONNX port of `_compute_text_embeddings()` in
 * backend/app/models/mineral_classifier.py: for every mineral we encode its 4
 * visual prompts, L2-normalize each one, average them, then normalize again.
 *
 * Running it is a one-off developer step — the result is committed so the
 * browser only ever downloads the *vision* encoder. Re-run it whenever
 * data/mineral_prompts.json or data/mineral_classes.json changes:
 *
 *   npm run build:embeddings
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '../../../data');
const OUT_FILE = resolve(HERE, '../public/models/text-embeddings.json');

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

const readJson = (name) => JSON.parse(readFileSync(resolve(DATA, name), 'utf-8'));

/** L2-normalize a plain array in place. */
function normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

async function main() {
  const classes = readJson('mineral_classes.json');
  const prompts = readJson('mineral_prompts.json');

  console.log(`Loading ${MODEL_ID} text encoder (fp32)...`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
    dtype: 'fp32',
  });

  let dim = 0;
  const matrix = [];

  for (const name of classes) {
    // Same fallback wording as the Python implementation.
    const classPrompts = prompts[name] ?? [
      `a photograph of ${name} mineral`,
      `a close-up photo of ${name} mineral specimen`,
      `a rock sample of ${name}`,
      `${name} mineral crystal photo`,
    ];

    const inputs = tokenizer(classPrompts, { padding: true, truncation: true });
    const { text_embeds } = await textModel(inputs);

    const [rows, cols] = text_embeds.dims;
    dim = cols;
    const flat = text_embeds.data;

    const averaged = new Array(cols).fill(0);
    for (let r = 0; r < rows; r++) {
      const row = Array.from(flat.slice(r * cols, (r + 1) * cols));
      normalize(row);
      for (let c = 0; c < cols; c++) averaged[c] += row[c];
    }
    for (let c = 0; c < cols; c++) averaged[c] /= rows;
    normalize(averaged);

    matrix.push(averaged);
    console.log(`  ${name.padEnd(14)} ${rows} prompts -> ${cols}-d`);
  }

  // Flatten to a single Float32Array and ship it base64-encoded: exact values,
  // ~82 KB instead of ~300 KB of JSON floats.
  const flat = new Float32Array(classes.length * dim);
  matrix.forEach((row, i) => flat.set(row, i * dim));

  const payload = {
    model: MODEL_ID,
    classes,
    shape: [classes.length, dim],
    dtype: 'float32',
    encoding: 'base64',
    data: Buffer.from(flat.buffer).toString('base64'),
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(payload), 'utf-8');
  console.log(`\nWrote ${OUT_FILE} (${classes.length}x${dim})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
