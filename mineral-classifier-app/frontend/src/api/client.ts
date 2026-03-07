import axios from 'axios';
import { ClassificationResult, ModelMetrics } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export async function classifyMineral(file: File): Promise<ClassificationResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await client.post<ClassificationResult>(
    '/classify/mineral',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
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
