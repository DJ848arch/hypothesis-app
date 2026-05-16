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


@app.post("/api/simulate")
async def run_simulation(request: dict, background_tasks: BackgroundTasks):
    scan_id = request.get("scan_id")
    attack_type = request.get("attack_type", "auto")
    api_key = request.get("api_key") or os.environ.get("ANTHROPIC_API_KEY", "")

    if not api_key:
        raise HTTPException(400, "No Anthropic API key")

    sim_id = str(uuid.uuid4())
    _scans.setdefault("simulations", {})[sim_id] = {"status": "running", "results": []}

    async def _run():
        try:
            import anthropic as _anthropic
            from simulator import SimulatorAI
            client = _anthropic.Anthropic(api_key=api_key)
            sim_ai = SimulatorAI(client)

            if scan_id and scan_id in _scans:
                findings = _scans[scan_id].get("results", {}).get("all_findings", [])[:3]
                results = [sim_ai.simulate_from_finding(f, Path(_scans[scan_id]["target"])) for f in findings]
            else:
                target = Path(request.get("target", "."))
                results = [sim_ai.simulate_attack_type(attack_type, target)]

            _scans.setdefault("simulations", {})[sim_id] = {
                "status": "complete",
                "results": [r for r in results if r and not r.get("error")],
            }
        except Exception as exc:
            _scans.setdefault("simulations", {})[sim_id] = {"status": "error", "error": str(exc)}

    background_tasks.add_task(_run)
    return {"simulation_id": sim_id, "status": "running"}


