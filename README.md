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

The probe covers 25 of the 30 classes. **Bauxite, Diamond, Olivine, Talc and Halite have no training images at all** — they exist nowhere in the source dataset — so they are scored by zero-shot CLIP only and are markedly less reliable. Training data is also very uneven (2,015 images for Quartz against 36 for Azurite, a 56:1 ratio), which is why balanced accuracy sits 13 points below top-1. The **Limitations** tab in the app's About section spells all of this out.

## Quick start

Node 18+ is the only requirement.

```bash
npm run install:frontend
npm run dev            # http://localhost:5173
```

The dev server also answers the `/api` routes, so nothing else needs to be running. Or use `./run_all.sh`, which does the install and the one-off embedding generation for you.

## Deploying to Vercel

Import the repository and deploy — [vercel.json](vercel.json) already sets the build command, the output directory and the routing. Leave the **Root Directory** as the repo root; do not point it at `frontend/`, or the `api/` function and `data/` will be left out.

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

## Data

[data/](data/) is the single source of truth, read by both the SPA and the serverless function:

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
