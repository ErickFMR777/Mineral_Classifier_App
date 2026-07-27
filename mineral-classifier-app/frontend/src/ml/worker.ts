/// <reference lib="webworker" />
/**
 * In-browser port of backend/app/models/mineral_classifier.py.
 *
 * Runs CLIP ViT-B/32's vision encoder through ONNX Runtime (WebAssembly/WebGPU)
 * and reproduces the same two-path scoring as the Python service:
 *
 *   - trained path : logistic-regression probe over the classes that had
 *                    training data (loaded from /models/probe.json if present)
 *   - zero-shot    : cosine similarity against pre-computed text embeddings,
 *                    softmaxed at temperature 0.01, scaled by 0.3 and used only
 *                    for the classes the probe does not cover
 *
 * With no probe file the whole thing degrades to pure zero-shot, exactly like
 * the Python classifier does when mineral_classifier_head.pkl is missing.
 */
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from '@huggingface/transformers';

import type {
  ImageVariant,
  RawClassification,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';
const TOP_K = 5;
/** Softmax temperature for the zero-shot path (mirrors the Python code). */
const ZERO_SHOT_TEMPERATURE = 0.01;
/** Zero-shot probabilities are less trustworthy than the probe's; scale down. */
const ZERO_SHOT_WEIGHT = 0.3;

// Our own /models/ directory holds the pre-computed embeddings, not HF models.
// Without this transformers.js would probe it for local weights and 404.
env.allowLocalModels = false;

const wasmBackend = env.backends.onnx?.wasm;
if (wasmBackend) {
  // transformers.js defaults wasmPaths to its own jsDelivr CDN. Clearing it
  // makes onnxruntime-web fall back to the copy Vite already emits into our
  // bundle, so the ~21 MB runtime is served from Vercel instead of a
  // third-party CDN — and the emitted asset stops being dead weight. It also
  // lets ORT use its inlined loader rather than fetching a separate .mjs.
  wasmBackend.wasmPaths = undefined;

  // Multi-threading needs SharedArrayBuffer, which needs COOP/COEP headers,
  // which would in turn block the cross-origin model download. Pin to one
  // thread so ORT skips the probe and the console warning that comes with it.
  wasmBackend.numThreads = 1;
}

interface TextEmbeddingsFile {
  classes: string[];
  shape: [number, number];
  data: string;
}

/**
 * Exported form of the sklearn LogisticRegression head. `classes` holds the
 * mineral indices the probe was trained on, in sklearn's `classes_` order.
 */
interface ProbeFile {
  classes: number[];
  coef: number[][];
  intercept: number[];
}

let classes: string[] = [];
let textEmbeddings: Float32Array | null = null;
let embeddingDim = 0;
let probe: ProbeFile | null = null;
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;
let visionModel: Awaited<
  ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>
> | null = null;

const post = (msg: WorkerResponse, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(msg, transfer ?? []);

function decodeBase64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/** L2-normalize in place and return the same array. */
function normalize(vec: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

/** Numerically stable softmax over a plain array. */
function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

async function load(): Promise<void> {
  post({ type: 'progress', stage: 'embeddings', loaded: 0, total: 1 });

  const embRes = await fetch(`${import.meta.env.BASE_URL}models/text-embeddings.json`);
  if (!embRes.ok) {
    throw new Error(
      'Could not load text-embeddings.json. Run "npm run build:embeddings" and redeploy.',
    );
  }
  const embFile: TextEmbeddingsFile = await embRes.json();
  classes = embFile.classes;
  embeddingDim = embFile.shape[1];
  textEmbeddings = decodeBase64ToFloat32(embFile.data);

  // Optional: present only after train_classifier.py + export_probe.py have run.
  try {
    const probeRes = await fetch(`${import.meta.env.BASE_URL}models/probe.json`);
    if (probeRes.ok) probe = await probeRes.json();
  } catch {
    probe = null;
  }

  post({ type: 'progress', stage: 'model', loaded: 0, total: 1 });

  const progress_callback = (item: { status?: string; loaded?: number; total?: number }) => {
    if (item.status === 'progress' && typeof item.total === 'number' && item.total > 0) {
      post({
        type: 'progress',
        stage: 'model',
        loaded: item.loaded ?? 0,
        total: item.total,
      });
    }
  };

  processor = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });
  visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
    // int8 weights: 84 MB instead of 335 MB, with negligible accuracy loss.
    dtype: 'q8',
    device: 'wasm',
    progress_callback,
  });

  post({ type: 'ready', usingProbe: probe !== null });
}

