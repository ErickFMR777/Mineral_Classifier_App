"""Train the linear probe on pre-extracted CLIP features and emit both the
browser-ready probe and the metrics the About section renders.

Unlike train_classifier.py this needs no torch: the CLIP features are extracted
beforehand by frontend/scripts/extract-features.mjs, using the very same ONNX
model the browser runs, so the probe stays valid at inference time. Only numpy
and scikit-learn are required.

    python train_probe.py <featuresDir>

Writes:
  frontend/public/models/probe.json   - coefficients for the inference worker
  data/model_metrics.json             - metrics consumed by the About dashboard
"""

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)

BACKEND = Path(__file__).resolve().parent
REPO = BACKEND.parent.parent
DATA = REPO / "data"
PROBE_OUT = REPO / "mineral-classifier-app" / "frontend" / "public" / "models" / "probe.json"
METRICS_OUT = DATA / "model_metrics.json"

C_GRID = [0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]
DATASET_NAME = "Nech-C/mineralimage5K-98 (HuggingFace)"

# Classes fitted on fewer images than this are flagged in the About dashboard as
# under-represented rather than simply "bad".
SCARCE_THRESHOLD = 100


def top_k_accuracy(probs: np.ndarray, y_true: np.ndarray, classes: np.ndarray, k: int) -> float:
    top = np.argsort(-probs, axis=1)[:, :k]
    hits = [y_true[i] in classes[top[i]] for i in range(len(y_true))]
    return float(np.mean(hits))


