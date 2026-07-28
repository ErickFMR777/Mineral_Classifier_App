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
  trained_class_names?: string[];
  /** Classes with no training data at all; scored by zero-shot CLIP only. */
  zero_shot_classes: string[];
  training_dataset: string;
  training_samples: number;
  validation_samples: number;
  test_samples: number;
  inference?: string;
}

// Fields added by train_probe.py are optional: a deployment may still be
// serving a metrics file generated before they existed, and the dashboard must
// degrade rather than crash.
export interface OverallMetrics {
  accuracy: number;
  /** Mean per-class recall — the honest figure when classes are imbalanced. */
  balanced_accuracy?: number;
  top3_accuracy?: number;
  top5_accuracy?: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  weighted_precision: number;
  weighted_recall: number;
  weighted_f1: number;
}

export interface PerClassMetric {
  name: string;
  /** null for zero-shot classes, which are absent from the test split. */
  precision: number | null;
  recall: number | null;
  f1: number | null;
  /** Test-set samples. */
  support: number;
  /** Training samples (train + validation) behind this class. */
  train_support?: number;
  trained?: boolean;
}

/** Class-imbalance summary, used to explain why some classes underperform. */
export interface DatasetBalance {
  min_train_samples: number;
  max_train_samples: number;
  median_train_samples: number;
  imbalance_ratio: number;
  scarce_threshold: number;
  scarce_classes: string[];
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

/**
 * Accuracy measured on photographs from outside the training dataset. Produced
 * by a separate evaluation run, not by train_probe.py, and preserved across
 * retrains.
 */
export interface ExternalValidation {
  source: string;
  samples: number;
  classes_covered: number;
  top1_accuracy: number;
  /** 95% Wilson interval — the sample is small, so the interval is the point. */
  top1_ci95: [number, number];
  top3_accuracy: number;
  benchmark_top1: number;
}

export interface ModelMetrics {
  model_info: ModelInfo;
  overall_metrics: OverallMetrics;
  dataset_balance?: DatasetBalance;
  external_validation?: ExternalValidation;
  per_class_metrics: PerClassMetric[];
  confusion_matrix: ConfusionMatrix;
}
