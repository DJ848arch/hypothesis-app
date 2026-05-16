"""
BASS Dashboard — FastAPI backend.

Provides REST endpoints and WebSocket streaming for the web UI.
Scans run as background tasks; progress is broadcast over WebSocket.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel

# Add parent directory to path so we can import scanner modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

app = FastAPI(title="BASS Security Dashboard", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory scan store (replace with a DB for production)
_scans: dict[str, dict] = {}
_ws_connections: dict[str, list[WebSocket]] = {}


# ──────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    target: str
    mode: str = "both"
    fail_on: str = "NONE"
    notify_on: str = "MEDIUM"
    remediate: bool = False
    api_key: str | None = None


class ScanSummary(BaseModel):
    scan_id: str
    target: str
    mode: str
    timestamp: str
    status: str
    total_findings: int
    highest_severity: str
    duration_seconds: float


# ──────────────────────────────────────────────────────────────
# WebSocket helpers
# ──────────────────────────────────────────────────────────────

async def _broadcast(scan_id: str, event: dict) -> None:
    conns = _ws_connections.get(scan_id, [])
    dead = []
    for ws in conns:
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        conns.remove(ws)


def _progress_cb(scan_id: str):
    def cb(stage: str, message: str, current: int, total: int) -> None:
        asyncio.run_coroutine_threadsafe(
            _broadcast(scan_id, {
                "type": "progress",
                "stage": stage,
                "message": message,
                "current": current,
                "total": total,
            }),
            asyncio.get_event_loop(),
        )
    return cb


# ──────────────────────────────────────────────────────────────
# Background scan task
# ──────────────────────────────────────────────────────────────

def _run_scan(scan_id: str, request: ScanRequest) -> None:
    api_key = request.api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        _scans[scan_id]["status"] = "error"
        _scans[scan_id]["error"] = "No Anthropic API key provided"
        return

    target = Path(request.target).resolve()
    if not target.is_dir():
        _scans[scan_id]["status"] = "error"
        _scans[scan_id]["error"] = f"Target directory not found: {target}"
        return

    _scans[scan_id]["status"] = "running"

    try:
        from coordinator import SecurityCoordinator
        coordinator = SecurityCoordinator(
            api_key=api_key,
            progress_cb=_progress_cb(scan_id),
        )
        results = coordinator.run(
            target_dir=target,
            mode=request.mode,
            notify_on=request.notify_on,
            interactive=False,
            scan_id=scan_id,
            remediate=False,  # dashboard uses its own approval flow via API
        )

        # If remediate mode requested, generate proposals (no auto-apply)
        if request.remediate:
            from responder import ResponderAI
            import anthropic as _anthropic
            client = _anthropic.Anthropic(api_key=api_key)
            responder = ResponderAI(client)
            proposals = []
            for finding in results.get("all_findings", [])[:10]:  # cap at 10
                proposal = responder.propose_fix(finding, target)
                proposals.append({**proposal, "remediation_id": str(uuid.uuid4()), "approval_status": "pending"})
            results["remediations"] = proposals
            _scans[scan_id]["remediations"] = proposals

        from reporter import generate_html_report
        html_report = generate_html_report(results)

        _scans[scan_id].update({
            "status": "complete",
            "results": results,
            "html_report": html_report,
        })

        asyncio.run_coroutine_threadsafe(
            _broadcast(scan_id, {"type": "complete", "scan_id": scan_id}),
            asyncio.get_event_loop(),
        )

    except Exception as exc:
        _scans[scan_id]["status"] = "error"
        _scans[scan_id]["error"] = str(exc)
        asyncio.run_coroutine_threadsafe(
            _broadcast(scan_id, {"type": "error", "message": str(exc)}),
            asyncio.get_event_loop(),
        )


# ──────────────────────────────────────────────────────────────
# REST endpoints
# ──────────────────────────────────────────────────────────────

@app.post("/api/scan", response_model=dict)
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())
    _scans[scan_id] = {
        "scan_id": scan_id,
        "target": request.target,
        "mode": request.mode,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "queued",
        "results": None,
        "html_report": None,
        "error": None,
    }
    _ws_connections[scan_id] = []
    background_tasks.add_task(_run_scan, scan_id, request)
    return {"scan_id": scan_id, "status": "queued"}


@app.get("/api/scan/{scan_id}")
async def get_scan(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    # Don't return the full html_report in this endpoint
    return {k: v for k, v in scan.items() if k != "html_report"}


@app.get("/api/scan/{scan_id}/report", response_class=HTMLResponse)
async def get_html_report(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    if scan["status"] != "complete":
        raise HTTPException(400, f"Scan not complete (status: {scan['status']})")
    return HTMLResponse(content=scan["html_report"])


@app.get("/api/scan/{scan_id}/results")
async def get_results(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    if scan["status"] != "complete":
        raise HTTPException(400, "Scan not complete")
    return scan["results"]


@app.get("/api/scans")
async def list_scans():
    summaries = []
    for scan in _scans.values():
        results = scan.get("results") or {}
        summaries.append({
            "scan_id": scan["scan_id"],
            "target": scan["target"],
            "mode": scan["mode"],
            "timestamp": scan["timestamp"],
            "status": scan["status"],
            "total_findings": results.get("total_findings", 0),
            "highest_severity": results.get("highest_severity", "—"),
            "duration_seconds": results.get("duration_seconds", 0),
            "error": scan.get("error"),
        })
    return sorted(summaries, key=lambda s: s["timestamp"], reverse=True)


@app.get("/api/scan/{scan_id}/remediations")
async def get_remediations(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan.get("remediations", [])


@app.post("/api/scan/{scan_id}/remediation/{remediation_id}/approve")
async def approve_remediation(scan_id: str, remediation_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")

    remediations = scan.get("remediations", [])
    proposal = next((r for r in remediations if r.get("remediation_id") == remediation_id), None)
    if not proposal:
        raise HTTPException(404, "Remediation not found")
    if proposal.get("approval_status") != "pending":
        raise HTTPException(400, "Remediation already actioned")

    target = Path(scan["target"])
    from remediation import apply_fix
    result = apply_fix(proposal, target)
    proposal["approval_status"] = "approved"
    proposal["result"] = result
    return result


@app.post("/api/scan/{scan_id}/remediation/{remediation_id}/reject")
async def reject_remediation(scan_id: str, remediation_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")

    remediations = scan.get("remediations", [])
    proposal = next((r for r in remediations if r.get("remediation_id") == remediation_id), None)
    if not proposal:
        raise HTTPException(404, "Remediation not found")

    proposal["approval_status"] = "rejected"
    return {"status": "rejected", "remediation_id": remediation_id}


@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str):
    if scan_id not in _scans:
        raise HTTPException(404, "Scan not found")
    del _scans[scan_id]
    _ws_connections.pop(scan_id, None)
    return {"deleted": scan_id}


@app.get("/api/health")
async def health():
    return {"status": "ok", "scans": len(_scans)}


# ──────────────────────────────────────────────────────────────
# WebSocket
# ──────────────────────────────────────────────────────────────

@app.websocket("/ws/scan/{scan_id}")
async def scan_ws(websocket: WebSocket, scan_id: str):
    await websocket.accept()
    if scan_id not in _ws_connections:
        _ws_connections[scan_id] = []
    _ws_connections[scan_id].append(websocket)

    # If scan already complete, send immediately
    scan = _scans.get(scan_id)
    if scan:
        if scan["status"] == "complete":
            await websocket.send_json({"type": "complete", "scan_id": scan_id})
        elif scan["status"] == "error":
            await websocket.send_json({"type": "error", "message": scan.get("error", "Unknown error")})

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if scan_id in _ws_connections:
            _ws_connections[scan_id].discard(websocket) if hasattr(_ws_connections[scan_id], 'discard') else None


# ──────────────────────────────────────────────────────────────
# Serve frontend static files (production build)
# ──────────────────────────────────────────────────────────────

_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}", response_class=HTMLResponse)
    async def serve_spa(full_path: str):
        index = _frontend_dist / "index.html"
        return HTMLResponse(index.read_text())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
