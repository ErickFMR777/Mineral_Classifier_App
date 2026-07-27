"""Export the trained linear probe so the browser classifier can use it.

`train_classifier.py` produces a pickled scikit-learn LogisticRegression head.
Pickles cannot be read in the browser, so this converts the only three arrays
that matter — the class indices, the coefficients and the intercepts — into a
small JSON file the inference worker fetches at startup.

    python export_probe.py

Writes frontend/public/models/probe.json (~1 MB for 25 classes x 512 dims).
When that file is absent the app runs pure zero-shot, exactly as the Python
service does without the pickle.

Note that train_classifier.py writes the pickle to backend/data/ while the old
FastAPI service loaded it from backend/app/data/; both locations are checked
here so either layout works.
"""

import json
import pickle
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
CANDIDATE_PICKLES = [
    BACKEND / "data" / "mineral_classifier_head.pkl",
    BACKEND / "app" / "data" / "mineral_classifier_head.pkl",
]
CLASSES_PATH = BACKEND.parent.parent / "data" / "mineral_classes.json"
OUT_PATH = BACKEND.parent / "frontend" / "public" / "models" / "probe.json"


def main() -> int:
    pickle_path = next((p for p in CANDIDATE_PICKLES if p.exists()), None)
    if pickle_path is None:
        print("No trained probe found. Looked in:")
        for candidate in CANDIDATE_PICKLES:
            print(f"  - {candidate}")
        print("\nRun `python train_classifier.py` first, or leave it as is to")
        print("keep the app running in pure zero-shot mode.")
        return 1

    with open(pickle_path, "rb") as handle:
        payload = pickle.load(handle)

    classifier = payload["classifier"]
    classes = json.loads(CLASSES_PATH.read_text(encoding="utf-8"))

    class_indices = [int(i) for i in classifier.classes_]
    coef = [[float(v) for v in row] for row in classifier.coef_]
    intercept = [float(v) for v in classifier.intercept_]

    if len(coef) != len(class_indices):
        raise SystemExit(
            f"Unexpected shapes: {len(coef)} coefficient rows for "
            f"{len(class_indices)} classes. A binary probe is not supported."
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "classes": class_indices,
                "coef": coef,
                "intercept": intercept,
            },
            handle,
        )

    covered = [classes[i] for i in class_indices]
    missing = [c for c in classes if c not in covered]
    size_mb = OUT_PATH.stat().st_size / 1024 / 1024

    print(f"Read   {pickle_path}")
    print(f"Wrote  {OUT_PATH} ({size_mb:.1f} MB)")
    print(f"Probe covers {len(covered)}/{len(classes)} classes")
    if missing:
        print(f"Zero-shot fallback for: {', '.join(missing)}")
    if "test_accuracy" in payload:
        print(f"Reported test accuracy: {payload['test_accuracy']:.1%}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
