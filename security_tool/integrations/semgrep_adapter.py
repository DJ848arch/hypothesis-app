"""Semgrep adapter — multi-language static analysis with OWASP rulesets."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from integrations.base import SecurityAdapter, NormalizedFinding


class SemgrepAdapter(SecurityAdapter):
    name = "SEMGREP"
    description = "Multi-language static analysis (OWASP, security-audit rulesets)"

    def is_available(self) -> bool:
        return shutil.which("semgrep") is not None

    def scan(self, target: Path) -> list[NormalizedFinding]:
        try:
            result = subprocess.run(
                [
                    "semgrep",
                    "--config", "p/owasp-top-ten",
                    "--config", "p/secrets",
                    str(target),
                    "--json",
                    "--quiet",
                    "--no-git-ignore",
                ],
                capture_output=True,
                text=True,
                timeout=180,
            )
            data = json.loads(result.stdout or "{}")
        except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
            return []

        findings: list[NormalizedFinding] = []
        for r in data.get("results", []):
            extra = r.get("extra", {})
            meta = extra.get("metadata", {})

            # Extract CWE
            cwes = meta.get("cwe", [])
            cwe = cwes[0] if isinstance(cwes, list) and cwes else (cwes if isinstance(cwes, str) else None)

            # Map severity
            sev_raw = extra.get("severity", meta.get("confidence", "MEDIUM"))
            sev = self._sev(sev_raw)

            rule_id = r.get("check_id", "")
            msg = extra.get("message", "")
            fix = extra.get("fix", "") or meta.get("fix", "")

            findings.append(NormalizedFinding(
                file=r.get("path", ""),
                line=r.get("start", {}).get("line"),
                severity=sev,
                cwe=cwe,
                title=rule_id.split(".")[-1].replace("-", " ").replace("_", " ").title(),
                description=msg,
                recommendation=fix or f"See Semgrep rule: {rule_id}",
                _source=self.name,
                _checkpoint=None,
                _tool_id=f"semgrep-{rule_id}-{r.get('path')}-{r.get('start', {}).get('line')}",
            ))
        return findings
