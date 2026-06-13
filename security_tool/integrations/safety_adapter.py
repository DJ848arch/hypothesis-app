"""Safety adapter — Python dependency CVE scanning."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from integrations.base import SecurityAdapter, NormalizedFinding


class SafetyAdapter(SecurityAdapter):
    name = "SAFETY"
    description = "Python dependency vulnerability scanning (CVE database)"

    def is_available(self) -> bool:
        return shutil.which("safety") is not None

    def scan(self, target: Path) -> list[NormalizedFinding]:
        req_files = list(target.rglob("requirements*.txt")) + list(target.rglob("Pipfile.lock"))
        if not req_files:
            return []

        findings: list[NormalizedFinding] = []
        for req_file in req_files[:5]:  # limit scan files
            try:
                result = subprocess.run(
                    ["safety", "check", "-r", str(req_file), "--json"],
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                # Safety exits non-zero when vulns found — that's expected
                raw = result.stdout or result.stderr
                vulns = json.loads(raw)
            except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
                continue

            if not isinstance(vulns, list):
                vulns = vulns.get("vulnerabilities", []) if isinstance(vulns, dict) else []

            for v in vulns:
                pkg = v[0] if isinstance(v, list) and len(v) > 0 else v.get("package_name", "unknown")
                installed = v[1] if isinstance(v, list) and len(v) > 1 else v.get("installed_version", "?")
                vuln_id = v[4] if isinstance(v, list) and len(v) > 4 else v.get("vulnerability_id", "")
                advisory = v[3] if isinstance(v, list) and len(v) > 3 else v.get("advisory", "")

                findings.append(NormalizedFinding(
                    file=str(req_file.name),
                    line=None,
                    severity="HIGH",
                    cwe="CWE-1035",
                    title=f"Vulnerable dependency: {pkg}=={installed}",
                    description=advisory,
                    recommendation=f"Upgrade {pkg} to a patched version. See {vuln_id}.",
                    _source=self.name,
                    _checkpoint=None,
                    _tool_id=f"safety-{pkg}-{vuln_id}",
                ))
        return findings
