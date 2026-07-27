import axios from 'axios';
import { ClassificationResult, ModelMetrics } from '../types';
import { classifyImage } from '../ml/engine';
import { enrichPrediction } from '../data/minerals';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

/**
 * Classify a mineral photo.
 *
 * Inference runs in the browser (see src/ml/), so this never leaves the device:
 * no upload, no server round trip, and nothing to deploy beyond static assets.
 * The result is shaped exactly like the old POST /api/classify/mineral response
 * so every consuming component stays unchanged.
 */
export async function classifyMineral(file: File): Promise<ClassificationResult> {
  const raw = await classifyImage(file);

  return {
    primary: enrichPrediction(raw.primary.class, raw.primary.confidence),
    alternatives: raw.alternatives.map((a) => ({
      class: a.class,
      confidence: a.confidence,
    })),
    inference_time_ms: raw.inference_time_ms,
  };
}

export async function getMinerals() {
  const response = await client.get('/reference/minerals');
  return response.data;
}

export async function getMineralDetails(mineralName: string) {
  const response = await client.get(`/reference/minerals/${encodeURIComponent(mineralName)}`);
  return response.data;
}

export async function healthCheck() {
  const response = await client.get('/health');
  return response.data;
}

export async function getModelMetrics(): Promise<ModelMetrics> {
  const response = await client.get<ModelMetrics>('/model-metrics');
  return response.data;
}

export default client;
