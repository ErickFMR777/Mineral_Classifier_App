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

import {
  averageEmbeddings,
  classProbabilities,
  decodeEmbeddings,
  rank,
  TOP_K,
  type Probe,
  type ScoringContext,
} from './scoring';
import type {
  ImageVariant,
  RawClassification,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

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

let scoring: ScoringContext | null = null;
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;
let visionModel: Awaited<
  ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>
> | null = null;

const post = (msg: WorkerResponse, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(msg, transfer ?? []);

async function load(): Promise<void> {
  post({ type: 'progress', stage: 'embeddings', loaded: 0, total: 1 });

  const embRes = await fetch(`${import.meta.env.BASE_URL}models/text-embeddings.json`);
  if (!embRes.ok) {
    throw new Error(
      'Could not load text-embeddings.json. Run "npm run build:embeddings" and redeploy.',
    );
  }
  const embFile: TextEmbeddingsFile = await embRes.json();

  // Optional: present only after the probe has been trained and exported.
  let probe: Probe | null = null;
  try {
    const probeRes = await fetch(`${import.meta.env.BASE_URL}models/probe.json`);
    if (probeRes.ok) probe = await probeRes.json();
  } catch {
    probe = null;
  }

  scoring = {
    classes: embFile.classes,
    embeddingDim: embFile.shape[1],
    textEmbeddings: decodeEmbeddings(embFile.data),
    probe,
  };

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

  post({ type: 'ready', usingProbe: scoring.probe !== null });
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
  return averageEmbeddings(image_embeds.data as Float32Array, rows, cols);
}

async function classify(variants: ImageVariant[]): Promise<RawClassification> {
  if (!scoring) throw new Error('Scoring context not loaded');
  const start = performance.now();

  const embedding = await embedVariants(variants);
  const ranked = rank(classProbabilities(embedding, scoring), scoring.classes, TOP_K);

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
