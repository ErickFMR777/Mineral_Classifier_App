export interface MineralInfo {
  class: string;
  confidence: number;
  chemical_formula?: string;
  hardness?: string;
  color?: string;
  luster?: string;
  crystal_system?: string;
  density?: string;
  streak?: string;
  cleavage?: string;
  formation?: string[];
  occurrence?: string[];
  uses?: string[];
  description?: string;
}

export interface AlternativeMatch {
  class: string;
  confidence: number;
}

export interface ClassificationResult {
  primary: MineralInfo;
  alternatives: AlternativeMatch[];
  inference_time_ms: number;
}

export interface Mineral {
  id: number;
  name: string;
  chemical_formula: string;
  hardness: string;
  color: string;
  luster: string;
  crystal_system: string;
  description: string;
  uses: string[];
}

export interface ModelInfo {
  name: string;
  base_model: string;
  classifier_head: string;
  embedding_dim: number;
  total_classes: number;
  trained_classes: number;
  zero_shot_classes: string[];
  training_dataset: string;
  training_samples: number;
  validation_samples: number;
  test_samples: number;
}

export interface OverallMetrics {
  accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  weighted_precision: number;
  weighted_recall: number;
  weighted_f1: number;
}

export interface PerClassMetric {
  name: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

export interface ModelMetrics {
  model_info: ModelInfo;
  overall_metrics: OverallMetrics;
  per_class_metrics: PerClassMetric[];
  confusion_matrix: ConfusionMatrix;
}
