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
from fp_feedback import apply_fp_suppressions, build_fp_context_block
from config import SEVERITY_LEVELS, RESET_COLOR, BOLD, CYAN, GREEN, YELLOW, MAGENTA

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

        # Include known FP patterns in AI context to reduce re-flagging
        fp_context = build_fp_context_block()
        if fp_context:
            context_block = f"{context_block}\n\n{fp_context}" if context_block else fp_context

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

        # ── 4. Cross-validation (dual-AI) ─────────────────────────
        cross_val_stats: dict = {}
        if mode == "both":
            cross_val_stats = self._cross_validate(sentinel_results, patrol_results)

        duration = time.monotonic() - start_time
        all_findings = self._flatten_findings(
            integration_results["findings"],
            sentinel_results,
            patrol_results,
        )

        # Apply FP suppressions (removes exact matches, reduces confidence on fuzzy)
        all_findings = apply_fp_suppressions(all_findings)

        # Sort again after possible confidence mutations
        all_findings = sorted(all_findings, key=lambda f: (
            _priority(f.get("severity", "INFO")),
            f.get("confidence", 70),
        ), reverse=True)

        result = {
            "scan_id": scan_id,
            "target": str(target_dir),
            "mode": mode,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": round(duration, 2),
            "integrations": integration_results,
            "sentinel": sentinel_results,
            "patrol": patrol_results,
            "cross_validation": cross_val_stats,
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

    def _cross_validate(
        self,
        sentinel_results: dict,
        patrol_results: dict,
    ) -> dict:
        """
        Compare Sentinel and Patrol findings. When both AIs flag the same
        file+CWE, boost confidence. When only one flags it, run a lightweight
        verification pass with the other AI's perspective.

        Returns stats dict: {boosted, verified_by_second_ai, low_confidence_dropped}
        """
        s_findings = [
            f for cp in sentinel_results.get("checkpoints", {}).values()
            for f in cp.get("findings", [])
        ]
        p_findings = [
            f for b in patrol_results.get("batches", [])
            for f in b.get("findings", [])
        ]

        stats = {"boosted": 0, "verified_unique": 0, "low_confidence_dropped": 0}

        def _match_key(f: dict) -> tuple:
            return (f.get("file", ""), f.get("cwe") or f.get("title", ""))

        s_keys = {_match_key(f): f for f in s_findings}
        p_keys = {_match_key(f): f for f in p_findings}

        # Boost confidence when both AIs agree
        for key, sf in s_keys.items():
            if key in p_keys:
                pf = p_keys[key]
                # Both found it — boost confidence by 15 on both
                for finding in [sf, pf]:
                    old_conf = finding.get("confidence", 70)
                    finding["confidence"] = min(100, old_conf + 15)
                    finding["_cross_validated"] = True
                stats["boosted"] += 1

        # For unique findings below confidence threshold, run a quick second-opinion
        # AI verification call (only for HIGH+ severity to manage cost)
        unique_sentinel = [f for k, f in s_keys.items() if k not in p_keys]
        unique_patrol = [f for k, f in p_keys.items() if k not in s_keys]

        for f in unique_sentinel + unique_patrol:
            if f.get("severity", "INFO") in ("CRITICAL", "HIGH") and f.get("confidence", 70) < 75:
                verified = self._verify_unique_finding(f)
                if verified is not None:
                    f["confidence"] = verified
                    f["_second_opinion"] = True
                    stats["verified_unique"] += 1

        # Tag low-confidence findings for UI visibility (don't remove — let UI filter)
        for f in s_findings + p_findings:
            if f.get("confidence", 70) < 55:
                f["_low_confidence"] = True
                stats["low_confidence_dropped"] += 1

        if stats["boosted"]:
            print(f"  {CYAN}[CROSS-VAL]{RESET_COLOR} {stats['boosted']} finding(s) confirmed by both AIs — confidence boosted")
        if stats["verified_unique"]:
            print(f"  {CYAN}[CROSS-VAL]{RESET_COLOR} {stats['verified_unique']} unique finding(s) verified by second-opinion pass")

        return stats

    def _verify_unique_finding(self, finding: dict) -> int | None:
        """
        Run a quick second-opinion on a finding flagged by only one AI.
        Returns updated confidence (int) or None if verification failed.
        """
        try:
            file_path = finding.get("file", "")
            # Read the file for context (cap at 3000 chars)
            code_snippet = ""
            try:
                code_snippet = Path(file_path).read_text(encoding="utf-8", errors="replace")[:3000]
            except OSError:
                pass

            msg = self._client.messages.create(
                model="claude-opus-4-7",
                max_tokens=256,
                messages=[{
                    "role": "user",
                    "content": (
                        f"Security verification request. One AI flagged this finding:\n\n"
                        f"Title: {finding.get('title')}\n"
                        f"Severity: {finding.get('severity')}\n"
                        f"CWE: {finding.get('cwe')}\n"
                        f"Description: {finding.get('description')}\n"
                        f"File: {file_path}\n\n"
                        f"Code:\n```\n{code_snippet}\n```\n\n"
                        "Is this a real vulnerability? Reply ONLY with a JSON object: "
                        '{"real": true|false, "confidence": 50-100, "reason": "<one sentence>"}'
                    ),
                }],
            )
            text = next((b.text for b in msg.content if hasattr(b, "text")), "")
            import json as _json, re as _re
            m = _re.search(r"\{.*\}", text, _re.DOTALL)
            if m:
                data = _json.loads(m.group())
                if not data.get("real", True):
                    return max(0, data.get("confidence", 40) - 20)
                return data.get("confidence", 70)
        except Exception:
            pass
        return None

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
