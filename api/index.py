"""Vercel serverless entry point for the Mineral Classifier read-only API.

Deliberately dependency-free: it uses only the Python standard library, so the
function has no requirements.txt to resolve, builds in seconds and stays far
under Vercel's bundle limit. The heavy CLIP inference that used to live behind
POST /api/classify/mineral now runs in the browser (see frontend/src/ml/), so
nothing here needs torch, transformers or scikit-learn.

vercel.json rewrites every /api/* request here with the original path handed
over as the `route` query parameter.
"""

import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, unquote, urlparse

VERSION = "2.0.0"

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"
)

_cache: dict = {}


def load_data(filename: str):
    """Read and memoize a canonical JSON file (warm invocations reuse it)."""
    if filename not in _cache:
        with open(os.path.join(DATA_DIR, filename), encoding="utf-8") as handle:
            _cache[filename] = json.load(handle)
    return _cache[filename]


def mineral_summary(mineral: dict) -> dict:
    """The compact shape the catalog endpoint has always returned."""
    return {
        "id": mineral["id"],
        "name": mineral["name"],
        "category": mineral["category"],
        "chemical_formula": mineral["chemical_formula"],
        "hardness": mineral["hardness_short"],
        "color": mineral["color"],
        "luster": mineral["luster"],
        "crystal_system": mineral["crystal_system"],
        "description": mineral["description"],
        "uses": mineral["uses"],
    }


def route_request(route: str):
    """Map a normalized route to (status_code, payload)."""
    segments = [unquote(s) for s in route.strip("/").split("/") if s]

    if not segments:
        return 200, {
            "service": "Mineral Classifier API",
            "version": VERSION,
            "inference": "client-side (CLIP ViT-B/32 via ONNX Runtime in the browser)",
            "endpoints": {
                "health": "/api/health",
                "minerals": "/api/reference/minerals",
                "mineral_details": "/api/reference/minerals/{name}",
                "model_metrics": "/api/model-metrics",
            },
        }

    if segments == ["health"]:
        return 200, {
            "status": "ok",
            "service": "mineral-classifier-api",
            "version": VERSION,
        }

    if segments == ["model-metrics"]:
        return 200, load_data("model_metrics.json")

    if segments[:2] == ["reference", "minerals"]:
        minerals = load_data("minerals.json")

        if len(segments) == 2:
            summaries = [mineral_summary(m) for m in minerals]
            return 200, {"minerals": summaries, "total": len(summaries)}

        if len(segments) == 3:
            wanted = segments[2].lower()
            for mineral in minerals:
                if mineral["name"].lower() == wanted:
                    return 200, {"mineral": mineral["name"], "details": mineral}
            return 404, {"detail": f"Mineral '{segments[2]}' not found"}

    if segments == ["classify", "mineral"]:
        return 410, {
            "detail": (
                "Server-side classification has been removed. Inference now runs "
                "in the browser with CLIP ViT-B/32 via ONNX Runtime; no image "
                "ever leaves the device."
            )
        }

    return 404, {"detail": f"Unknown endpoint: /api/{route.strip('/')}"}


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # Read-only public reference data: safe to share and worth caching.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Cache-Control", "public, max-age=3600, s-maxage=86400")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        # Normal path: vercel.json passes the original route through `route`.
        # Falling back to the raw path keeps `vercel dev` and direct hits working.
        route = query.get("route", [None])[0]
        if route is None:
            route = parsed.path
            for prefix in ("/api/index", "/api"):
                if route.startswith(prefix):
                    route = route[len(prefix) :]
                    break

        try:
            status, payload = route_request(route)
        except FileNotFoundError as exc:
            status, payload = 500, {"detail": f"Missing data file: {exc}"}
        except Exception as exc:  # noqa: BLE001 - surface a JSON error, never HTML
            status, payload = 500, {"detail": f"Internal error: {exc}"}

        self._send(status, payload)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, *args) -> None:  # keep Vercel logs clean
        pass
