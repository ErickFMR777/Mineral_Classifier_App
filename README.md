# Mineral Classifier App

Web application that identifies minerals from photos using CLIP ViT-B/32, running **entirely in the browser**. Deployable to Vercel as a static site plus one dependency-free serverless function.

## Sections

- **Classifier** — drag & drop a specimen photo, get a classification with confidence, full geological properties and alternative matches
- **Catalog** — searchable, filterable reference for all 30 mineral types
- **About** — how it works, plus a live dashboard of the model's metrics and confusion matrix

## How inference works

The original version ran CLIP on a FastAPI server. PyTorch alone is far larger than Vercel's serverless bundle limit, so the model now runs client-side:

1. CLIP ViT-B/32's vision encoder (ONNX, int8, 84 MB) is downloaded once from the Hugging Face CDN and cached by the browser.
2. A Web Worker embeds the photo four times — original, mirrored and two centre crops — and averages the results (the same test-time augmentation the Python classifier used).
3. That 512-d embedding is scored by a trained linear probe, with pre-computed zero-shot text embeddings covering the classes the probe has no data for.

Photos never leave the device, and after the first load the classifier works offline.

## Accuracy

Measured on a held-out test split of 1,539 specimen photographs:

| | |
|---|---|
| Top-1 accuracy | **71.2 %** |
| Top-3 accuracy | 88.9 % |
| Top-5 accuracy | 93.7 % |
| Balanced accuracy | 58.5 % |
| Weighted F1 | 70.6 % |

The probe covers 25 of the 30 classes. **Bauxite, Diamond, Olivine, Talc and Halite have no training images at all** — they exist nowhere in the source dataset — so they are scored by zero-shot CLIP only and are markedly less reliable. Training data is also very uneven (2,015 images for Quartz against 36 for Azurite, a 56:1 ratio), which is why balanced accuracy sits 13 points below top-1.

**Those figures describe the benchmark, not the real world.** Evaluated against 47 ordinary Wikimedia photographs across 24 minerals — outside the training distribution — top-1 accuracy falls to **≈25 %** (95 % interval 15–40 %), with the correct answer in the top three about half the time. The sample is small and its labels come from image-search titles, so read the exact figure loosely; the size of the drop is not in doubt. The **Limitations** tab in the app's About section spells all of this out, including the fact that the confidence percentage is not calibrated.

## Quick start

Node 18+ is the only requirement.

```bash
npm run install:frontend
npm run dev            # http://localhost:5173
```

The dev server also answers the `/api` routes, so nothing else needs to be running. Or use `./run_all.sh`, which does the install and the one-off embedding generation for you.

## Verifying before you deploy

```bash
npm run build        # typecheck + bundle
npm run verify:dist  # invariants the build cannot see
```

To exercise the built bundle in a real browser — the worker, canvas augmentation, ONNX under WebAssembly and the model download, none of which Node can reach:

```bash
cd mineral-classifier-app/frontend
npm i -D playwright && npx playwright install chromium   # one-off
npm run e2e -- <dirOfImagesNamedByClass>
```

It serves `dist/` the way Vercel does (`npm run serve:dist` on its own if you just want to click around), loads the page, waits for the model, classifies each photo, walks all three sections and fails on any console error or broken request.

`verify` exercises the real scoring module — the same `src/ml/scoring.ts` the browser runs — and checks the things that fail silently: text embeddings that are no longer unit length, a probe whose class indices fall outside the class list, a confusion matrix that stops totalling the test set, a mineral renamed out of `minerals.json` (which would render a result card with no formula or hardness), and the ONNX runtime quietly reverting to a third-party CDN.

## Deploying to Vercel

Import the repository and deploy — [vercel.json](vercel.json) sets the build command, the output directory, the routing and `framework: null`, so it overrides whatever preset the dashboard may have guessed.

**Two settings live only in the dashboard and cannot be fixed from this repo:**

