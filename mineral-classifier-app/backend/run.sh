#!/bin/bash
# Script to run the backend API

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export PYTHONUNBUFFERED=1

# Run FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
