# Mineral Classifier App

Web application that classifies minerals from uploaded photos using Deep Learning (CLIP ViT-B/32 + Linear Probe).

## Features

- Upload mineral photos (drag-drop or click)
- AI-powered classification of 30 mineral types
- Confidence scores with visual bars
- Complete mineral properties: chemical formula, hardness, color, luster, crystal system
- Formation processes, occurrence locations, and industrial uses
- Top 5 alternative mineral matches
- Responsive design with animations

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + Transformers (CLIP) + Scikit-learn
- **ML Model**: CLIP ViT-B/32 embeddings + Logistic Regression classifier

## Quick Start

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

### Access
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Mineral Types (30)

Quartz, Feldspar, Mica, Calcite, Hematite, Magnetite, Galena, Pyrite, Chalcopyrite, Malachite, Limonite, Bauxite, Corundum, Diamond, Graphite, Olivine, Amphibole, Pyroxene, Fluorite, Apatite, Tourmaline, Beryl, Topaz, Garnet, Zircon, Talc, Gypsum, Sulfur, Halite, Azurite

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/classify/mineral` | Classify mineral from image |
| GET | `/api/reference/minerals` | List all 30 mineral types |
| GET | `/api/reference/minerals/{name}` | Get mineral details |
| GET | `/api/model-metrics` | Model metrics & confusion matrix |
| GET | `/api/health` | Health check |

## License

MIT