@app.get("/api/simulate/{sim_id}")
async def get_simulation(sim_id: str):
    sim = _scans.get("simulations", {}).get(sim_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    return sim


@app.post("/api/simulation-feedback")
async def submit_feedback(body: dict):
    from feedback import record_feedback
    return record_feedback(
        simulation_id=body.get("simulation_id", ""),
        realism=body.get("realism", 3),
        clarity=body.get("clarity", 3),
        accuracy=body.get("accuracy", 3),
        comment=body.get("comment", ""),
        attack_type=body.get("attack_type", ""),
    )


@app.post("/api/quiz-score")
async def submit_quiz_score(body: dict):
    from feedback import record_quiz_score
    return record_quiz_score(
        simulation_id=body.get("simulation_id", ""),
        attack_type=body.get("attack_type", ""),
        correct=body.get("correct", 0),
        total=body.get("total", 0),
        answers=body.get("answers", {}),
    )


@app.get("/api/feedback/stats")
async def get_feedback_stats():
    from feedback import get_stats
    return get_stats()


# ── Team & Quiz management ────────────────────────────────────

@app.get("/api/team")
async def get_team():
    from quiz_manager import list_members
    return list_members()


@app.post("/api/team/member")
async def upsert_member(body: dict):
    from quiz_manager import upsert_member
    return upsert_member(
        name=body["name"],
        email=body.get("email", ""),
        role=body.get("role", "Security Analyst"),
    )


@app.get("/api/team/dashboard")
async def team_dashboard():
    from quiz_manager import get_team_dashboard
    return get_team_dashboard()


def _generate_quiz_questions(attack_types: list[str], api_key: str) -> list[dict]:
    """Use Claude to generate quiz questions for the given attack types."""
    import re, json as _json
    from attack_catalog import get_attack
    import anthropic as _ant

    attack_summaries = []
    for atype in attack_types:
        meta = get_attack(atype)
        if meta:
            attack_summaries.append(
                f"- {meta['name']} (OWASP: {meta['owasp']}, CWE: {meta['cwe']}): "
                f"{meta.get('description', '')} "
                f"Variants: {', '.join(meta.get('variants', [])[:3])}"
            )

    if not attack_summaries:
        return []

    prompt = (
        f"Generate 3 multiple-choice quiz questions per attack type for a security team quiz.\n\n"
        f"Attack types:\n" + "\n".join(attack_summaries) + "\n\n"
        "Rules:\n"
        "- Each question must have 4 options (A/B/C/D) with exactly one correct answer\n"
        "- Test practical understanding: detection, defense, and exploitation patterns\n"
        "- Include a clear explanation for the correct answer\n"
        "- Make distractors plausible but clearly wrong to a trained analyst\n\n"
        "Respond ONLY with a JSON array of question objects:\n"
        '[{"id": 1, "attack_type": "<key>", "question": "...", '
        '"options": {"A": "...", "B": "...", "C": "...", "D": "..."}, '
        '"correct": "A", "explanation": "..."}, ...]'
    )

    try:
        client = _ant.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=4096,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[-1].text if message.content else ""
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            questions = _json.loads(match.group())
            # Assign UUIDs for IDs
            for i, q in enumerate(questions):
                q["id"] = str(uuid.uuid4())
            return questions
    except Exception:
        pass
    return []


@app.post("/api/quiz/schedule")
async def schedule_quiz(body: dict, background_tasks: BackgroundTasks):
    from quiz_manager import schedule_quiz
    from attack_catalog import get_attack

    member_ids = body.get("member_ids", [])
    attack_types = body.get("attack_types", [])
    questions = body.get("questions", [])
    api_key = body.get("api_key") or os.environ.get("ANTHROPIC_API_KEY", "")

    if not questions:
        if api_key:
            # Generate AI questions synchronously (runs fast enough for this use case)
            questions = await asyncio.get_event_loop().run_in_executor(
                None, _generate_quiz_questions, attack_types, api_key
            )

        # Fallback: static questions from catalog if AI generation failed
        if not questions:
            for atype in attack_types:
                meta = get_attack(atype)
                if meta:
                    objs = meta.get("learning_objectives", [])
                    for i, obj in enumerate(objs[:3]):
                        questions.append({
                            "id": str(uuid.uuid4()),
                            "attack_type": atype,
                            "question": f"Regarding {meta['name']}: {obj}. Which action best addresses this?",
                            "options": {
                                "A": obj,
                                "B": "Disable all input validation to improve performance",
                                "C": "Store all credentials in source code for convenience",
                                "D": "Grant all users administrative privileges by default",
                            },
                            "correct": "A",
                            "explanation": f"For {meta['name']}: {obj}",
                        })

    assignment = schedule_quiz(
        member_ids=member_ids,
        questions=questions,
        attack_types=attack_types,
        title=body.get("title", "Security Knowledge Check"),
        scheduled_by=body.get("scheduled_by", "manager"),
    )
    return assignment


@app.get("/api/quiz/pending/{member_id}")
async def get_pending_quizzes(member_id: str):
    from quiz_manager import get_pending_quizzes
    return get_pending_quizzes(member_id)


@app.post("/api/quiz/submit")
async def submit_quiz(body: dict):
    from quiz_manager import submit_quiz_result
    api_key = body.get("api_key") or os.environ.get("ANTHROPIC_API_KEY", "")
    return submit_quiz_result(
        assignment_id=body["assignment_id"],
        member_id=body["member_id"],
        answers=body.get("answers", {}),
        api_key=api_key,
    )


@app.get("/api/quiz/results/{member_id}")
async def get_results(member_id: str):
    from quiz_manager import get_quiz_results
    return get_quiz_results(member_id)


@app.get("/api/training/{member_id}")
async def get_training(member_id: str):
    from quiz_manager import get_training_schedule
    return get_training_schedule(member_id)


@app.get("/api/training")
async def get_all_training():
    from quiz_manager import get_all_training
    return get_all_training()


@app.patch("/api/training/{training_id}/complete")
async def complete_training(training_id: str):
    from quiz_manager import _load, _save
    state = _load()
    for member_training in state["training_schedule"].values():
        for item in member_training:
            if item.get("training_id") == training_id:
                item["status"] = "completed"
                item["completed_at"] = datetime.now(timezone.utc).isoformat()
    _save(state)
    return {"training_id": training_id, "status": "completed"}


@app.get("/api/notifications/{member_id}")
async def get_notifications(member_id: str, unseen_only: bool = False):
    from quiz_manager import get_notifications
    return get_notifications(member_id, unseen_only)


@app.post("/api/notifications/{member_id}/seen")
async def mark_seen(member_id: str):
    from quiz_manager import mark_notifications_seen
    mark_notifications_seen(member_id)
    return {"status": "ok"}


@app.get("/api/attack-catalog")
async def get_attack_catalog():
    from attack_catalog import list_attacks
    return list_attacks()


@app.get("/api/scan/{scan_id}/compliance")
async def get_compliance_report(scan_id: str, frameworks: str = ""):
    """Map a completed scan's findings to compliance frameworks. Returns JSON mapping."""
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    results = scan.get("results")
    if not results:
        raise HTTPException(400, "Scan not complete")
    from compliance import map_findings_to_frameworks, FRAMEWORK_KEYS
    fw_keys = [k.strip() for k in frameworks.split(",") if k.strip()] if frameworks else FRAMEWORK_KEYS
    return map_findings_to_frameworks(results.get("all_findings", []), fw_keys)


@app.get("/api/scan/{scan_id}/compliance/report")
async def get_compliance_html_report(scan_id: str):
    """Generate and return an HTML compliance gap report for a scan."""
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    results = scan.get("results")
    if not results:
        raise HTTPException(400, "Scan not complete")
    from compliance import generate_compliance_report
    html = generate_compliance_report(
        findings=results.get("all_findings", []),
        target=results.get("target", "?"),
        scan_id=scan_id,
    )
    return HTMLResponse(content=html)


@app.post("/api/scan/{scan_id}/threat-intel")
async def enrich_with_threat_intel(scan_id: str):
    """Enrich a scan's findings with CVE/NVD/EPSS/CISA KEV data."""
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    results = scan.get("results")
    if not results:
        raise HTTPException(400, "Scan not complete")

    from threat_intel import enrich_findings, get_threat_summary
    findings = results.get("all_findings", [])
    enriched = await asyncio.get_event_loop().run_in_executor(None, enrich_findings, findings)
    results["all_findings"] = enriched
    results["threat_intel_summary"] = get_threat_summary(enriched)
    return results["threat_intel_summary"]


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
