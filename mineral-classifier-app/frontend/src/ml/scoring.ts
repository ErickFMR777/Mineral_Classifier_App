/**
 * The scoring rule, in one place.
 *
 * This is the numeric core of backend/app/models/mineral_classifier.py, kept
 * free of DOM and ONNX dependencies so that the inference worker, the main
 * thread and the verification scripts all execute the *same* code rather than
 * three copies of it. A verifier that reimplements this logic would happily
 * report green after someone changed the temperature or the blend weight here.
 *
 * Node strips the types, so `scripts/*.mjs` can import this file directly.
 */

/** Softmax temperature for the zero-shot path. */
export const ZERO_SHOT_TEMPERATURE = 0.01;

/** Zero-shot evidence is less trustworthy than the probe's; scale it down. */
export const ZERO_SHOT_WEIGHT = 0.3;

/** Predictions returned per classification: one primary + TOP_K-1 alternatives. */
export const TOP_K = 5;

/** Centre-crop scales for test-time augmentation. */
export const CROP_SCALES = [0.9, 0.85];

/** Longest side an image is reduced to before augmenting. */
export const MAX_SIDE = 800;

/**
 * Exported form of the sklearn LogisticRegression head. `classes` holds the
 * mineral indices the probe was trained on, in sklearn's `classes_` order.
 */
export interface Probe {
  classes: number[];
  coef: number[][];
  intercept: number[];
}

export interface ScoringContext {
  classes: string[];
  /** Row-major [classes.length * embeddingDim] L2-normalized text embeddings. */
  textEmbeddings: Float32Array;
  embeddingDim: number;
  probe: Probe | null;
}

export interface Prediction {
  class: string;
  confidence: number;
}

/** L2-normalize in place and return the same array. */
export function normalize(vec: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

/** Numerically stable softmax over a plain array. */
export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

/**
 * Collapse the test-time-augmentation variants into one embedding: normalize
 * each row, average them, normalize again.
 */
export function averageEmbeddings(flat: Float32Array, rows: number, cols: number): Float32Array {
  const averaged = new Float32Array(cols);
  for (let r = 0; r < rows; r++) {
    const row = normalize(flat.slice(r * cols, (r + 1) * cols));
    for (let c = 0; c < cols; c++) averaged[c] += row[c];
  }
  for (let c = 0; c < cols; c++) averaged[c] /= rows;
  return normalize(averaged);
}

/** Cosine similarity of an image embedding against every class text embedding. */
export function textSimilarities(embedding: Float32Array, ctx: ScoringContext): number[] {
  const sims: number[] = [];
  for (let i = 0; i < ctx.classes.length; i++) {
    let dot = 0;
    const offset = i * ctx.embeddingDim;
    for (let d = 0; d < ctx.embeddingDim; d++) {
      dot += embedding[d] * ctx.textEmbeddings[offset + d];
    }
    sims.push(dot);
  }
  return sims;
}

/**
 * Full 30-class probability vector.
 *
 * Without a probe this is pure zero-shot. With one, the probe owns the classes
 * it was trained on and the remainder fall back to down-weighted zero-shot,
 * after which the whole vector is renormalized — the rule the Python service
 * used.
 */
export function classProbabilities(embedding: Float32Array, ctx: ScoringContext): number[] {
  const zeroShot = softmax(
    textSimilarities(embedding, ctx).map((s) => s / ZERO_SHOT_TEMPERATURE),
  );

  const probe = ctx.probe;
  if (!probe) return zeroShot;

  const logits = probe.coef.map((row, i) => {
    let z = probe.intercept[i];
    for (let d = 0; d < embedding.length; d++) z += row[d] * embedding[d];
    return z;
  });
  const trainedProbs = softmax(logits);

  const full = new Array<number>(ctx.classes.length).fill(0);
  probe.classes.forEach((classIdx, i) => {
    full[classIdx] = trainedProbs[i];
  });

  const trained = new Set(probe.classes);
  for (let i = 0; i < ctx.classes.length; i++) {
    if (!trained.has(i)) full[i] = zeroShot[i] * ZERO_SHOT_WEIGHT;
  }

  const total = full.reduce((a, b) => a + b, 0);
  return total > 0 ? full.map((p) => p / total) : full;
}

/** Highest-scoring classes first, capped at `topK`. */
export function rank(probabilities: number[], classes: string[], topK: number = TOP_K): Prediction[] {
  return probabilities
    .map((confidence, i) => ({ class: classes[i], confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.min(topK, classes.length));
}

/** Decode the base64 Float32 payload of text-embeddings.json. */
export function decodeEmbeddings(base64: string): Float32Array {
  const binary = typeof atob === 'function'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}
