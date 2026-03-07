"""
Image validation and processing utilities.
"""

import tempfile
from pathlib import Path
from fastapi import UploadFile
import logging

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


async def validate_image(file: UploadFile) -> str:
    """
    Validate uploaded image file and save to temporary location.

    Args:
        file: Uploaded file from FastAPI

    Returns:
        Path to saved temporary file

    Raises:
        ValueError: If file is invalid
    """
    if not file.filename:
        raise ValueError("No filename provided")

    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate content type
    if file.content_type and not file.content_type.startswith("image/"):
        raise ValueError(f"Invalid content type: {file.content_type}")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large ({len(content)} bytes). Maximum: {MAX_FILE_SIZE} bytes"
        )

    if len(content) == 0:
        raise ValueError("Empty file uploaded")

    # Save to temp file
    suffix = ext
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.write(content)
    temp_file.close()

    logger.info(f"Saved uploaded image to {temp_file.name} ({len(content)} bytes)")
    return temp_file.name
