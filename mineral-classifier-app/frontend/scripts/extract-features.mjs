/**
 * Extracts CLIP image embeddings for the training corpus.
 *
 * Runs the *exact* model, dtype and processor the browser uses, so the linear
 * probe trained on these features is valid for the embeddings produced at
 * inference time. Training uses single-image embeddings (no test-time
 * augmentation), matching the original train_classifier.py.
 *
 *   node scripts/extract-features.mjs <imagesDir> <manifest.json> <outDir>
 *
 * Writes features.bin (raw float32, row-major) and features-meta.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';
const BATCH_SIZE = 16;

const [imagesDir, manifestPath, outDir] = process.argv.slice(2);
if (!imagesDir || !manifestPath || !outDir) {
  console.error('Usage: node scripts/extract-features.mjs <imagesDir> <manifest.json> <outDir>');
  process.exit(1);
}

function normalizeRow(row) {
  let sum = 0;
  for (let i = 0; i < row.length; i++) sum += row[i] * row[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < row.length; i++) row[i] /= norm;
  return row;
}

async function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  console.log(`Manifest: ${manifest.length} images`);

  console.log(`Loading ${MODEL_ID} vision encoder (q8 - identical to the browser)...`);
  const processor = await AutoProcessor.from_pretrained(MODEL_ID);
  const model = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8' });
  console.log('Loaded.\n');

  let features = null;
  let dim = 0;
  let written = 0;
  const kept = [];
  const started = Date.now();

  for (let start = 0; start < manifest.length; start += BATCH_SIZE) {
    const batch = manifest.slice(start, start + BATCH_SIZE);

    const images = [];
    const entries = [];
    for (const entry of batch) {
      try {
        images.push(await RawImage.read(resolve(imagesDir, entry.file)));
        entries.push(entry);
      } catch {
        // Skip unreadable files rather than aborting a multi-thousand-image run.
      }
    }
    if (images.length === 0) continue;

    const inputs = await processor(images);
    const { image_embeds } = await model(inputs);
    const [rows, cols] = image_embeds.dims;

    if (!features) {
      dim = cols;
      features = new Float32Array(manifest.length * dim);
    }

    const flat = image_embeds.data;
    for (let r = 0; r < rows; r++) {
      const row = normalizeRow(flat.slice(r * cols, (r + 1) * cols));
      features.set(row, written * dim);
      kept.push(entries[r]);
      written++;
    }

    if (start % (BATCH_SIZE * 20) === 0 || start + BATCH_SIZE >= manifest.length) {
      const done = Math.min(start + BATCH_SIZE, manifest.length);
      const elapsed = (Date.now() - started) / 1000;
      const rate = done / elapsed;
      const eta = Math.round((manifest.length - done) / rate);
      console.log(
        `  ${done}/${manifest.length}  (${rate.toFixed(1)} img/s, ETA ${Math.floor(eta / 60)}m${eta % 60}s)`,
      );
    }
  }

  mkdirSync(outDir, { recursive: true });
  const trimmed = features.subarray(0, written * dim);
  writeFileSync(resolve(outDir, 'features.bin'), Buffer.from(trimmed.buffer, 0, trimmed.byteLength));
  writeFileSync(
    resolve(outDir, 'features-meta.json'),
    JSON.stringify({
      model: MODEL_ID,
      dtype: 'q8',
      count: written,
      dim,
      rows: kept.map((e) => ({ split: e.split, label: e.label, species: e.species })),
    }),
  );

  console.log(`\nWrote ${written} x ${dim} features to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
