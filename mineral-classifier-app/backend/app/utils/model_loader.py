"""
Model loader utility.
Loads the MineralClassifier model at application startup.
"""

import logging
from ..config import MINERAL_CLASSES_PATH, MODEL_DEVICE
from ..models.mineral_classifier import MineralClassifier

logger = logging.getLogger(__name__)


def load_mineral_model() -> MineralClassifier:
    """
    Load the mineral classification model.

    Returns:
        Initialized MineralClassifier instance
    """
    logger.info(f"Loading classes from {MINERAL_CLASSES_PATH}")
    logger.info(f"Using device: {MODEL_DEVICE}")

    classifier = MineralClassifier(
        classes_path=str(MINERAL_CLASSES_PATH),
        device=MODEL_DEVICE,
    )

    logger.info("Mineral classifier loaded successfully")
    return classifier
