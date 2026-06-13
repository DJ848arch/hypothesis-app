"""Bandit adapter — Python static security analysis."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from integrations.base import SecurityAdapter, NormalizedFinding


class BanditAdapter(SecurityAdapter):
    name = "BANDIT"
    description = "Python static security analysis (OWASP-aligned)"

    def is_available(self) -> bool:
        return shutil.which("bandit") is not None

    def scan(self, target: Path) -> list[NormalizedFinding]:
        try:
            result = subprocess.run(
                ["bandit", "-r", str(target), "-f", "json", "-q", "--exit-zero"],
                capture_output=True,
                text=True,
                timeout=120,
            )
            data = json.loads(result.stdout or "{}")
        except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
            return []

        findings: list[NormalizedFinding] = []
        for issue in data.get("results", []):
            cwe_raw = issue.get("issue_cwe", {})
            cwe = f"CWE-{cwe_raw.get('id')}" if isinstance(cwe_raw, dict) and cwe_raw.get("id") else None
            sev = self._sev(issue.get("issue_severity", "MEDIUM"))
            findings.append(NormalizedFinding(
                file=issue.get("filename", ""),
                line=issue.get("line_number"),
                severity=sev,
                cwe=cwe,
                title=issue.get("test_name", "Bandit finding").replace("_", " ").title(),
                description=issue.get("issue_text", ""),
                recommendation=f"See https://bandit.readthedocs.io/en/latest/plugins/{issue.get('test_id', '').lower()}.html",
                _source=self.name,
                _checkpoint=None,
                _tool_id=f"bandit-{issue.get('test_id')}-{issue.get('filename')}-{issue.get('line_number')}",
            ))
        return findings
