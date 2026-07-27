/**
 * End-to-end check of the shipped classifier.
 *
 * Reproduces src/ml/worker.ts exactly — same model, same dtype, same four
 * test-time augmentations, same probe/zero-shot blend — against a directory of
 * photos named after their expected class (pyrite.jpg, quartz.jpg, ...).
 *
 *   node scripts/verify-classifier.mjs <imageDir> [moreDirs...]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';
const CROP_SCALES = [0.9, 0.85];
const MAX_SIDE = 800;
const ZERO_SHOT_TEMPERATURE = 0.01;
const ZERO_SHOT_WEIGHT = 0.3;
const TOP_K = 5;

const PUBLIC = resolve(import.meta.dirname, '../public/models');

const normalize = (v) => {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
};

const softmax = (logits) => {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
};

async function buildVariants(file) {
  let img = sharp(file).rotate();
  const meta = await img.metadata();
  let { width: w, height: h } = meta;

  const longest = Math.max(w, h);
  if (longest > MAX_SIDE) {
    const scale = MAX_SIDE / longest;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    img = img.resize(w, h);
  }

  const base = await img.removeAlpha().raw().toBuffer();
  const raw = (buf, width, height) => new RawImage(buf, width, height, 3);
  const from = (buf) => sharp(buf, { raw: { width: w, height: h, channels: 3 } });

  const variants = [raw(base, w, h)];
  variants.push(raw(await from(base).flop().raw().toBuffer(), w, h));

  for (const scale of CROP_SCALES) {
    const cw = Math.floor(w * scale);
    const ch = Math.floor(h * scale);
    const crop = await from(base)
      .extract({ left: (w - cw) >> 1, top: (h - ch) >> 1, width: cw, height: ch })
      .raw()
      .toBuffer();
    variants.push(raw(crop, cw, ch));
  }
  return variants;
}

async function main() {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) {
    console.error('Usage: node scripts/verify-classifier.mjs <imageDir> [moreDirs...]');
    process.exit(1);
  }

  const emb = JSON.parse(readFileSync(resolve(PUBLIC, 'text-embeddings.json'), 'utf-8'));
  const classes = emb.classes;
  const [N, D] = emb.shape;
  const buf = Buffer.from(emb.data, 'base64');
  const textEmb = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);

  const probePath = resolve(PUBLIC, 'probe.json');
  const probe = existsSync(probePath) ? JSON.parse(readFileSync(probePath, 'utf-8')) : null;
  console.log(
    probe
      ? `Probe loaded: ${probe.classes.length}/${N} classes trained`
      : 'No probe.json — pure zero-shot',
  );

  const processor = await AutoProcessor.from_pretrained(MODEL_ID);
  const model = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8' });
  console.log('Vision encoder loaded (q8)\n');

  const trained = new Set(probe?.classes ?? []);
  let hit1 = 0;
  let hit3 = 0;
  let total = 0;

  for (const dir of dirs) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.jpg'))) {
      const expected = basename(file, '.jpg').toLowerCase();

      const variants = await buildVariants(resolve(dir, file));
      const inputs = await processor(variants);
      const { image_embeds } = await model(inputs);
      const [rows, cols] = image_embeds.dims;
      const flat = image_embeds.data;

      const avg = new Float32Array(cols);
      for (let r = 0; r < rows; r++) {
        const row = normalize(flat.slice(r * cols, (r + 1) * cols));
        for (let c = 0; c < cols; c++) avg[c] += row[c];
      }
      for (let c = 0; c < cols; c++) avg[c] /= rows;
      normalize(avg);

      const sims = [];
      for (let i = 0; i < N; i++) {
        let dot = 0;
        for (let d = 0; d < D; d++) dot += avg[d] * textEmb[i * D + d];
        sims.push(dot);
      }
      const zeroShot = softmax(sims.map((s) => s / ZERO_SHOT_TEMPERATURE));

      let probs = zeroShot;
      if (probe) {
        const logits = probe.coef.map((row, i) => {
          let z = probe.intercept[i];
          for (let d = 0; d < D; d++) z += row[d] * avg[d];
          return z;
        });
        const trainedProbs = softmax(logits);
        const full = new Array(N).fill(0);
        probe.classes.forEach((idx, i) => {
          full[idx] = trainedProbs[i];
        });
        for (let i = 0; i < N; i++) {
          if (!trained.has(i)) full[i] = zeroShot[i] * ZERO_SHOT_WEIGHT;
        }
        const sum = full.reduce((a, b) => a + b, 0);
        probs = sum > 0 ? full.map((p) => p / sum) : full;
      }

      const ranked = probs
        .map((p, i) => ({ name: classes[i], p }))
        .sort((a, b) => b.p - a.p)
        .slice(0, TOP_K);

      const names = ranked.map((r) => r.name.toLowerCase());
      const ok1 = names[0] === expected;
      const ok3 = names.slice(0, 3).includes(expected);
      total++;
      if (ok1) hit1++;
      if (ok3) hit3++;

      const isZeroShot = !trained.has(classes.findIndex((c) => c.toLowerCase() === expected));
      const tag = ok1 ? 'OK  ' : ok3 ? '~T3 ' : 'MISS';
      const zs = isZeroShot ? ' [zero-shot class]' : '';
      console.log(
        `${tag} ${expected.padEnd(11)}${zs.padEnd(19)} ` +
          ranked.map((r) => `${r.name} ${(r.p * 100).toFixed(1)}%`).join('  |  '),
      );
    }
  }

  console.log(`\nTop-1 ${hit1}/${total}   Top-3 ${hit3}/${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
