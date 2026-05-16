"""
Abstract base class for security tool adapters.

Each adapter wraps an external security tool (Bandit, Semgrep, etc.)
and normalizes its output to a common Finding format that both the
AI agents and the dashboard can consume.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import TypedDict


class NormalizedFinding(TypedDict, total=False):
    file: str
    line: int | None
    severity: str          # CRITICAL / HIGH / MEDIUM / LOW / INFO
    cwe: str | None
    title: str
    description: str
    recommendation: str
    _source: str           # tool name e.g. BANDIT
    _checkpoint: None
    _tool_id: str          # original tool's unique finding ID (for dedup)


class SecurityAdapter(ABC):
    name: str = ""
    description: str = ""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the underlying tool is installed and runnable."""

    @abstractmethod
    def scan(self, target: Path) -> list[NormalizedFinding]:
        """Run the tool against target and return normalized findings."""

    def _sev(self, raw: str) -> str:
        mapping = {
            "critical": "CRITICAL",
            "high": "HIGH",
            "error": "HIGH",
            "medium": "MEDIUM",
            "warning": "MEDIUM",
            "low": "LOW",
            "info": "INFO",
            "note": "INFO",
            "none": "INFO",
        }
        return mapping.get(raw.lower(), "MEDIUM")
