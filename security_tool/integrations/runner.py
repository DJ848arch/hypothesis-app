"""
Integration runner — discovers available tools, runs them in parallel,
deduplicates findings, and returns a consolidated result.
"""

from __future__ import annotations

import concurrent.futures
from pathlib import Path

from integrations.base import SecurityAdapter, NormalizedFinding
from integrations.bandit_adapter import BanditAdapter
from integrations.semgrep_adapter import SemgrepAdapter
from integrations.safety_adapter import SafetyAdapter
from integrations.npm_audit_adapter import NpmAuditAdapter

from config import CYAN, GREEN, YELLOW, RESET_COLOR, BOLD

_ALL_ADAPTERS: list[type[SecurityAdapter]] = [
    BanditAdapter,
    SemgrepAdapter,
    SafetyAdapter,
    NpmAuditAdapter,
]


class IntegrationRunner:
    def __init__(self) -> None:
        self._adapters: list[SecurityAdapter] = [
            cls() for cls in _ALL_ADAPTERS if cls().is_available()
        ]

    @property
    def available_tools(self) -> list[str]:
        return [a.name for a in self._adapters]

    def run(self, target: Path) -> dict:
        if not self._adapters:
            print(f"  {YELLOW}[INTEGRATIONS] No external security tools found. "
                  f"Install bandit/semgrep/safety/npm for richer coverage.{RESET_COLOR}")
            return {"tools_run": [], "findings": [], "total": 0}

        print(f"\n{BOLD}{CYAN}[INTEGRATIONS] Running external security tools:{RESET_COLOR}")
        for adapter in self._adapters:
            print(f"  · {adapter.name}: {adapter.description}")
        print()

        all_findings: list[NormalizedFinding] = []
        seen_ids: set[str] = set()

        def _run_one(adapter: SecurityAdapter) -> tuple[str, list[NormalizedFinding]]:
            try:
                findings = adapter.scan(target)
                return adapter.name, findings
            except Exception as exc:
                print(f"  {YELLOW}[INTEGRATIONS] {adapter.name} error: {exc}{RESET_COLOR}")
                return adapter.name, []

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            futures = {pool.submit(_run_one, a): a for a in self._adapters}
            for future in concurrent.futures.as_completed(futures):
                name, findings = future.result()
                deduped = []
                for f in findings:
                    tid = f.get("_tool_id", "")
                    if tid and tid in seen_ids:
                        continue
                    if tid:
                        seen_ids.add(tid)
                    deduped.append(f)
                all_findings.extend(deduped)
                print(f"  {GREEN}✔{RESET_COLOR} {name}: {len(deduped)} finding(s)")

        print()
        return {
            "tools_run": [a.name for a in self._adapters],
            "findings": all_findings,
            "total": len(all_findings),
        }

    def build_context_block(self, findings: list[NormalizedFinding]) -> str:
        """Render integration findings as a context block for Claude's prompts."""
        if not findings:
            return ""
        lines = ["=== EXTERNAL TOOL FINDINGS (provide additional context) ==="]
        for f in findings:
            lines.append(
                f"[{f.get('_source')}] {f.get('severity')} — {f.get('title')} "
                f"in {f.get('file')}:{f.get('line', '?')} {f.get('cwe', '')}"
            )
        lines.append("=== END EXTERNAL FINDINGS ===")
        return "\n".join(lines)