def main() -> int:
    features_dir = Path(sys.argv[1] if len(sys.argv) > 1 else BACKEND / "data" / "features")
    meta = json.loads((features_dir / "features-meta.json").read_text(encoding="utf-8"))

    n, dim = meta["count"], meta["dim"]
    X = np.fromfile(features_dir / "features.bin", dtype=np.float32).reshape(n, dim)
    rows = meta["rows"]
    y = np.array([r["label"] for r in rows], dtype=np.int64)
    splits = np.array([r["split"] for r in rows])

    target_classes = json.loads((DATA / "mineral_classes.json").read_text(encoding="utf-8"))

    tr, va, te = splits == "train", splits == "validation", splits == "test"
    X_train, y_train = X[tr], y[tr]
    X_val, y_val = X[va], y[va]
    X_test, y_test = X[te], y[te]

    print(f"Features {X.shape} from {meta['model']} ({meta['dtype']})")
    print(f"train {len(y_train)}  val {len(y_val)}  test {len(y_test)}\n")

    print("Hyper-parameter sweep on the validation split:")
    best_c, best_acc = 1.0, -1.0
    for c in C_GRID:
        clf = LogisticRegression(C=c, max_iter=3000, random_state=42)
        clf.fit(X_train, y_train)
        acc = accuracy_score(y_val, clf.predict(X_val))
        print(f"  C={c:<7} val_acc={acc:.4f}")
        if acc > best_acc:
            best_acc, best_c = acc, c
    print(f"Best C={best_c} (val_acc={best_acc:.4f})\n")

    # Final model on train+val, exactly as the original pipeline did.
    X_fit = np.concatenate([X_train, X_val])
    y_fit = np.concatenate([y_train, y_val])
    final = LogisticRegression(C=best_c, max_iter=3000, random_state=42)
    final.fit(X_fit, y_fit)

    probs = final.predict_proba(X_test)
    preds = final.predict(X_test)

    accuracy = accuracy_score(y_test, preds)
    balanced = balanced_accuracy_score(y_test, preds)
    top3 = top_k_accuracy(probs, y_test, final.classes_, 3)
    top5 = top_k_accuracy(probs, y_test, final.classes_, 5)
    print(f"*** TEST accuracy {accuracy:.4f} | balanced {balanced:.4f} "
          f"| top-3 {top3:.4f} | top-5 {top5:.4f} ***\n")

    present = sorted(set(y_test.tolist()) | set(preds.tolist()))
    p, r, f1, support = precision_recall_fscore_support(
        y_test, preds, labels=present, zero_division=0
    )
    mac_p, mac_r, mac_f1, _ = precision_recall_fscore_support(
        y_test, preds, labels=present, average="macro", zero_division=0
    )
    wt_p, wt_r, wt_f1, _ = precision_recall_fscore_support(
        y_test, preds, labels=present, average="weighted", zero_division=0
    )

    train_counts = Counter(y_fit.tolist())
    trained_indices = sorted(int(i) for i in final.classes_)
    trained_names = [target_classes[i] for i in trained_indices]
    zero_shot = [c for c in target_classes if c not in trained_names]

    per_class = []
    for idx, cls_idx in enumerate(present):
        per_class.append(
            {
                "name": target_classes[cls_idx],
                "precision": round(float(p[idx]), 4),
                "recall": round(float(r[idx]), 4),
                "f1": round(float(f1[idx]), 4),
                "support": int(support[idx]),
                "train_support": int(train_counts.get(cls_idx, 0)),
                "trained": cls_idx in trained_indices,
            }
        )

    # Zero-shot classes never appear in the test split, but the dashboard should
    # still list them so the coverage gap is visible rather than silently absent.
    for name in zero_shot:
        per_class.append(
            {
                "name": name,
                "precision": None,
                "recall": None,
                "f1": None,
                "support": 0,
                "train_support": 0,
                "trained": False,
            }
        )

    cm = confusion_matrix(y_test, preds, labels=present)
    counts = [c["train_support"] for c in per_class if c["trained"]]

    metrics = {
        "model_info": {
            "name": "CLIP ViT-B/32 + Linear Probe",
            "base_model": "Xenova/clip-vit-base-patch32 (ONNX int8)",
            "classifier_head": f"Logistic Regression (C={best_c})",
            "embedding_dim": dim,
            "total_classes": len(target_classes),
            "trained_classes": len(trained_names),
            "trained_class_names": trained_names,
            "zero_shot_classes": zero_shot,
            "training_dataset": DATASET_NAME,
            "training_samples": int(tr.sum()),
            "validation_samples": int(va.sum()),
            "test_samples": int(te.sum()),
            "inference": "in-browser (ONNX Runtime Web)",
        },
        "overall_metrics": {
            "accuracy": round(float(accuracy), 4),
            "balanced_accuracy": round(float(balanced), 4),
            "top3_accuracy": round(float(top3), 4),
            "top5_accuracy": round(float(top5), 4),
            "macro_precision": round(float(mac_p), 4),
            "macro_recall": round(float(mac_r), 4),
            "macro_f1": round(float(mac_f1), 4),
            "weighted_precision": round(float(wt_p), 4),
            "weighted_recall": round(float(wt_r), 4),
            "weighted_f1": round(float(wt_f1), 4),
        },
        "dataset_balance": {
            "min_train_samples": int(min(counts)),
            "max_train_samples": int(max(counts)),
            "median_train_samples": int(np.median(counts)),
            "imbalance_ratio": round(float(max(counts) / max(min(counts), 1)), 1),
            "scarce_threshold": SCARCE_THRESHOLD,
            "scarce_classes": [
                c["name"]
                for c in sorted(per_class, key=lambda x: x["train_support"])
                if c["trained"] and c["train_support"] < SCARCE_THRESHOLD
            ],
        },
        "per_class_metrics": per_class,
        "confusion_matrix": {
            "labels": [target_classes[i] for i in present],
            "matrix": cm.tolist(),
        },
    }

    METRICS_OUT.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {METRICS_OUT}")

    PROBE_OUT.parent.mkdir(parents=True, exist_ok=True)
    PROBE_OUT.write_text(
        json.dumps(
            {
                "classes": trained_indices,
                "coef": [[float(v) for v in row] for row in final.coef_],
                "intercept": [float(v) for v in final.intercept_],
            }
        ),
        encoding="utf-8",
    )
    size_mb = PROBE_OUT.stat().st_size / 1024 / 1024
    print(f"Wrote {PROBE_OUT} ({size_mb:.1f} MB)")
    print(f"\nTrained on {len(trained_names)}/{len(target_classes)} classes")
    print(f"Zero-shot fallback: {zero_shot}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
