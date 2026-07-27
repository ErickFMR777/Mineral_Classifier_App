# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What ships

A static React SPA plus one dependency-free Python serverless function, deployed to Vercel. **Classification runs in the browser** — CLIP ViT-B/32 via ONNX Runtime. The FastAPI service under `mineral-classifier-app/backend/` is *not deployed*; it exists for retraining and local experimentation, and is excluded by [.vercelignore](.vercelignore). Do not add code that makes the deployment depend on it.

The reason is a hard constraint: torch alone exceeds Vercel's ~250 MB serverless bundle limit, and CLIP's weights plus a cold-start download cannot fit in a 10 s function either.

## Layout

Code lives one level down in [mineral-classifier-app/](mineral-classifier-app/); the repo root holds the deployment config, the [api/](api/) function and the canonical [data/](data/).

## Commands

```bash
npm run install:frontend    # from the repo root
npm run dev                 # Vite on :5173; /api answered by a dev middleware, no Python needed
npm run build               # tsc + vite build — the ONLY typecheck/lint gate in the repo
npm run build:embeddings    # regenerate frontend/public/models/text-embeddings.json
```

Retraining the probe — **no torch needed**, and this is the path to prefer:

```bash
# features come from the same ONNX model the browser runs, which is what makes
# the probe valid at inference time
cd mineral-classifier-app/frontend
node scripts/extract-features.mjs <imagesDir> <manifest.json> <featuresDir>

cd ../backend
pip install numpy scikit-learn
python train_probe.py <featuresDir>   # -> probe.json AND data/model_metrics.json
```

`train_classifier.py` + `export_probe.py` are the legacy torch path, kept only for an existing pickle. Running the FastAPI service itself needs Python 3.11 (torch 2.6 has no 3.14 wheels).

There are no tests. `backend/tests/` contains only an empty `__init__.py`; `pytest` is installed. Single test once files exist: `pytest tests/test_foo.py::test_bar -v`.

## Inference architecture

`src/ml/` is a direct port of `backend/app/models/mineral_classifier.py`, and the two must stay numerically equivalent.

- [engine.ts](mineral-classifier-app/frontend/src/ml/engine.ts) (main thread) decodes the photo, caps the longest side at 800 px, then builds the four test-time-augmentation variants — original, mirrored, 0.9 and 0.85 centre crops — and **transfers** their RGBA buffers to the worker.
- [worker.ts](mineral-classifier-app/frontend/src/ml/worker.ts) embeds all four, L2-normalizes each, averages, normalizes again, then scores:
  - **zero-shot**: cosine similarity against pre-computed text embeddings, `softmax(sim / 0.01)`
  - **trained probe** (only if `public/models/probe.json` exists): multinomial logistic regression over the classes it covers; uncovered classes fall back to zero-shot scaled by `0.3`, then the whole vector is renormalized

No probe is committed (`*.pkl` is gitignored and was never in the repo), so the app runs pure zero-shot by default — exactly how the Python service behaved without its pickle. Measured on real specimen photos, zero-shot gets roughly 4 in 5 right at top-1; the metrics shown in the About section come from `data/model_metrics.json` and describe the *trained* probe, not the zero-shot path.

Two settings in `worker.ts` are deliberate and easy to break:

- `env.backends.onnx.wasm.wasmPaths = undefined` — transformers.js otherwise points ORT at its jsDelivr CDN, which both adds a third-party runtime dependency and strands the 21 MB `.wasm` Vite already emits into `dist/assets/`. Clearing it makes ORT use the self-hosted copy.
- `numThreads = 1` — threading needs `SharedArrayBuffer`, which needs COOP/COEP headers, which would block the cross-origin model download from the HF CDN.

`env.allowLocalModels = false` also matters: our own `/models/` directory holds embeddings, not HF weights, and transformers.js would otherwise probe it.

## Single source of truth

[data/](data/) is read by both the SPA (bundled at build time via a relative import) and [api/index.py](api/index.py). This replaced four separate hand-maintained copies of the mineral list.

| File | Role |
|---|---|
| `minerals.json` | Full geological records; `*_short` fields are the catalog card variants |
| `mineral_classes.json` | **Array order is the integer label space of any trained probe** — reordering invalidates it |
| `mineral_prompts.json` | 4 zero-shot prompts per mineral |
| `model_metrics.json` | Powers the About dashboard |

Editing `minerals.json` or `mineral_prompts.json` requires re-running `npm run build:embeddings`. Adding a mineral means touching `mineral_classes.json`, `minerals.json` and `mineral_prompts.json`, then regenerating embeddings and retraining any probe.

`mineral-classifier-app/models/mineral_classes.json` and `backend/{app/,}data/model_metrics.json` are stale duplicates the backend still reads; the canonical copies are in `data/`.

## Deployment specifics

[vercel.json](vercel.json) rewrites `/api/(.*)` to `/api/index?route=$1` — the function reads the original path from the `route` query parameter, since a Vercel rewrite does not otherwise preserve it. `api/index.py` uses only the standard library on purpose: no `requirements.txt` means no pip resolution and essentially no way for the Python build to fail. `includeFiles: "data/**"` is what puts the JSON in the bundle.

The Vercel **Root Directory must stay at the repo root**. Pointing it at `frontend/` drops `api/` and `data/`.

Vite config notes: `server.fs.allow` is widened to the repo root so `data/` can be imported from outside the Vite root, `optimizeDeps.exclude` holds `@huggingface/transformers`, and `worker.format` is `es` because the inference worker is a code-split module worker.

## Frontend conventions

Three sections switched by `activeSection` state in `App.tsx` — there is no router. All HTTP goes through [client.ts](mineral-classifier-app/frontend/src/api/client.ts), whose `classifyMineral` now calls the local engine and returns the exact shape the old `POST /api/classify/mineral` did, so the rendering components were left untouched. `ModelStatusBar` surfaces the one-off 84 MB download; `preloadModel()` fires on mount so it overlaps with the user choosing a photo.
