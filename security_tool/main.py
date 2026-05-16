#!/usr/bin/env python3
"""
BASS — Base Alert Security System
AI-Powered Security Intelligence Platform

Usage:
    python main.py [TARGET] [--mode sentinel|patrol|both]
                            [--format text|json|html]
                            [--output FILE]
                            [--fail-on SEVERITY]
                            [--notify-on SEVERITY]
                            [--github-action]
                            [--no-bass]
                            [--key API_KEY]
"""

from __future__ import annotations

import argparse
import json
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

_BASS_PASSPHRASE = "BASS-ARMED"
_MAX_ATTEMPTS = 3


# ──────────────────────────────────────────────────────────────
# BASS Authorization
# ──────────────────────────────────────────────────────────────

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
  python main.py . --mode sentinel --format html --output report.html
  python main.py . --mode patrol --fail-on HIGH
  python main.py . --github-action --no-bass --key sk-ant-...
        """,
    )
    parser.add_argument(
        "target", nargs="?", default=".",
        help="Target directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--mode", choices=["sentinel", "patrol", "both"], default="both",
        help="Which AI to deploy (default: both)",
    )
    parser.add_argument(
        "--format", choices=["text", "json", "html"], default="text",
        dest="output_format",
        help="Output format (default: text). Use html to generate a report.",
    )
    parser.add_argument(
        "--output", default=None, metavar="FILE",
        help="Save report to FILE (required when --format is html or json)",
    )
    parser.add_argument(
        "--fail-on",
        choices=[*list(SEVERITY_LEVELS.keys()), "NONE"],
        default="NONE",
        metavar="SEVERITY",
        help="Exit with code 1 if any finding meets or exceeds this severity (default: NONE). "
             f"Choices: {', '.join(SEVERITY_LEVELS)}, NONE",
    )
    parser.add_argument(
        "--notify-on",
        choices=list(SEVERITY_LEVELS.keys()),
        default="MEDIUM",
        metavar="SEVERITY",
        help="Minimum severity for interactive human notification (default: MEDIUM)",
    )
    parser.add_argument(
        "--github-action", action="store_true",
        help="Enable GitHub Actions mode: emit annotations, step summary, output vars",
    )
    parser.add_argument(
        "--remediate", action="store_true",
        help="Enable Responder AI: propose fixes for findings and apply approved ones (always human-gated)",
    )
    parser.add_argument(
        "--notify-only", action="store_true",
        help="Notify only — disable remediation even if --remediate is set (overrides --remediate)",
    )
    parser.add_argument(
        "--no-bass", action="store_true",
        help="Skip BASS authorization (for CI/automated use)",
    )
    parser.add_argument(
        "--key", default=None, metavar="API_KEY",
        help="Anthropic API key (overrides ANTHROPIC_API_KEY env var)",
    )
    return parser.parse_args()


def _resolve_api_key(args: argparse.Namespace) -> str:
    key = args.key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        print(f"{RED}{BOLD}Error:{RESET_COLOR} No Anthropic API key found.")
        print(f"  Set {CYAN}ANTHROPIC_API_KEY{RESET_COLOR} or pass {CYAN}--key sk-ant-...{RESET_COLOR}")
        sys.exit(1)
    return key


def _resolve_target(raw: str) -> Path:
    target = Path(raw).resolve()
    if not target.exists():
        print(f"{RED}{BOLD}Error:{RESET_COLOR} Target does not exist: {target}")
        sys.exit(1)
    if not target.is_dir():
        print(f"{RED}{BOLD}Error:{RESET_COLOR} Target is not a directory: {target}")
        sys.exit(1)
    return target


def _should_fail(results: dict, fail_on: str) -> bool:
    if fail_on == "NONE":
        return False
    fail_priority = SEVERITY_LEVELS.get(fail_on.upper(), {}).get("priority", 0)
    from config import SEVERITY_LEVELS as SL
    for finding in results.get("all_findings", []):
        sev = finding.get("severity", "INFO").upper()
        if SL.get(sev, {}).get("priority", 0) >= fail_priority:
            return True
    return False


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main() -> None:
    args = _parse_args()

    github_action = args.github_action or os.environ.get("GITHUB_ACTIONS") == "true"
    interactive = not github_action and not args.no_bass

    if not args.no_bass and not github_action:
        if not _bass_authorization():
            sys.exit(1)
    elif github_action:
        print(f"{YELLOW}[BASS] GitHub Actions mode — authorization bypassed.{RESET_COLOR}\n")
    else:
        print(f"{YELLOW}[BASS] Authorization bypassed (--no-bass).{RESET_COLOR}\n")

    api_key = _resolve_api_key(args)
    target_dir = _resolve_target(args.target)

    print(f"{BOLD}{CYAN}Target:{RESET_COLOR}    {target_dir}")
    print(f"{BOLD}{CYAN}Mode:{RESET_COLOR}      {args.mode.upper()}")
    print(f"{BOLD}{CYAN}Format:{RESET_COLOR}    {args.output_format.upper()}")
    if args.fail_on != "NONE":
        print(f"{BOLD}{CYAN}Fail on:{RESET_COLOR}   {args.fail_on.upper()} and above")
    print()

    from coordinator import SecurityCoordinator

    remediate = args.remediate and not args.notify_only and interactive
    if args.remediate and args.notify_only:
        print(f"{YELLOW}[BASS] --notify-only overrides --remediate. Running in notify-only mode.{RESET_COLOR}\n")

    coordinator = SecurityCoordinator(api_key=api_key)
    results = coordinator.run(
        target_dir=target_dir,
        mode=args.mode,
        notify_on=args.notify_on,
        interactive=interactive,
        remediate=remediate,
    )

    # GitHub Actions integration
    if github_action:
        from github_output import emit_all_annotations, write_step_summary, set_outputs
        emit_all_annotations(results)
        write_step_summary(results)
        set_outputs(results)

    # Output / report
    if args.output_format == "json":
        output = json.dumps(results, indent=2, default=str)
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
            print(f"{GREEN}JSON report saved to: {args.output}{RESET_COLOR}")
        else:
            print(output)

    elif args.output_format == "html":
        from reporter import generate_html_report
        html_content = generate_html_report(results)
        out_path = args.output or "bass-report.html"
        Path(out_path).write_text(html_content, encoding="utf-8")
        print(f"{GREEN}HTML report saved to: {out_path}{RESET_COLOR}")

    # Fail-on check (for CI)
    if _should_fail(results, args.fail_on):
        print(f"\n{RED}{BOLD}✖  BASS: Failing — findings at or above {args.fail_on.upper()} detected.{RESET_COLOR}")
        sys.exit(1)


if __name__ == "__main__":
    main()
