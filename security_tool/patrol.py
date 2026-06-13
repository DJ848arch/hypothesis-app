"""
Patrol AI — dynamically patrols the entire codebase.

Unlike Sentinel (which watches fixed checkpoints), Patrol sweeps every
code file in the target directory and looks for security issues.
Files are batched to stay within context limits.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import anthropic

from config import (
    CODE_EXTENSIONS,
    EXCLUDED_DIRS,
    PATROL_BANNER,
    BOLD,
    RESET_COLOR,
    GREEN,
    MAGENTA,
)

SYSTEM_PROMPT = """You are PATROL AI, a dynamic security patrol agent that sweeps entire codebases for vulnerabilities.

Unlike a static guard, you roam freely across all code and look for security problems wherever they may hide.

For each batch of files you receive, perform a thorough security analysis covering:
- Injection flaws (SQL, command, code, template, path traversal)
- Authentication weaknesses (weak passwords, missing auth checks, token issues)
- Broken access control (IDOR, privilege escalation, missing authorization)
- Cryptographic failures (weak algorithms, hardcoded keys, insecure randomness)
- Security misconfiguration (debug modes, verbose errors, unsafe defaults)
- Sensitive data exposure (logging PII, unencrypted storage, weak transport)
- Insecure dependencies or dangerous function calls
- Race conditions and time-of-check/time-of-use bugs
- Business logic flaws with security implications
- Secrets, credentials, or tokens hardcoded in source

When IMPORT CONTEXT is provided for a file, use it to understand the full call chain.
A vulnerability is more severe when user input can demonstrably reach the dangerous call.

CONFIDENCE SCORING: For each finding, assess your confidence that this is a real (not false positive) vulnerability:
- 90-100: Clear, direct vulnerability with no mitigating controls visible
- 70-89: Likely real but some context is missing or partial mitigations exist
- 50-69: Possible issue; depends on runtime context or caller behavior
- Below 50: Do not report — too speculative

Respond ONLY with a JSON object in this exact structure — no prose, no markdown, just raw JSON:
{
  "batch_id": <integer>,
  "files_analyzed": <number>,
  "findings": [
    {
      "file": "<relative file path>",
      "line": <line number or null>,
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "cwe": "<CWE-XXX or null>",
      "title": "<short vulnerability title>",
      "description": "<detailed description>",
      "recommendation": "<specific remediation advice>",
      "confidence": <integer 50-100>
    }
  ],
  "summary": "<brief assessment of this batch>"
}

