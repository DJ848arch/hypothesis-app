"""
Sentinel AI — guards known security checkpoint hotspots.

Statically watches a fixed set of security-sensitive file patterns
(auth, SQL, routes, secrets, etc.) and analyzes them for vulnerabilities.
"""

from __future__ import annotations

import json
import os
import re
import fnmatch
from pathlib import Path
from typing import Generator

import anthropic

from config import (
    SENTINEL_CHECKPOINTS,
    CODE_EXTENSIONS,
    CONFIG_EXTENSIONS,
    EXCLUDED_DIRS,
    SENTINEL_BANNER,
    BOLD,
    RESET_COLOR,
    CYAN,
    MAGENTA,
)

_ALL_EXTENSIONS = CODE_EXTENSIONS | CONFIG_EXTENSIONS

SYSTEM_PROMPT = """You are SENTINEL AI, a specialized security guard assigned to watch over known vulnerability checkpoints in software codebases.

Your mission is to analyze code files assigned to your checkpoint and identify security vulnerabilities with surgical precision. You focus exclusively on security-relevant issues.

For each file you analyze, examine it for:
- OWASP Top 10 vulnerabilities
- Authentication and session management flaws
- Injection vulnerabilities (SQL, command, LDAP, XPath, etc.)
- Broken access control and privilege escalation
- Cryptographic failures and weak algorithms
- Security misconfiguration
- Sensitive data exposure
- Insecure direct object references
- Cross-site scripting (XSS) and CSRF
- Hardcoded secrets, credentials, or API keys
- Unsafe deserialization
- Components with known vulnerabilities

Respond ONLY with a JSON object in this exact structure — no prose, no markdown, just raw JSON:
{
  "checkpoint": "<checkpoint name>",
  "files_analyzed": <number>,
  "findings": [
    {
      "file": "<relative file path>",
      "line": <line number or null>,
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "cwe": "<CWE-XXX or null>",
      "title": "<short vulnerability title>",
      "description": "<detailed description of the vulnerability>",
      "recommendation": "<specific remediation advice>"
    }
  ],
  "summary": "<brief overall security assessment of this checkpoint>"
}

If no vulnerabilities are found, return an empty findings array with a summary saying the checkpoint appears secure.
Be precise, thorough, and unambiguous. Your findings protect real systems."""


class SentinelAI:
    def __init__(self, client: anthropic.Anthropic):
        self._client = client

    def find_checkpoint_files(self, target_dir: Path) -> dict[str, list[Path]]:
        checkpoint_files: dict[str, list[Path]] = {cp: [] for cp in SENTINEL_CHECKPOINTS}

        for root, dirs, files in os.walk(target_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for filename in files:
                filepath = Path(root) / filename
                if filepath.suffix not in _ALL_EXTENSIONS:
                    continue
                name_lower = filename.lower()
                for checkpoint, conf in SENTINEL_CHECKPOINTS.items():
                    for pattern in conf["patterns"]:
                        if fnmatch.fnmatch(name_lower, pattern):
                            checkpoint_files[checkpoint].append(filepath)
                            break

        return {cp: files for cp, files in checkpoint_files.items() if files}

    def _read_files(self, files: list[Path], target_dir: Path) -> str:
        parts: list[str] = []
        for filepath in files:
            try:
                relative = filepath.relative_to(target_dir)
                content = filepath.read_text(encoding="utf-8", errors="replace")
                parts.append(f"=== FILE: {relative} ===\n{content}\n")
            except OSError:
                continue
        return "\n".join(parts)

    def analyze_checkpoint(
        self,
        checkpoint_name: str,
        files: list[Path],
        target_dir: Path,
    ) -> dict:
        conf = SENTINEL_CHECKPOINTS[checkpoint_name]
        code_block = self._read_files(files, target_dir)
        file_list = ", ".join(str(f.relative_to(target_dir)) for f in files)

        user_message = (
            f"CHECKPOINT: {checkpoint_name.upper()}\n"
            f"Description: {conf['description']}\n"
            f"Files to analyze ({len(files)} total): {file_list}\n\n"
            f"{code_block}\n\n"
            "Analyze ALL files above for security vulnerabilities. Return the JSON result."
        )

        print(f"  {CYAN}[SENTINEL]{RESET_COLOR} Analyzing checkpoint: {BOLD}{checkpoint_name}{RESET_COLOR} ({len(files)} file(s))")

        full_response = ""
        with self._client.messages.stream(
            model="claude-opus-4-7",
            max_tokens=4096,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                full_response += text

        return self._parse_response(full_response, checkpoint_name, len(files))

    def _parse_response(self, response: str, checkpoint_name: str, files_count: int) -> dict:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {
            "checkpoint": checkpoint_name,
            "files_analyzed": files_count,
            "findings": [],
            "summary": f"Parse error — raw response: {response[:200]}",
        }

    def scan(self, target_dir: Path) -> dict:
        print(SENTINEL_BANNER)
        print(f"\n{CYAN}Locating checkpoint files in: {target_dir}{RESET_COLOR}\n")

        checkpoint_map = self.find_checkpoint_files(target_dir)

        if not checkpoint_map:
            print(f"  {MAGENTA}No checkpoint files found in target directory.{RESET_COLOR}")
            return {"checkpoints": {}, "total_findings": 0}

        results: dict[str, dict] = {}
        for checkpoint_name, files in checkpoint_map.items():
            result = self.analyze_checkpoint(checkpoint_name, files, target_dir)
            results[checkpoint_name] = result

        total_findings = sum(len(r.get("findings", [])) for r in results.values())
        return {"checkpoints": results, "total_findings": total_findings}
