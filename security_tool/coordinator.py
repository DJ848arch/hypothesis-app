"""
Security coordinator — orchestrates Sentinel AI and Patrol AI.

Runs both AIs (sequentially or selectively), collects their findings,
and passes critical results to the human notifier.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import anthropic

from sentinel import SentinelAI
from patrol import PatrolAI
from notifier import notify_human, print_summary_report
from config import SEVERITY_LEVELS, RESET_COLOR, BOLD, CYAN, GREEN

_NOTIFY_THRESHOLD_PRIORITY = SEVERITY_LEVELS["MEDIUM"]["priority"]

ProgressCallback = Callable[[str, str, int, int], None]


def _priority(severity: str) -> int:
    return SEVERITY_LEVELS.get(severity.upper(), {}).get("priority", 0)


def _highest_severity(findings: list[dict]) -> str:
    if not findings:
        return "CLEAR"
    return max(
        (f.get("severity", "INFO").upper() for f in findings),
        key=_priority,
        default="CLEAR",
    )


def _severity_counts(findings: list[dict]) -> dict[str, int]:
    counts = {s: 0 for s in SEVERITY_LEVELS}
    for f in findings:
        sev = f.get("severity", "INFO").upper()
        if sev in counts:
            counts[sev] += 1
    return counts


class SecurityCoordinator:
    def __init__(self, api_key: str, progress_cb: ProgressCallback | None = None):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._sentinel = SentinelAI(self._client)
        self._patrol = PatrolAI(self._client)
        self._progress_cb = progress_cb

    def _emit(self, stage: str, message: str, current: int = 0, total: int = 0) -> None:
        if self._progress_cb:
            self._progress_cb(stage, message, current, total)

    def run(
        self,
        target_dir: Path,
        mode: str = "both",
        notify_on: str = "MEDIUM",
        interactive: bool = True,
        scan_id: str | None = None,
    ) -> dict:
        scan_id = scan_id or str(uuid.uuid4())
        notify_priority = SEVERITY_LEVELS.get(notify_on.upper(), SEVERITY_LEVELS["MEDIUM"])["priority"]
        start_time = time.monotonic()

        sentinel_results: dict = {"checkpoints": {}, "total_findings": 0}
        patrol_results: dict = {"batches": [], "total_files": 0, "total_findings": 0}

        if mode in ("sentinel", "both"):
            self._emit("sentinel", "Starting Sentinel AI checkpoint scan", 0, 1)
            sentinel_results = self._sentinel.scan(target_dir)
            self._emit("sentinel", "Sentinel scan complete", 1, 1)
            if interactive:
                self._process_sentinel_alerts(sentinel_results, notify_priority)

        if mode in ("patrol", "both"):
            self._emit("patrol", "Starting Patrol AI full codebase scan", 0, 1)
            patrol_results = self._patrol.scan(target_dir)
            self._emit("patrol", "Patrol scan complete", 1, 1)
            if interactive:
                self._process_patrol_alerts(patrol_results, notify_priority)

        duration = time.monotonic() - start_time
        all_findings = self._flatten_findings(sentinel_results, patrol_results)

        result = {
            "scan_id": scan_id,
            "target": str(target_dir),
            "mode": mode,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": round(duration, 2),
            "sentinel": sentinel_results,
            "patrol": patrol_results,
            "all_findings": all_findings,
            "severity_counts": _severity_counts(all_findings),
            "highest_severity": _highest_severity(all_findings),
            "total_findings": len(all_findings),
        }

        if interactive:
            print_summary_report(sentinel_results, patrol_results)

        self._emit("done", "Scan complete", 1, 1)
        return result

    def _flatten_findings(self, sentinel_results: dict, patrol_results: dict) -> list[dict]:
        findings: list[dict] = []
        for cp_name, cp_data in sentinel_results.get("checkpoints", {}).items():
            for f in cp_data.get("findings", []):
                findings.append({**f, "_source": "SENTINEL", "_checkpoint": cp_name})
        for batch in patrol_results.get("batches", []):
            for f in batch.get("findings", []):
                findings.append({**f, "_source": "PATROL", "_checkpoint": None})
        return sorted(findings, key=lambda f: _priority(f.get("severity", "INFO")), reverse=True)

    def _process_sentinel_alerts(self, results: dict, notify_priority: int) -> None:
        for checkpoint_name, cp_data in results.get("checkpoints", {}).items():
            critical = [
                f for f in cp_data.get("findings", [])
                if _priority(f.get("severity", "INFO")) >= notify_priority
            ]
            if critical:
                print(f"\n{BOLD}{CYAN}[SENTINEL] Notifying human — {len(critical)} alert(s) at checkpoint: {checkpoint_name}{RESET_COLOR}")
                notify_human(critical, source="SENTINEL", checkpoint=checkpoint_name)

    def _process_patrol_alerts(self, results: dict, notify_priority: int) -> None:
        all_patrol = [f for b in results.get("batches", []) for f in b.get("findings", [])]
        critical = [f for f in all_patrol if _priority(f.get("severity", "INFO")) >= notify_priority]
        if critical:
            print(f"\n{BOLD}{GREEN}[PATROL] Notifying human — {len(critical)} alert(s) found during patrol{RESET_COLOR}")
            notify_human(critical, source="PATROL")
