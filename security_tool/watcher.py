"""
BASS Watch Mode — monitor the target directory for file changes and
trigger targeted re-scans whenever source files are modified.

Uses polling (no external deps). Checks every 2 seconds; batches rapid
changes into a single scan 1 second after the last event.
"""

from __future__ import annotations

import os
import sys
import time
import threading
from pathlib import Path
from typing import Callable

from config import CODE_EXTENSIONS, EXCLUDED_DIRS, CYAN, YELLOW, GREEN, MAGENTA, RESET_COLOR, BOLD


ChangeCallback = Callable[[set[Path]], None]


class FileWatcher:
    """
    Poll-based filesystem watcher. Detects creates, modifies, and deletes
    for code files within the target directory tree.
    """

    def __init__(self, target_dir: Path, on_change: ChangeCallback, poll_interval: float = 2.0):
        self._target = target_dir
        self._on_change = on_change
        self._interval = poll_interval
        self._snapshots: dict[Path, float] = {}
        self._stop_event = threading.Event()
        self._pending: set[Path] = set()
        self._last_change_time: float = 0
        self._debounce_secs = 1.5

    def _snapshot(self) -> dict[Path, float]:
        snap: dict[Path, float] = {}
        for root, dirs, files in os.walk(self._target):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for fname in files:
                p = Path(root) / fname
                if p.suffix in CODE_EXTENSIONS:
                    try:
                        snap[p] = p.stat().st_mtime
                    except OSError:
                        pass
        return snap

    def _diff(self, old: dict[Path, float], new: dict[Path, float]) -> set[Path]:
        changed: set[Path] = set()
        for p, mtime in new.items():
            if p not in old or old[p] != mtime:
                changed.add(p)
        for p in old:
            if p not in new:
                changed.add(p)
        return changed

    def start(self) -> None:
        self._snapshots = self._snapshot()
        print(f"{CYAN}[WATCH]{RESET_COLOR} Monitoring {self._target} ({len(self._snapshots)} files)")
        print(f"{CYAN}[WATCH]{RESET_COLOR} Press Ctrl+C to stop.\n")

        while not self._stop_event.is_set():
            time.sleep(self._interval)
            current = self._snapshot()
            changed = self._diff(self._snapshots, current)
            if changed:
                self._pending.update(changed)
                self._last_change_time = time.time()
                self._snapshots = current

            if self._pending and (time.time() - self._last_change_time) >= self._debounce_secs:
                batch = set(self._pending)
                self._pending.clear()
                self._on_change(batch)

    def stop(self) -> None:
        self._stop_event.set()


# ──────────────────────────────────────────────────────────────
# Watch-mode orchestration
# ──────────────────────────────────────────────────────────────

def run_watch_mode(
    target_dir: Path,
    api_key: str,
    mode: str = "both",
    notify_on: str = "MEDIUM",
    interactive: bool = False,
    alert_manager=None,
) -> None:
    """
    Enter continuous watch mode. Rescans changed files on every save.
    Calls alert_manager.send_scan_results() if configured.
    """
    from coordinator import SecurityCoordinator

    coordinator = SecurityCoordinator(api_key=api_key)
    scan_count = [0]

    def on_change(changed_files: set[Path]) -> None:
        scan_count[0] += 1
        rel_files = sorted(p.relative_to(target_dir) for p in changed_files if p.exists())
        deleted = sorted(p.relative_to(target_dir) for p in changed_files if not p.exists())

        print(f"\n{BOLD}{MAGENTA}{'─'*60}{RESET_COLOR}")
        print(f"{CYAN}[WATCH #{scan_count[0]}]{RESET_COLOR} {len(rel_files)} file(s) changed:")
        for f in rel_files[:10]:
            print(f"  · {f}")
        if deleted:
            for f in deleted[:5]:
                print(f"  · {YELLOW}deleted:{RESET_COLOR} {f}")
        if len(rel_files) > 10:
            print(f"  … and {len(rel_files) - 10} more")
        print()

        results = coordinator.run(
            target_dir=target_dir,
            mode=mode,
            notify_on=notify_on,
            interactive=interactive,
            remediate=False,
        )

        highest = results.get("highest_severity", "CLEAR")
        total = results.get("total_findings", 0)
        counts = results.get("severity_counts", {})

        sev_color = {
            "CRITICAL": "\033[91m", "HIGH": "\033[33m", "MEDIUM": "\033[93m",
            "LOW": "\033[94m", "INFO": "\033[96m", "CLEAR": "\033[92m",
        }.get(highest, "")

        print(f"\n{sev_color}{BOLD}[WATCH] Result: {highest}{RESET_COLOR} — {total} finding(s)")
        if total:
            breakdown = " | ".join(
                f"{s}: {counts.get(s, 0)}"
                for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
                if counts.get(s, 0) > 0
            )
            if breakdown:
                print(f"       {breakdown}")

        if alert_manager and alert_manager.is_configured():
            outcomes = alert_manager.send_scan_results(results)
            sent_to = [ch for ch, ok in outcomes.items() if ok]
            if sent_to:
                print(f"{GREEN}[WATCH] Alert sent → {', '.join(sent_to)}{RESET_COLOR}")

        print(f"{CYAN}[WATCH]{RESET_COLOR} Waiting for changes…")

    watcher = FileWatcher(target_dir=target_dir, on_change=on_change)
    try:
        watcher.start()
    except KeyboardInterrupt:
        watcher.stop()
        print(f"\n{YELLOW}[WATCH] Stopped.{RESET_COLOR}")
