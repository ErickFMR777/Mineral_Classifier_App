"""
Configuration file for Mineral Classifier Backend.
Centralizes all settings: paths, ports, model parameters, etc.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ==================== DIRECTORIES ====================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# The canonical data directory at the repo root, shared with the SPA and the
# serverless API. Keeping a second copy of mineral_classes.json here would be
# actively dangerous: that array *is* the integer label space of the trained
# probe, so a divergence would silently map predictions onto the wrong minerals.
CANONICAL_DATA_DIR = Path(
    os.getenv("CANONICAL_DATA_DIR", str(BASE_DIR.parent.parent / "data"))
)

# Create directories if they don't exist
DATA_DIR.mkdir(exist_ok=True)

# ==================== API CONFIGURATION ====================
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"

# ==================== ML MODELS ====================
MINERAL_CLASSES_PATH = CANONICAL_DATA_DIR / "mineral_classes.json"

# Model parameters
MODEL_DEVICE = "cpu"  # Codespaces CPU only

# ==================== IMAGE PROCESSING ====================
IMAGE_MAX_SIZE = 5 * 1024 * 1024  # 5MB max file size
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Image normalization (ImageNet stats)
IMAGE_NORMALIZE_MEAN = [0.485, 0.456, 0.406]
IMAGE_NORMALIZE_STD = [0.229, 0.224, 0.225]

# ==================== CORS SETTINGS ====================
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Add Codespaces URLs dynamically
codespace_name = os.getenv("CODESPACE_NAME", "")
github_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "")
if codespace_name and github_domain:
    ALLOWED_ORIGINS.append(f"https://{codespace_name}-5173.{github_domain}")
    ALLOWED_ORIGINS.append(f"https://{codespace_name}-8000.{github_domain}")

# ==================== CACHE SETTINGS ====================
CACHE_MAX_AGE = 86400  # 24 hours

# ==================== LOGGING ====================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
