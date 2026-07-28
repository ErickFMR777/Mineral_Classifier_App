/**
 * Accuracy check of the shipped classifier against real photographs.
 *
 * Loads the same model and dtype as the browser and scores with the same
 * src/ml/scoring.ts module the worker uses, so a change to the temperature,
 * the blend weight or the ranking is reflected here instead of being masked by
 * a private copy of the logic.
 *
 *   node scripts/verify-classifier.mjs <dirOfImagesNamedByClass> [moreDirs...]
 *
 * Files are expected to be named after their expected class (pyrite.jpg,
 * quartz-0.jpg, ...).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

import {
  CROP_SCALES,
  MAX_SIDE,
  TOP_K,
  averageEmbeddings,
  classProbabilities,
  decodeEmbeddings,
  rank,
} from '../src/ml/scoring.ts';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';
const PUBLIC = resolve(import.meta.dirname, '../public/models');

/** Original + mirrored + two centre crops, matching engine.ts buildVariants(). */
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

  const variants = [raw(base, w, h), raw(await from(base).flop().raw().toBuffer(), w, h)];

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

  const embFile = JSON.parse(readFileSync(resolve(PUBLIC, 'text-embeddings.json'), 'utf-8'));
  const probePath = resolve(PUBLIC, 'probe.json');
  const probe = existsSync(probePath) ? JSON.parse(readFileSync(probePath, 'utf-8')) : null;

  const ctx = {
    classes: embFile.classes,
    embeddingDim: embFile.shape[1],
    textEmbeddings: decodeEmbeddings(embFile.data),
    probe,
  };

  console.log(
    probe
      ? `Probe loaded: ${probe.classes.length}/${ctx.classes.length} classes trained`
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
      // "pyrite.jpg" and "pyrite-2.jpg" both denote Pyrite.
      const expected = basename(file, '.jpg').replace(/-\d+$/, '').toLowerCase();

      const variants = await buildVariants(resolve(dir, file));
      const inputs = await processor(variants);
      const { image_embeds } = await model(inputs);
      const [rows, cols] = image_embeds.dims;

      const embedding = averageEmbeddings(image_embeds.data, rows, cols);
      const ranked = rank(classProbabilities(embedding, ctx), ctx.classes, TOP_K);

      const names = ranked.map((r) => r.class.toLowerCase());
      const ok1 = names[0] === expected;
      const ok3 = names.slice(0, 3).includes(expected);
      total++;
      if (ok1) hit1++;
      if (ok3) hit3++;

      const idx = ctx.classes.findIndex((c) => c.toLowerCase() === expected);
      const zs = idx >= 0 && !trained.has(idx) ? ' [zero-shot class]' : '';
      const tag = ok1 ? 'OK  ' : ok3 ? '~T3 ' : 'MISS';
      console.log(
        `${tag} ${expected.padEnd(13)}${zs.padEnd(19)} ` +
          ranked
            .slice(0, 3)
            .map((r) => `${r.class} ${(r.confidence * 100).toFixed(1)}%`)
            .join('  |  '),
      );
    }
  }

  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  console.log(`\nTop-1 ${hit1}/${total} (${pct(hit1)})   Top-3 ${hit3}/${total} (${pct(hit3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
