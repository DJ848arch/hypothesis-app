"""
Responder AI — proposes minimal, targeted code fixes for confirmed findings.

Takes a finding + the affected file and produces a unified diff.
Never applies changes directly — that's the remediation engine's job.
"""

from __future__ import annotations

import re
from pathlib import Path

import anthropic

from config import CYAN, YELLOW, RESET_COLOR, BOLD

SYSTEM_PROMPT = """You are RESPONDER AI, a surgical security remediation specialist.

You receive a confirmed security vulnerability and the affected source code.
Your job is to produce a precise, minimal fix — nothing more, nothing less.

Your fix MUST:
1. Address exactly the reported vulnerability
2. Preserve all existing functionality
3. Match the file's existing code style and conventions
4. Not introduce new imports unless strictly necessary
5. Not refactor unrelated code
6. Be syntactically valid

Output format — respond with EXACTLY this structure, no other text:

DIFF:
--- a/{filepath}
+++ b/{filepath}
@@ -N,M +N,M @@
 context line
-removed line
+added line
 context line

EXPLANATION:
<2-3 sentences: what the fix does and why it's safe>

If you cannot produce a safe, minimal fix (e.g. requires architectural changes or the fix would break functionality), respond with:
CANNOT_FIX: <clear reason why>

Do not include markdown fences. Do not add commentary outside the specified format."""


class ResponderAI:
    def __init__(self, client: anthropic.Anthropic):
        self._client = client

    def propose_fix(self, finding: dict, target_dir: Path) -> dict:
        """
        Propose a fix for a single finding.
        Returns a dict with keys: status, diff, explanation, finding.
        status is one of: proposed, cannot_fix, error
        """
        file_path = finding.get("file", "")
        line = finding.get("line")

        full_path = Path(file_path) if Path(file_path).is_absolute() else target_dir / file_path
        try:
            code = full_path.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            return {"status": "error", "error": str(e), "finding": finding}

        print(f"  {CYAN}[RESPONDER]{RESET_COLOR} Proposing fix for: {BOLD}{finding.get('title')}{RESET_COLOR} ({file_path}:{line or '?'})")

        user_message = (
            f"FINDING:\n"
            f"  Title: {finding.get('title')}\n"
            f"  Severity: {finding.get('severity')}\n"
            f"  CWE: {finding.get('cwe', 'N/A')}\n"
            f"  File: {file_path}\n"
            f"  Line: {line or 'unknown'}\n"
            f"  Description: {finding.get('description')}\n"
            f"  Recommendation: {finding.get('recommendation')}\n\n"
            f"SOURCE CODE ({file_path}):\n"
            f"```\n{code}\n```\n\n"
            "Produce the fix diff and explanation in the specified format."
        )

        full_response = ""
        try:
            with self._client.messages.stream(
                model="claude-opus-4-7",
                max_tokens=2048,
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
        except Exception as exc:
            return {"status": "error", "error": str(exc), "finding": finding}

        return self._parse_response(full_response, finding, file_path)

    def _parse_response(self, response: str, finding: dict, file_path: str) -> dict:
        if response.strip().startswith("CANNOT_FIX:"):
            reason = response.strip().removeprefix("CANNOT_FIX:").strip()
            print(f"  {YELLOW}[RESPONDER] Cannot auto-fix: {reason[:80]}{RESET_COLOR}")
            return {"status": "cannot_fix", "reason": reason, "finding": finding}

        diff_match = re.search(r"DIFF:\s*(---.*?)(?=\nEXPLANATION:|$)", response, re.DOTALL)
        expl_match = re.search(r"EXPLANATION:\s*(.*?)$", response, re.DOTALL)

        diff = diff_match.group(1).strip() if diff_match else ""
        explanation = expl_match.group(1).strip() if expl_match else ""

        if not diff or not diff.startswith("---"):
            return {"status": "error", "error": "Responder produced no valid diff", "finding": finding}

        return {
            "status": "proposed",
            "diff": diff,
            "explanation": explanation,
            "file": file_path,
            "finding": finding,
        }
