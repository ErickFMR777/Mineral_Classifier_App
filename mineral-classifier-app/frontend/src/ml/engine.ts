/**
 * Main-thread client for the CLIP inference worker.
 *
 * Owns image decoding and the test-time-augmentation crops (the port of
 * `_get_augmented_embedding`'s image handling), then hands raw RGBA buffers to
 * the worker so the 84 MB model never blocks the UI thread.
 */
import type {
  ImageVariant,
  RawClassification,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

/** Scales used for the two centre crops, matching the Python implementation. */
const CROP_SCALES = [0.9, 0.85];

/** Upper bound on the longest side before augmenting — CLIP resizes to 224 anyway. */
const MAX_SIDE = 800;

export interface ModelLoadProgress {
  /** 0..1 across the whole load, or null while the size is still unknown. */
  ratio: number | null;
  loadedBytes: number;
  totalBytes: number;
}

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

let worker: Worker | null = null;
let requestId = 0;

const pending = new Map<
  number,
  { resolve: (r: RawClassification) => void; reject: (e: Error) => void }
>();

type ProgressListener = (p: ModelLoadProgress) => void;
type StatusListener = (s: EngineStatus, detail?: string) => void;

const progressListeners = new Set<ProgressListener>();
const statusListeners = new Set<StatusListener>();

/** Per-file download totals, so the bar reflects every asset, not just the last. */
const downloads = new Map<string, { loaded: number; total: number }>();

// Latest state is retained so a listener that subscribes late — React
// StrictMode remounts, or a component mounted after the model finished — is
// replayed the current value instead of waiting forever for the next event.
let currentStatus: EngineStatus = 'idle';
let currentDetail: string | undefined;
let currentProgress: ModelLoadProgress | null = null;

export const onProgress = (fn: ProgressListener): (() => void) => {
  progressListeners.add(fn);
  if (currentProgress) fn(currentProgress);
  return () => progressListeners.delete(fn);
};

export const onStatus = (fn: StatusListener): (() => void) => {
  statusListeners.add(fn);
  if (currentStatus !== 'idle') fn(currentStatus, currentDetail);
  return () => statusListeners.delete(fn);
};

function emitStatus(s: EngineStatus, detail?: string) {
  currentStatus = s;
  currentDetail = detail;
  statusListeners.forEach((fn) => fn(s, detail));
}

function emitProgress() {
  let loaded = 0;
  let total = 0;
  for (const d of downloads.values()) {
    loaded += d.loaded;
    total += d.total;
  }
  const p: ModelLoadProgress = {
    ratio: total > 0 ? Math.min(loaded / total, 1) : null,
    loadedBytes: loaded,
    totalBytes: total,
  };
  currentProgress = p;
  progressListeners.forEach((fn) => fn(p));
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;

    switch (msg.type) {
      case 'progress': {
        // Keyed by size: distinct assets have distinct totals, and re-reported
        // chunks for the same asset overwrite rather than accumulate.
        downloads.set(`${msg.stage}:${msg.total}`, { loaded: msg.loaded, total: msg.total });
        emitProgress();
        break;
      }
      case 'ready':
        emitStatus('ready');
        break;
      case 'result': {
        pending.get(msg.id)?.resolve(msg.result);
        pending.delete(msg.id);
        break;
      }
      case 'error': {
        if (msg.id === null) {
          // No request id means the load itself failed, so the engine really is
          // unusable. A failed *classification* only rejects its own promise —
          // marking the whole engine broken there would wrongly tell the user
          // the model never loaded.
          emitStatus('error', msg.message);
        } else {
          pending.get(msg.id)?.reject(new Error(msg.message));
          pending.delete(msg.id);
        }
        break;
      }
    }
  });

  worker.addEventListener('error', (event) => {
    const message = event.message || 'Inference worker crashed';
    pending.forEach(({ reject }) => reject(new Error(message)));
    pending.clear();
    emitStatus('error', message);
  });

  return worker;
}

const send = (msg: WorkerRequest, transfer?: Transferable[]) =>
  getWorker().postMessage(msg, transfer ?? []);

/** Kick off model download ahead of the first classification. */
export function preloadModel(): void {
  emitStatus('loading');
  send({ type: 'load' });
}

function toVariant(
  source: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  flip: boolean,
): ImageVariant {
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (flip) {
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

  const { data, width, height } = ctx.getImageData(0, 0, sw, sh);
  return { data, width, height };
}

/** Original + mirrored + two centre crops, as in the Python classifier. */
async function buildVariants(file: File): Promise<ImageVariant[]> {
  let bitmap = await createImageBitmap(file);

  // Downscale very large photos first; the crops stay proportionally identical.
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest > MAX_SIDE) {
    const scale = MAX_SIDE / longest;
    const resized = await createImageBitmap(bitmap, {
      resizeWidth: Math.round(bitmap.width * scale),
      resizeHeight: Math.round(bitmap.height * scale),
    });
    bitmap.close();
    bitmap = resized;
  }

  const { width: w, height: h } = bitmap;
  const variants: ImageVariant[] = [
    toVariant(bitmap, 0, 0, w, h, false),
    toVariant(bitmap, 0, 0, w, h, true),
  ];

  for (const scale of CROP_SCALES) {
    const cw = Math.floor(w * scale);
    const ch = Math.floor(h * scale);
    variants.push(toVariant(bitmap, (w - cw) >> 1, (h - ch) >> 1, cw, ch, false));
  }

  bitmap.close();
  return variants;
}

/** Classify a mineral photo entirely in the browser. */
export async function classifyImage(file: File): Promise<RawClassification> {
  const variants = await buildVariants(file);
  const id = ++requestId;

  return new Promise<RawClassification>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    send(
      { type: 'classify', id, variants },
      variants.map((v) => v.data.buffer),
    );
  });
}
