"""
Main FastAPI application for Mineral Classifier.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from .config import ALLOWED_ORIGINS, API_HOST, API_PORT, API_RELOAD, LOG_LEVEL
from .utils.model_loader import load_mineral_model
from .routers import classify, reference

# Configure logging
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events. Loads ML models at startup."""
    logger.info("Mineral Classifier API starting...")
    try:
        app.state.mineral_classifier = load_mineral_model()
        logger.info("Mineral classification model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load mineral classifier: {e}")
        # Keep server running even if model failed to load; mark as unavailable
        app.state.mineral_classifier = None
        logger.warning(
            "Continuing without mineral classifier (classification endpoints will return 503)"
        )

    yield

    logger.info("Mineral Classifier API shutting down...")


app = FastAPI(
    title="Mineral Classifier API",
    description="Deep Learning API for mineral classification from images",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(classify.router, prefix="/api/classify", tags=["Classification"])
app.include_router(reference.router, prefix="/api/reference", tags=["Reference Data"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "mineral-classifier-api", "version": "1.0.0"}


@app.get("/api/model-metrics")
async def get_model_metrics():
    """Return model metrics including per-class metrics and confusion matrix."""
    import json
    from pathlib import Path

    metrics_path = Path(__file__).parent / "data" / "model_metrics.json"
    if not metrics_path.exists():
        metrics_path = Path(__file__).parent.parent / "data" / "model_metrics.json"
    if not metrics_path.exists():
        return JSONResponse(status_code=404, content={"detail": "Metrics not found"})

    with open(metrics_path) as f:
        return json.load(f)


@app.get("/")
async def root():
    return {
        "service": "Mineral Classifier API",
        "documentation": "/docs",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "classify": "/api/classify/mineral",
            "reference": "/api/reference/minerals",
        },
    }


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=API_RELOAD)
