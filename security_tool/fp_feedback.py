"""
False Positive Feedback Store — lets analysts mark findings as FP so future
scans suppress or down-rank similar patterns.

State persisted to .bass_fp_feedback.json
Format:
  {
    "suppressions": [
      {file, cwe, title_pattern, reported_by, reason, created_at}
    ],
    "fp_stats": {cwe: {total: N, fp_count: M}}
  }

The suppression is applied at the coordinator level:
  - Exact match (file + line + cwe): fully suppressed
  - Fuzzy match (file + cwe + similar title): confidence reduced by 30
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

_FP_FILE = Path(__file__).parent / ".bass_fp_feedback.json"


def _load() -> dict:
    if _FP_FILE.exists():
        try:
            return json.loads(_FP_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"suppressions": [], "fp_stats": {}}


def _save(state: dict) -> None:
    try:
        _FP_FILE.write_text(json.dumps(state, indent=2, default=str))
    except OSError:
        pass


def record_false_positive(
    file: str,
    line: int | None,
    cwe: str,
    title: str,
    reported_by: str = "analyst",
    reason: str = "",
) -> dict:
    """Mark a finding as a false positive. Returns the suppression record."""
    state = _load()
    suppression = {
        "file": file,
        "line": line,
        "cwe": cwe,
        "title": title,
        "title_words": _title_words(title),
        "reported_by": reported_by,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    state["suppressions"].append(suppression)

    # Update stats
    stats = state.setdefault("fp_stats", {})
    entry = stats.setdefault(cwe, {"total": 0, "fp_count": 0})
    entry["fp_count"] += 1

    _save(state)
    return suppression


def record_true_positive(cwe: str) -> None:
    """Record a confirmed true positive (not a FP) to calibrate stats."""
    state = _load()
    stats = state.setdefault("fp_stats", {})
    entry = stats.setdefault(cwe, {"total": 0, "fp_count": 0})
    entry["total"] += 1
    _save(state)


def get_fp_rate(cwe: str) -> float:
    """Return historical FP rate (0.0–1.0) for a given CWE."""
    state = _load()
    entry = state.get("fp_stats", {}).get(cwe, {})
    total = entry.get("total", 0)
    fp = entry.get("fp_count", 0)
    if total + fp == 0:
        return 0.0
    return fp / (total + fp)


def apply_fp_suppressions(findings: list[dict]) -> list[dict]:
    """
    Filter and adjust confidence for findings matching known FPs.

    - Exact match (file + line + cwe): removed entirely
    - Fuzzy match (file + cwe + 2+ matching title words): confidence reduced by 30
    """
    state = _load()
    suppressions = state.get("suppressions", [])
    if not suppressions:
        return findings

    result = []
    for f in findings:
        exact_match = any(
            s["file"] == f.get("file")
            and s["cwe"] == f.get("cwe")
            and (s["line"] is None or s["line"] == f.get("line"))
            for s in suppressions
        )
        if exact_match:
            continue

        fuzzy_match = any(
            s["file"] == f.get("file")
            and s["cwe"] == f.get("cwe")
            and len(_title_words(f.get("title", "")) & set(s.get("title_words", []))) >= 2
            for s in suppressions
        )
        if fuzzy_match:
            f = dict(f)
            f["confidence"] = max(0, f.get("confidence", 70) - 30)
            f["_fp_suppressed"] = True

        result.append(f)

    return result


def build_fp_context_block(limit: int = 20) -> str:
    """
    Return a text block for injection into AI prompts describing known
    false positive patterns so the AI avoids re-flagging them.
    """
    state = _load()
    suppressions = state.get("suppressions", [])[-limit:]
    if not suppressions:
        return ""

    lines = ["KNOWN FALSE POSITIVES (do not re-flag these patterns):"]
    for s in suppressions:
        lines.append(
            f"  - [{s['cwe']}] {s['title']} in {s['file']}"
            + (f" (reason: {s['reason']})" if s.get("reason") else "")
        )
    return "\n".join(lines)


def list_suppressions() -> list[dict]:
    return _load().get("suppressions", [])


def remove_suppression(file: str, cwe: str, title: str) -> bool:
    """Remove a suppression by (file, cwe, title). Returns True if removed."""
    state = _load()
    before = len(state["suppressions"])
    state["suppressions"] = [
        s for s in state["suppressions"]
        if not (s["file"] == file and s["cwe"] == cwe and s["title"] == title)
    ]
    if len(state["suppressions"]) < before:
        _save(state)
        return True
    return False


def _title_words(title: str) -> set[str]:
    return {w.lower() for w in re.split(r'\W+', title) if len(w) > 3}
