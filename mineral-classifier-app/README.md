# Mineral Classifier — application code

See the [repository README](../README.md) for deployment and the overall picture.

```
mineral-classifier-app/
├── frontend/     React SPA + in-browser CLIP inference (this is what ships)
├── backend/      FastAPI + PyTorch — training and local experiments only
└── models/       Legacy copy of mineral_classes.json (canonical lives in ../data/)
```

## Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173, /api served by a dev middleware
npm run build             # tsc typecheck + vite build (the only lint/type gate)
npm run build:embeddings  # regenerate public/models/text-embeddings.json
```

Key directories:

| Path | Role |
|---|---|
| `src/ml/engine.ts` | Main-thread client: decodes the photo, builds the 4 augmentation variants, talks to the worker |
| `src/ml/worker.ts` | Loads CLIP, runs inference, blends the probe and zero-shot scores |
| `src/ml/protocol.ts` | Message types shared by the two |
| `src/data/minerals.ts` | Typed access to `data/minerals.json` + prediction enrichment |
| `src/components/` | The three sections: classifier, catalog, about |

## Backend (not deployed)

Kept so the model can be retrained and so the original REST service still runs locally. It cannot be deployed to Vercel — torch alone exceeds the serverless bundle limit.

```bash
cd backend
python3.11 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000             # http://localhost:8000/docs
```

Retraining and exporting for the browser:

```bash
pip install datasets                # not in requirements.txt
python train_classifier.py          # writes data/mineral_classifier_head.pkl
python export_probe.py              # converts it to frontend/public/models/probe.json
```

## Mineral types (30)

Quartz, Feldspar, Mica, Calcite, Hematite, Magnetite, Galena, Pyrite, Chalcopyrite, Malachite, Limonite, Bauxite, Corundum, Diamond, Graphite, Olivine, Amphibole, Pyroxene, Fluorite, Apatite, Tourmaline, Beryl, Topaz, Garnet, Zircon, Talc, Gypsum, Sulfur, Halite, Azurite

## License

MIT
