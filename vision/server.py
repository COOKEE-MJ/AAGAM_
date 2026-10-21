"""
vision/server.py - HTTP wrapper around triage.py so the backend can call it.

Contract (matches src/verify.js and src/services/ai.js):
  POST /verify-image   body: {"image": "<base64 or data URL>", "type": "flooding"}
  reply:               {"label": "...", "confidence": 0.0-1.0, "mode": "mock"}
  GET  /health         {"ok": true}

NOTE: triage.py is a deterministic MOCK (label follows the citizen's declared type).
Replace classify_damage_image() with a real model to get real triage; the HTTP
contract here does not need to change.

Run:  python vision/server.py        (default port 8000, env VISION_PORT to change)
Stdlib only, no pip install needed.
"""
import base64
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from triage import classify_damage_image  # noqa: E402


def decode_image(value):
    if not value or not isinstance(value, str):
        return b""
    if value.startswith("data:") and "," in value:
        value = value.split(",", 1)[1]
    try:
        return base64.b64decode(value, validate=False)
    except Exception:
        return b""


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"ok": True, "mode": "mock"})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/verify-image":
            return self._send(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._send(400, {"error": "invalid JSON"})
        result = classify_damage_image(decode_image(data.get("image")), data.get("type") or "other")
        # Backend only needs label + confidence; a null label routes the report to human review.
        self._send(200, {
            "label": result.get("label"),
            "confidence": result.get("confidence", 0.0),
            "mode": "mock",
        })

    def log_message(self, fmt, *args):
        sys.stderr.write("[vision] " + fmt % args + "\n")


if __name__ == "__main__":
    port = int(os.getenv("VISION_PORT", "8000"))
    print(f"AAGAM vision service on :{port} (mock classifier)")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
