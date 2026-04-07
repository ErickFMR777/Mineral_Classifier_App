#!/usr/bin/env bash
set -euo pipefail

# Convenience script to create environments and start backend + frontend
# Usage: ./run_all.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/mineral-classifier-app/backend"
FRONTEND_DIR="$ROOT_DIR/mineral-classifier-app/frontend"

echo "[run_all] Preparing backend in $BACKEND_DIR"
cd "$BACKEND_DIR"
if [ -z "${PYTHON:-}" ]; then
  PYTHON=python3.11
fi
if [ ! -d venv ]; then
  echo "[run_all] Creating Python venv (python3.11)"
  $PYTHON -m venv venv
fi
. venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo "[run_all] Starting backend (uvicorn) — logs -> backend.log"
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$BACKEND_DIR/backend.log" 2>&1 &

echo "[run_all] Preparing frontend in $FRONTEND_DIR"
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  echo "[run_all] Installing frontend dependencies (npm)"
  npm install
fi

echo "[run_all] Starting frontend (npm run dev) — logs -> frontend.log"
nohup npm run dev > "$FRONTEND_DIR/frontend.log" 2>&1 &

echo "[run_all] Done. Backend on http://127.0.0.1:8000  Frontend on http://127.0.0.1:5173"
echo "[run_all] Backend log: $BACKEND_DIR/backend.log"
echo "[run_all] Frontend log: $FRONTEND_DIR/frontend.log"
