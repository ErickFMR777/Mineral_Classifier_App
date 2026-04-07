# Mineral Classifier App

Web application that classifies minerals from uploaded photos using Deep Learning (CLIP ViT-B/32 + Linear Probe).

## Features

- Upload mineral photos (drag & drop or click)
- AI-powered classification of 30 mineral types
- Confidence scores with visual indicators
- Complete mineral properties: chemical formula, hardness, color, luster, crystal system
- Formation processes, occurrence locations, and industrial uses
- Top 5 alternative mineral matches
- Model performance dashboard with per-class metrics and confusion matrix
- Responsive design with animations

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + Transformers (CLIP) + Scikit-learn
- **ML Model**: CLIP ViT-B/32 embeddings + Logistic Regression classifier

## Quick Start

### Backend
```bash
cd mineral-classifier-app/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd mineral-classifier-app/frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

## Project Structure

```
mineral-classifier-app/
├── backend/          # FastAPI server + ML model
├── frontend/         # React SPA
├── models/           # Mineral class definitions
└── docs/             # Documentation
```

## License

MIT

## Run (all-in-one)

If you want a single command to create the backend venv, install dependencies and start both backend and frontend in the background, use the helper script at the repository root:

```bash
./run_all.sh
```

This script writes logs to `mineral-classifier-app/backend/backend.log` and `mineral-classifier-app/frontend/frontend.log`.