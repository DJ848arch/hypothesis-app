"""
Security coordinator — orchestrates the full BASS pipeline:

  1. Integration runner  (Bandit, Semgrep, Safety, npm audit)
  2. Sentinel AI         (checkpoint hotspot analysis)
  3. Patrol AI           (full codebase sweep)
  4. Responder AI        (fix proposals — optional, requires human approval)
  5. Remediation engine  (applies approved fixes on a git branch + runs tests)
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
from integrations.runner import IntegrationRunner
from config import SEVERITY_LEVELS, RESET_COLOR, BOLD, CYAN, GREEN, YELLOW

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
        self._integrations = IntegrationRunner()
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
        remediate: bool = False,
    ) -> dict:
        scan_id = scan_id or str(uuid.uuid4())
        notify_priority = SEVERITY_LEVELS.get(notify_on.upper(), SEVERITY_LEVELS["MEDIUM"])["priority"]
        start_time = time.monotonic()

        # ── 1. External integrations ──────────────────────────────
        self._emit("integrations", "Running external security tools", 0, 1)
        integration_results = self._integrations.run(target_dir)
        context_block = self._integrations.build_context_block(integration_results["findings"])
        self._emit("integrations", f"{integration_results['total']} findings from external tools", 1, 1)

        # ── 2. Sentinel AI ────────────────────────────────────────
        sentinel_results: dict = {"checkpoints": {}, "total_findings": 0}
        if mode in ("sentinel", "both"):
            self._emit("sentinel", "Starting Sentinel AI checkpoint scan", 0, 1)
            sentinel_results = self._sentinel.scan(target_dir, extra_context=context_block)
            self._emit("sentinel", "Sentinel scan complete", 1, 1)
            if interactive:
                self._process_sentinel_alerts(sentinel_results, notify_priority)

        # ── 3. Patrol AI ──────────────────────────────────────────
        patrol_results: dict = {"batches": [], "total_files": 0, "total_findings": 0}
        if mode in ("patrol", "both"):
            self._emit("patrol", "Starting Patrol AI full codebase scan", 0, 1)
            patrol_results = self._patrol.scan(target_dir, extra_context=context_block)
            self._emit("patrol", "Patrol scan complete", 1, 1)
            if interactive:
                self._process_patrol_alerts(patrol_results, notify_priority)

        duration = time.monotonic() - start_time
        all_findings = self._flatten_findings(
            integration_results["findings"],
            sentinel_results,
            patrol_results,
        )

        result = {
            "scan_id": scan_id,
            "target": str(target_dir),
            "mode": mode,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": round(duration, 2),
            "integrations": integration_results,
            "sentinel": sentinel_results,
            "patrol": patrol_results,
            "all_findings": all_findings,
            "severity_counts": _severity_counts(all_findings),
            "highest_severity": _highest_severity(all_findings),
            "total_findings": len(all_findings),
            "remediations": [],
        }

        if interactive:
            print_summary_report(sentinel_results, patrol_results)

        # ── 4. Remediation (optional, always human-gated) ─────────
        if remediate and interactive:
            result["remediations"] = self._run_remediation(all_findings, target_dir, notify_priority)

        self._emit("done", "Scan complete", 1, 1)
        return result

    def _run_remediation(self, all_findings: list[dict], target_dir: Path, notify_priority: int) -> list[dict]:
        from responder import ResponderAI
        from remediation import apply_fix
        from approval import request_approval, show_remediation_result

        actionable = [
            f for f in all_findings
            if _priority(f.get("severity", "INFO")) >= notify_priority
        ]

        if not actionable:
            print(f"  {YELLOW}[RESPONDER] No findings meet the remediation threshold.{RESET_COLOR}")
            return []

        print(f"\n{BOLD}{CYAN}[RESPONDER AI] Proposing fixes for {len(actionable)} finding(s)...{RESET_COLOR}\n")
        responder = ResponderAI(self._client)
        remediation_log: list[dict] = []

        for finding in actionable:
            proposal = responder.propose_fix(finding, target_dir)

            if proposal["status"] == "cannot_fix":
                remediation_log.append({**proposal, "approval": "skipped"})
                continue
            if proposal["status"] == "error":
                remediation_log.append({**proposal, "approval": "error"})
                continue

            # ── Human approval gate ───────────────────────────────
            decision = request_approval(proposal)

            if decision == "abort":
                print(f"  {YELLOW}Auto-remediation stopped by operator.{RESET_COLOR}")
                break
            if decision == "reject":
                remediation_log.append({**proposal, "approval": "rejected"})
                continue

            # decision == "approve"
            apply_result = apply_fix(proposal, target_dir)
            show_remediation_result(apply_result)
            remediation_log.append({**proposal, "approval": "approved", "result": apply_result})

        return remediation_log

    def _flatten_findings(
        self,
        integration_findings: list[dict],
        sentinel_results: dict,
        patrol_results: dict,
    ) -> list[dict]:
        findings: list[dict] = []

        for f in integration_findings:
            findings.append({**f})  # already has _source set by adapter

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
                print(f"\n{BOLD}{CYAN}[SENTINEL] Notifying human — {len(critical)} alert(s) at: {checkpoint_name}{RESET_COLOR}")
                notify_human(critical, source="SENTINEL", checkpoint=checkpoint_name)

    def _process_patrol_alerts(self, results: dict, notify_priority: int) -> None:
        all_patrol = [f for b in results.get("batches", []) for f in b.get("findings", [])]
        critical = [f for f in all_patrol if _priority(f.get("severity", "INFO")) >= notify_priority]
        if critical:
            print(f"\n{BOLD}{GREEN}[PATROL] Notifying human — {len(critical)} alert(s) found{RESET_COLOR}")
            notify_human(critical, source="PATROL")
