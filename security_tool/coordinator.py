"""
Security coordinator — orchestrates Sentinel AI and Patrol AI.

Runs both AIs (sequentially or selectively), collects their findings,
and passes critical results to the human notifier.
"""

from __future__ import annotations

from pathlib import Path

import anthropic

from sentinel import SentinelAI
from patrol import PatrolAI
from notifier import notify_human, print_summary_report
from config import SEVERITY_LEVELS, RESET_COLOR, BOLD, CYAN, GREEN, YELLOW


_NOTIFY_THRESHOLD_PRIORITY = SEVERITY_LEVELS["MEDIUM"]["priority"]


class SecurityCoordinator:
    def __init__(self, api_key: str):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._sentinel = SentinelAI(self._client)
        self._patrol = PatrolAI(self._client)

    def run(
        self,
        target_dir: Path,
        mode: str = "both",
        notify_on: str = "MEDIUM",
    ) -> dict:
        notify_priority = SEVERITY_LEVELS.get(notify_on.upper(), SEVERITY_LEVELS["MEDIUM"])["priority"]

        sentinel_results: dict = {"checkpoints": {}, "total_findings": 0}
        patrol_results: dict = {"batches": [], "total_files": 0, "total_findings": 0}

        if mode in ("sentinel", "both"):
            sentinel_results = self._sentinel.scan(target_dir)
            self._process_sentinel_alerts(sentinel_results, notify_priority)

        if mode in ("patrol", "both"):
            patrol_results = self._patrol.scan(target_dir)
            self._process_patrol_alerts(patrol_results, notify_priority)

        print_summary_report(sentinel_results, patrol_results)

        return {
            "sentinel": sentinel_results,
            "patrol": patrol_results,
        }

    def _process_sentinel_alerts(self, results: dict, notify_priority: int) -> None:
        checkpoints = results.get("checkpoints", {})
        for checkpoint_name, cp_data in checkpoints.items():
            findings = cp_data.get("findings", [])
            critical_findings = [
                f for f in findings
                if SEVERITY_LEVELS.get(f.get("severity", "INFO").upper(), {}).get("priority", 0) >= notify_priority
            ]
            if critical_findings:
                print(f"\n{BOLD}{CYAN}[SENTINEL] Notifying human — {len(critical_findings)} alert(s) at checkpoint: {checkpoint_name}{RESET_COLOR}")
                notify_human(critical_findings, source="SENTINEL", checkpoint=checkpoint_name)

    def _process_patrol_alerts(self, results: dict, notify_priority: int) -> None:
        batches = results.get("batches", [])
        all_patrol_findings: list[dict] = []
        for batch in batches:
            all_patrol_findings.extend(batch.get("findings", []))

        critical_findings = [
            f for f in all_patrol_findings
            if SEVERITY_LEVELS.get(f.get("severity", "INFO").upper(), {}).get("priority", 0) >= notify_priority
        ]
        if critical_findings:
            print(f"\n{BOLD}{GREEN}[PATROL] Notifying human — {len(critical_findings)} alert(s) found during patrol{RESET_COLOR}")
            notify_human(critical_findings, source="PATROL")