/**
 * Averaged CLIP embedding over the test-time-augmentation variants — the port
 * of `_get_augmented_embedding`: each variant is embedded and L2-normalized,
 * the results are averaged, then normalized again.
 */
async function embedVariants(variants: ImageVariant[]): Promise<Float32Array> {
  if (!processor || !visionModel) throw new Error('Model not loaded');

  const images = variants.map((v) =>
    new RawImage(new Uint8ClampedArray(v.data), v.width, v.height, 4).rgb(),
  );

  const inputs = await processor(images);
  const { image_embeds } = await visionModel(inputs);

  const [rows, cols] = image_embeds.dims as [number, number];
  const flat = image_embeds.data as Float32Array;

  const averaged = new Float32Array(cols);
  for (let r = 0; r < rows; r++) {
    const row = normalize(flat.slice(r * cols, (r + 1) * cols));
    for (let c = 0; c < cols; c++) averaged[c] += row[c];
  }
  for (let c = 0; c < cols; c++) averaged[c] /= rows;
  return normalize(averaged);
}

/** Cosine similarity of the image embedding against every class text embedding. */
function textSimilarities(embedding: Float32Array): number[] {
  if (!textEmbeddings) throw new Error('Embeddings not loaded');
  const sims: number[] = [];
  for (let i = 0; i < classes.length; i++) {
    let dot = 0;
    const offset = i * embeddingDim;
    for (let d = 0; d < embeddingDim; d++) dot += embedding[d] * textEmbeddings[offset + d];
    sims.push(dot);
  }
  return sims;
}

function classProbabilities(embedding: Float32Array): number[] {
  const zeroShot = softmax(textSimilarities(embedding).map((s) => s / ZERO_SHOT_TEMPERATURE));

  if (!probe) return zeroShot;

  // Trained path: multinomial logistic regression over the covered classes.
  const logits = probe.coef.map((row, i) => {
    let z = probe!.intercept[i];
    for (let d = 0; d < embedding.length; d++) z += row[d] * embedding[d];
    return z;
  });
  const trainedProbs = softmax(logits);

  const full = new Array<number>(classes.length).fill(0);
  probe.classes.forEach((classIdx, i) => {
    full[classIdx] = trainedProbs[i];
  });

  // Classes the probe never saw fall back to (down-weighted) zero-shot.
  const trained = new Set(probe.classes);
  for (let i = 0; i < classes.length; i++) {
    if (!trained.has(i)) full[i] = zeroShot[i] * ZERO_SHOT_WEIGHT;
  }

  const total = full.reduce((a, b) => a + b, 0);
  return total > 0 ? full.map((p) => p / total) : full;
}

async function classify(variants: ImageVariant[]): Promise<RawClassification> {
  const start = performance.now();

  const embedding = await embedVariants(variants);
  const probabilities = classProbabilities(embedding);

  const ranked = probabilities
    .map((confidence, i) => ({ class: classes[i], confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.min(TOP_K, classes.length));

  return {
    primary: ranked[0],
    alternatives: ranked.slice(1),
    inference_time_ms: Math.round(performance.now() - start),
  };
}

let loadPromise: Promise<void> | null = null;

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  try {
    if (msg.type === 'load') {
      loadPromise = loadPromise ?? load();
      await loadPromise;
      return;
    }

    if (msg.type === 'classify') {
      loadPromise = loadPromise ?? load();
      await loadPromise;
      post({ type: 'result', id: msg.id, result: await classify(msg.variants) });
    }
  } catch (err) {
    // A failed load must not stay cached, or every later attempt would reject
    // with the same stale rejection instead of retrying.
    if (!visionModel) loadPromise = null;
    post({
      type: 'error',
      id: msg.type === 'classify' ? msg.id : null,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
