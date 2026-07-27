/**
 * Message protocol between the main thread and the inference worker.
 *
 * Image decoding and cropping happen on the main thread (cheap, and avoids
 * requiring OffscreenCanvas); only raw RGBA buffers cross the boundary, and
 * they are transferred rather than copied.
 */

/** A single test-time-augmentation variant, as raw RGBA pixels. */
export interface ImageVariant {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface RawPrediction {
  class: string;
  confidence: number;
}

export interface RawClassification {
  primary: RawPrediction;
  alternatives: RawPrediction[];
  inference_time_ms: number;
}

export type WorkerRequest =
  | { type: 'load' }
  | { type: 'classify'; id: number; variants: ImageVariant[] };

export type WorkerResponse =
  | { type: 'progress'; stage: LoadStage; loaded: number; total: number }
  | { type: 'ready'; usingProbe: boolean }
  | { type: 'result'; id: number; result: RawClassification }
  | { type: 'error'; id: number | null; message: string };

export type LoadStage = 'embeddings' | 'model' | 'ready';