If no vulnerabilities are found in a batch, return an empty findings array.
Be thorough but precise — prefer false negatives over false positives."""

MAX_CHARS_PER_BATCH = 80_000


class PatrolAI:
    def __init__(self, client: anthropic.Anthropic):
        self._client = client

    def collect_files(self, target_dir: Path) -> list[Path]:
        found: list[Path] = []
        for root, dirs, files in os.walk(target_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for filename in files:
                filepath = Path(root) / filename
                if filepath.suffix in CODE_EXTENSIONS:
                    found.append(filepath)
        return sorted(found)

    def _batch_files(self, files: list[Path], target_dir: Path) -> list[list[tuple[Path, str]]]:
        batches: list[list[tuple[Path, str]]] = []
        current_batch: list[tuple[Path, str]] = []
        current_size = 0

        for filepath in files:
            try:
                content = filepath.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            entry_size = len(content) + len(str(filepath))
            if current_size + entry_size > MAX_CHARS_PER_BATCH and current_batch:
                batches.append(current_batch)
                current_batch = []
                current_size = 0

            current_batch.append((filepath, content))
            current_size += entry_size

        if current_batch:
            batches.append(current_batch)

        return batches

    def _resolve_import_context(self, filepath: Path, content: str, target_dir: Path) -> str:
        """
        Resolve local imports for a file and return a short summary of
        what those imported modules expose (functions, classes, sinks).
        Caps at 3000 chars total to avoid blowing the context window.
        """
        import_re = re.compile(
            r'(?:from\s+([\w.]+)\s+import|import\s+([\w.]+)|require\(["\']([^"\']+)["\'])'
        )
        imported_summaries: list[str] = []
        char_budget = 3000

        for m in import_re.finditer(content):
            module = (m.group(1) or m.group(2) or m.group(3) or "").replace(".", "/")
            if not module:
                continue
            # Only local modules (no dots in top-level, or relative imports)
            module_base = module.split("/")[-1]
            for ext in [".py", ".js", ".ts", ".jsx", ".tsx"]:
                for search_root in [filepath.parent, target_dir]:
                    candidate = search_root / (module_base + ext)
                    if candidate.exists() and candidate != filepath:
                        try:
                            imp_content = candidate.read_text(encoding="utf-8", errors="replace")
                            rel = str(candidate.relative_to(target_dir))
                            snippet = imp_content[:min(800, char_budget)]
                            imported_summaries.append(f"-- IMPORTED: {rel} --\n{snippet}")
                            char_budget -= len(snippet)
                        except OSError:
                            pass
                        if char_budget <= 0:
                            break
                if char_budget <= 0:
                    break

        return "\n\n".join(imported_summaries) if imported_summaries else ""

    def _analyze_batch(self, batch: list[tuple[Path, str]], batch_id: int, target_dir: Path, extra_context: str = "") -> dict:
        parts: list[str] = []
        file_names: list[str] = []
        import_contexts: list[str] = []

        for filepath, content in batch:
            relative = filepath.relative_to(target_dir)
            file_names.append(str(relative))
            parts.append(f"=== FILE: {relative} ===\n{content}\n")

            # Include cross-file import context
            imp_ctx = self._resolve_import_context(filepath, content, target_dir)
            if imp_ctx:
                import_contexts.append(f"=== IMPORT CONTEXT for {relative} ===\n{imp_ctx}\n")

        code_block = "\n".join(parts)
        file_list = ", ".join(file_names)
        context_section = f"\n{extra_context}\n" if extra_context else ""
        import_section = "\n".join(import_contexts)
        if import_section:
            import_section = f"\nIMPORT CONTEXT (local modules imported by files above):\n{import_section}\n"

        user_message = (
            f"PATROL BATCH {batch_id}\n"
            f"Files ({len(batch)} total): {file_list}\n"
            f"{context_section}"
            f"{import_section}\n"
            f"{code_block}\n\n"
            "Analyze ALL files above for security vulnerabilities. Use the import context to trace data flows across files. Return the JSON result."
        )

        print(f"  {GREEN}[PATROL]{RESET_COLOR} Scanning batch {BOLD}{batch_id}{RESET_COLOR} — {len(batch)} file(s): {file_list[:120]}{'...' if len(file_list) > 120 else ''}")

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

        return self._parse_response(full_response, batch_id, len(batch))

    def _parse_response(self, response: str, batch_id: int, files_count: int) -> dict:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {
            "batch_id": batch_id,
            "files_analyzed": files_count,
            "findings": [],
            "summary": f"Parse error — raw response: {response[:200]}",
        }

    def scan(self, target_dir: Path, extra_context: str = "") -> dict:
        print(PATROL_BANNER)
        print(f"\n{GREEN}Collecting all code files in: {target_dir}{RESET_COLOR}\n")

        all_files = self.collect_files(target_dir)
        if not all_files:
            print(f"  {MAGENTA}No code files found in target directory.{RESET_COLOR}")
            return {"batches": [], "total_files": 0, "total_findings": 0}

        print(f"  {GREEN}Found {len(all_files)} code file(s). Organizing patrol route...{RESET_COLOR}\n")

        batches = self._batch_files(all_files, target_dir)
        print(f"  {GREEN}Patrol divided into {len(batches)} batch(es).{RESET_COLOR}\n")

        batch_results: list[dict] = []
        for i, batch in enumerate(batches, start=1):
            result = self._analyze_batch(batch, i, target_dir, extra_context)
            batch_results.append(result)

        total_findings = sum(len(r.get("findings", [])) for r in batch_results)
        return {
            "batches": batch_results,
            "total_files": len(all_files),
            "total_findings": total_findings,
        }
