#!/usr/bin/env bash
set -euo pipefail

# Starts the app locally. Since inference moved into the browser there is no
# Python service to run: the dev server also answers the /api routes, so Node is
# the only requirement.
#
# Usage: ./run_all.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/mineral-classifier-app/frontend"

cd "$FRONTEND_DIR"

if [ ! -d node_modules ]; then
  echo "[run_all] Installing frontend dependencies"
  npm install
fi

if [ ! -f public/models/text-embeddings.json ]; then
  echo "[run_all] Generating CLIP text embeddings (one-off, downloads the text encoder)"
  npm run build:embeddings
fi

echo "[run_all] Starting Vite on http://localhost:5173"
exec npm run dev
