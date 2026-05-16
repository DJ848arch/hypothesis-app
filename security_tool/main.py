#!/usr/bin/env python3
"""
BASS — Base Alert Security System
AI-Powered Security Intelligence Platform

Entry point. Handles BASS authorization, CLI argument parsing,
and launches the SecurityCoordinator.

Usage:
    python main.py [TARGET_DIR] [--mode sentinel|patrol|both] [--notify-on SEVERITY] [--key API_KEY]
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

from config import (
    BASS_BANNER,
    SEVERITY_LEVELS,
    RESET_COLOR,
    BOLD,
    GREEN,
    RED,
    YELLOW,
    CYAN,
    MAGENTA,
)


# ──────────────────────────────────────────────────────────────
# BASS Authorization
# ──────────────────────────────────────────────────────────────

_BASS_PASSPHRASE = "BASS-ARMED"
_MAX_ATTEMPTS = 3


def _animated_print(text: str, delay: float = 0.03) -> None:
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()


def _bass_authorization() -> bool:
    print(BASS_BANNER)
    _animated_print(f"{BOLD}{CYAN}Initializing BASS — Base Alert Security System...{RESET_COLOR}", 0.02)
    time.sleep(0.4)
    _animated_print(f"{YELLOW}BASS authorization required before security AIs can be armed.{RESET_COLOR}", 0.02)
    print()

    print(f"  {BOLD}Authorization passphrase:{RESET_COLOR} {CYAN}BASS-ARMED{RESET_COLOR}")
    print(f"  {MAGENTA}(Type the passphrase exactly to arm the system){RESET_COLOR}")
    print()

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            entered = input(f"  BASS [{attempt}/{_MAX_ATTEMPTS}] Enter passphrase: ").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n  {RED}Authorization aborted. BASS remains disarmed.{RESET_COLOR}\n")
            return False

        if entered == _BASS_PASSPHRASE:
            print()
            _animated_print(f"  {GREEN}{BOLD}✔  BASS AUTHORIZATION ACCEPTED{RESET_COLOR}", 0.02)
            _animated_print(f"  {GREEN}Security AIs are now ARMED and ready to deploy.{RESET_COLOR}", 0.02)
            time.sleep(0.3)
            print()
            return True
        else:
            remaining = _MAX_ATTEMPTS - attempt
            if remaining > 0:
                print(f"  {RED}✖  Incorrect passphrase. {remaining} attempt(s) remaining.{RESET_COLOR}")
            else:
                print(f"  {RED}{BOLD}✖  Authorization FAILED. BASS remains disarmed.{RESET_COLOR}")
                print(f"  {RED}Security AIs will NOT be deployed. Exiting.{RESET_COLOR}\n")

    return False


# ──────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="bass",
        description="BASS — Base Alert Security System: AI-powered codebase security scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  python main.py /path/to/project
  python main.py /path/to/project --mode sentinel
  python main.py /path/to/project --mode patrol --notify-on HIGH
  python main.py . --key sk-ant-...
        """,
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=".",
        help="Target directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--mode",
        choices=["sentinel", "patrol", "both"],
        default="both",
        help="Which AI to deploy: sentinel (checkpoints only), patrol (full scan), both (default)",
    )
    parser.add_argument(
        "--notify-on",
        choices=list(SEVERITY_LEVELS.keys()),
        default="MEDIUM",
        metavar="SEVERITY",
        help=f"Minimum severity to trigger human notification (default: MEDIUM). Choices: {', '.join(SEVERITY_LEVELS)}",
    )
    parser.add_argument(
        "--key",
        default=None,
        metavar="API_KEY",
        help="Anthropic API key (overrides ANTHROPIC_API_KEY environment variable)",
    )
    parser.add_argument(
        "--no-bass",
        action="store_true",
        help="Skip BASS authorization (for automated/CI use — requires --key)",
    )
    return parser.parse_args()


def _resolve_api_key(args: argparse.Namespace) -> str:
    key = args.key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        print(f"{RED}{BOLD}Error:{RESET_COLOR} No Anthropic API key found.")
        print(f"  Set the {CYAN}ANTHROPIC_API_KEY{RESET_COLOR} environment variable or pass {CYAN}--key sk-ant-...{RESET_COLOR}")
        sys.exit(1)
    return key


def _resolve_target(raw: str) -> Path:
    target = Path(raw).resolve()
    if not target.exists():
        print(f"{RED}{BOLD}Error:{RESET_COLOR} Target directory does not exist: {target}")
        sys.exit(1)
    if not target.is_dir():
        print(f"{RED}{BOLD}Error:{RESET_COLOR} Target is not a directory: {target}")
        sys.exit(1)
    return target


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main() -> None:
    args = _parse_args()

    # BASS must be authorized before AIs are armed
    if args.no_bass:
        if not args.key and not os.environ.get("ANTHROPIC_API_KEY"):
            print(f"{RED}--no-bass requires --key or ANTHROPIC_API_KEY to be set.{RESET_COLOR}")
            sys.exit(1)
        print(f"{YELLOW}[BASS] Authorization bypassed (--no-bass flag). Proceeding in automated mode.{RESET_COLOR}\n")
    else:
        if not _bass_authorization():
            sys.exit(1)

    api_key = _resolve_api_key(args)
    target_dir = _resolve_target(args.target)

    print(f"{BOLD}{CYAN}Target:{RESET_COLOR}    {target_dir}")
    print(f"{BOLD}{CYAN}Mode:{RESET_COLOR}      {args.mode.upper()}")
    print(f"{BOLD}{CYAN}Notify on:{RESET_COLOR} {args.notify_on.upper()} and above")
    print()

    # Import here to avoid loading heavy dependencies before BASS auth
    from coordinator import SecurityCoordinator

    coordinator = SecurityCoordinator(api_key=api_key)
    coordinator.run(
        target_dir=target_dir,
        mode=args.mode,
        notify_on=args.notify_on,
    )


if __name__ == "__main__":
    main()
