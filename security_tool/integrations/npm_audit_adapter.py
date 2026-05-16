"""npm audit adapter — Node.js dependency vulnerability scanning."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from integrations.base import SecurityAdapter, NormalizedFinding


_SEV_MAP = {"critical": "CRITICAL", "high": "HIGH", "moderate": "MEDIUM", "low": "LOW", "info": "INFO"}


class NpmAuditAdapter(SecurityAdapter):
    name = "NPM_AUDIT"
    description = "Node.js dependency vulnerability scanning (npm audit)"

    def is_available(self) -> bool:
        return shutil.which("npm") is not None

    def scan(self, target: Path) -> list[NormalizedFinding]:
        pkg_files = list(target.rglob("package.json"))
        pkg_files = [f for f in pkg_files if "node_modules" not in f.parts]
        if not pkg_files:
            return []

        findings: list[NormalizedFinding] = []
        for pkg_file in pkg_files[:3]:
            pkg_dir = pkg_file.parent
            try:
                result = subprocess.run(
                    ["npm", "audit", "--json"],
                    capture_output=True,
                    text=True,
                    timeout=60,
                    cwd=str(pkg_dir),
                )
                data = json.loads(result.stdout or "{}")
            except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
                continue

            # npm audit v7+ format
            vulns = data.get("vulnerabilities", {})
            for pkg_name, info in vulns.items():
                severity = _SEV_MAP.get(info.get("severity", "low"), "LOW")
                via = info.get("via", [])
                advisories = [v for v in via if isinstance(v, dict)]

                for advisory in advisories or [{"title": f"Vulnerability in {pkg_name}", "url": ""}]:
                    title = advisory.get("title", f"Vulnerability in {pkg_name}")
                    url = advisory.get("url", "")
                    cwe_list = advisory.get("cwe", [])
                    cwe = cwe_list[0] if cwe_list else None
                    findings.append(NormalizedFinding(
                        file=str(pkg_file.relative_to(target) if pkg_file.is_relative_to(target) else pkg_file.name),
                        line=None,
                        severity=severity,
                        cwe=cwe,
                        title=title,
                        description=f"Package: {pkg_name} ({info.get('range', 'unknown range')}). {advisory.get('overview', '')}",
                        recommendation=f"Run `npm audit fix` or upgrade {pkg_name}. Details: {url}",
                        _source=self.name,
                        _checkpoint=None,
                        _tool_id=f"npm-{pkg_name}-{advisory.get('source', '')}",
                    ))
        return findings