| Setting | Required value | If it is wrong |
|---|---|---|
| Settings → General → **Root Directory** | *empty* (the repo root) | The build aborts with an explicit message. Pointing it at `frontend/` or `backend/` also drops `api/` and `data/` from the deployment entirely. |
| Settings → **Deployment Protection** | off, for a public site | The site compiles and deploys but every visitor hits Vercel's login wall. |

The install command guards the first one, so a misconfigured Root Directory fails in seconds with an actionable error instead of a confusing "package.json not found". The build then runs `verify:dist`, so a deployment cannot ship with broken artefacts.

| | |
|---|---|
| Build | `npm --prefix mineral-classifier-app/frontend run build` |
| Output | `mineral-classifier-app/frontend/dist` |
| Functions | `api/index.py` (Python standard library only, no `requirements.txt`) |

The Python backend under `mineral-classifier-app/backend/` is excluded via [.vercelignore](.vercelignore). It is kept for training and local experimentation only — it is not part of the deployment.

## API

Served by a single serverless function. All endpoints are public, CORS-enabled and edge-cached.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/reference/minerals` | List all 30 mineral types |
| GET | `/api/reference/minerals/{name}` | Full record for one mineral |
| GET | `/api/model-metrics` | Metrics and confusion matrix |

`POST /api/classify/mineral` is gone and returns **410 Gone** — classification is a client-side operation now.

## What must stay committed

The app has no external model store: everything it needs at runtime is in the repository, except the CLIP vision encoder, which the browser fetches from the Hugging Face CDN and caches.

| Artefact | Size | Losing it |
|---|---|---|
| `frontend/public/models/text-embeddings.json` | 82 KB | Classifier fails to start |
| `frontend/public/models/probe.json` | 258 KB | Silently degrades to zero-shot (19 % instead of 71 %) |
| `data/*.json` | 76 KB | Catalog, About and enrichment break |

None of these break the build — they break the deployed app, in production only. Two guards exist: the root [.gitignore](.gitignore) carries explicit negations for those paths, and `npm run verify` asserts that git is actually tracking each one and that no ignore rule would swallow a regenerated copy.

Training intermediates (`*.pkl`, `*.npy`, `*.pt`) *are* ignored on purpose — they are large and regenerable, and nothing at runtime reads them.

## Data

[data/](data/) is the single source of truth, read by the SPA, the serverless function and the backend alike:

| File | Contents |
|---|---|
| `minerals.json` | The 30 minerals with their full geological records |
| `mineral_classes.json` | Class order — **this is the label index space of the trained probe** |
| `mineral_prompts.json` | Zero-shot prompt ensemble (4 per mineral) |
| `model_metrics.json` | Evaluation metrics shown in the About section |

Editing `minerals.json` or `mineral_prompts.json` means re-running `npm run build:embeddings`.

## Retraining the classifier

A trained linear probe ships in `frontend/public/models/probe.json`; the worker loads it automatically and falls back to zero-shot for any class it does not cover. The training pipeline needs **no PyTorch** — features are extracted with the same ONNX model the browser runs, so the probe is guaranteed valid at inference time.

```bash
# 1. Fetch data/*.parquet from Nech-C/mineralimage5K-98 and extract the images
#    that map onto our 30 classes (see scripts/ in the repo history for the helper)

# 2. Extract CLIP embeddings with the exact browser model
cd mineral-classifier-app/frontend
node scripts/extract-features.mjs <imagesDir> <manifest.json> <featuresDir>

# 3. Fit the probe and regenerate the metrics dashboard
cd ../backend
pip install numpy scikit-learn
python train_probe.py <featuresDir>
```

Step 3 writes both `frontend/public/models/probe.json` and `data/model_metrics.json`. `export_probe.py` is a separate converter for anyone who still has a pickle from the legacy `train_classifier.py` (that path does require torch).

Verify a trained probe against real photos with:

```bash
node scripts/verify-classifier.mjs <dirOfImagesNamedByClass>
```

## Tech stack

React 18 · TypeScript · Tailwind CSS · Framer Motion · Transformers.js · ONNX Runtime Web · Vercel Python Functions

## License

MIT
