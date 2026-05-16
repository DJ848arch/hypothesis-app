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
        "--simulate", nargs="?", const="auto", metavar="ATTACK_TYPE",
        help="Run attack simulations. Optionally specify attack type (sqli, xss, cmdi, ssrf, jwt_attack, etc.). "
             "Without a type, simulates attacks matching found vulnerabilities. "
             "Use --list-attacks to see all available types.",
    )
    parser.add_argument(
        "--list-attacks", action="store_true",
        help="List all available attack simulation types and exit.",
    )
    parser.add_argument(
        "--training-report", default=None, metavar="FILE",
        help="Save training report to FILE (default: bass-training.html) when --simulate is used.",
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
    # ── Watch mode ──────────────────────────────────────────────
    parser.add_argument(
        "--watch", action="store_true",
        help="Watch mode: continuously monitor the target for changes and rescan on every save",
    )
    # ── Threat intelligence ─────────────────────────────────────
    parser.add_argument(
        "--threat-intel", action="store_true",
        help="Enrich findings with CVE/NVD data, EPSS exploit probability, and CISA KEV status",
    )
    # ── Compliance report ───────────────────────────────────────
    parser.add_argument(
        "--compliance", nargs="*", metavar="FRAMEWORK",
        help="Generate a compliance gap report. Optionally specify frameworks: soc2 pci_dss nist_800_53 owasp_asvs. "
             "Omit to include all. Requires --output or saves to bass-compliance.html",
    )
    # ── Alerting ────────────────────────────────────────────────
    parser.add_argument(
        "--slack-webhook", default=None, metavar="URL",
        help="Slack incoming webhook URL for alert notifications (overrides BASS_SLACK_WEBHOOK)",
    )
    parser.add_argument(
        "--teams-webhook", default=None, metavar="URL",
        help="Teams incoming webhook URL for alert notifications (overrides BASS_TEAMS_WEBHOOK)",
    )
    parser.add_argument(
        "--alert-on", default=None, metavar="SEVERITY",
        help="Minimum severity for alert notifications (default: same as --notify-on)",
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

def _handle_list_attacks() -> None:
    from attack_catalog import list_attacks, DIFFICULTY_ORDER
    print(f"\n{BOLD}{CYAN}BASS Attack Simulation Catalog{RESET_COLOR}\n")
    for diff in DIFFICULTY_ORDER:
        attacks = list_attacks(diff)
        if not attacks:
            continue
        print(f"  {BOLD}{diff}{RESET_COLOR}")
        for a in attacks:
            print(f"    · {CYAN}{a['key']:<20}{RESET_COLOR}  {a['name']}  ({a['owasp']})")
        print()


def main() -> None:
    args = _parse_args()

    if args.list_attacks:
        _handle_list_attacks()
        return

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
    from alerting import AlertManager

    # Configure alert manager
    alert_on = args.alert_on or args.notify_on
    alert_manager = AlertManager(min_severity=alert_on)
    if getattr(args, "slack_webhook", None):
        os.environ["BASS_SLACK_WEBHOOK"] = args.slack_webhook
        alert_manager = AlertManager(min_severity=alert_on)
    if getattr(args, "teams_webhook", None):
        os.environ["BASS_TEAMS_WEBHOOK"] = args.teams_webhook
        alert_manager = AlertManager(min_severity=alert_on)

    if alert_manager.is_configured():
        channels = [type(c).__name__ for c in alert_manager._channels]
        print(f"{BOLD}{CYAN}Alerts:{RESET_COLOR}    {', '.join(channels)} (≥ {alert_on})")

    remediate = args.remediate and not args.notify_only and interactive
    if args.remediate and args.notify_only:
        print(f"{YELLOW}[BASS] --notify-only overrides --remediate. Running in notify-only mode.{RESET_COLOR}\n")

    # ── Watch mode ─────────────────────────────────────────────
    if getattr(args, "watch", False):
        from watcher import run_watch_mode
        run_watch_mode(
            target_dir=target_dir,
            api_key=api_key,
            mode=args.mode,
            notify_on=args.notify_on,
            interactive=interactive,
            alert_manager=alert_manager if alert_manager.is_configured() else None,
        )
        return

    coordinator = SecurityCoordinator(api_key=api_key)
    results = coordinator.run(
        target_dir=target_dir,
        mode=args.mode,
        notify_on=args.notify_on,
        interactive=interactive,
        remediate=remediate,
    )

    # ── Threat intelligence enrichment ─────────────────────────
    if getattr(args, "threat_intel", False):
        from threat_intel import enrich_findings, get_threat_summary
        print(f"\n{BOLD}{CYAN}[THREAT INTEL]{RESET_COLOR} Enriching findings with CVE/NVD data…")
        findings = results.get("all_findings", [])
        if findings:
            results["all_findings"] = enrich_findings(findings)
            ti_summary = get_threat_summary(results["all_findings"])
            results["threat_intel_summary"] = ti_summary
            print(f"  CVEs found:       {ti_summary['total_cves_found']}")
            print(f"  Active exploits:  {ti_summary['findings_with_active_exploits']} finding(s) with known exploits")
            if ti_summary["cisa_kev_cves"]:
                print(f"  {RED}{BOLD}CISA KEV:{RESET_COLOR}         {', '.join(ti_summary['cisa_kev_cves'])}")
            print(f"  Max EPSS score:   {ti_summary['max_epss_score']} ({ti_summary['max_epss_label']})")
        else:
            print(f"  No findings to enrich.")
        print()

    # ── Compliance report ───────────────────────────────────────
    if getattr(args, "compliance", None) is not None:
        from compliance import generate_compliance_report, FRAMEWORK_KEYS
        fw_keys = args.compliance or FRAMEWORK_KEYS
        invalid = [k for k in fw_keys if k not in FRAMEWORK_KEYS]
        if invalid:
            print(f"{YELLOW}[COMPLIANCE] Unknown framework(s): {', '.join(invalid)}. "
                  f"Valid: {', '.join(FRAMEWORK_KEYS)}{RESET_COLOR}")
            fw_keys = [k for k in fw_keys if k in FRAMEWORK_KEYS]
        if fw_keys:
            print(f"{BOLD}{CYAN}[COMPLIANCE]{RESET_COLOR} Mapping findings to: {', '.join(fw_keys)}…")
            comp_html = generate_compliance_report(
                findings=results.get("all_findings", []),
                target=str(target_dir),
                scan_id=results.get("scan_id", ""),
                framework_keys=fw_keys,
            )
            comp_path = args.output if args.output and args.output_format not in ("html", "json") else "bass-compliance.html"
            Path(comp_path).write_text(comp_html, encoding="utf-8")
            print(f"{GREEN}Compliance report saved to: {comp_path}{RESET_COLOR}")
        print()

    # ── Alerting ────────────────────────────────────────────────
    if alert_manager.is_configured():
        outcomes = alert_manager.send_scan_results(results)
        for channel, ok in outcomes.items():
            status = f"{GREEN}✔{RESET_COLOR}" if ok else f"{RED}✖{RESET_COLOR}"
            print(f"  {status} Alert → {channel}")

    # Attack simulations
    if args.simulate:
        from simulator import SimulatorAI
        from training_report import generate_training_report
        import anthropic as _anthropic

        client = _anthropic.Anthropic(api_key=api_key)
        sim_ai = SimulatorAI(client)
        simulations: list[dict] = []

        if args.simulate == "auto":
            # Simulate from top findings
            top_findings = results.get("all_findings", [])[:3]
            if not top_findings:
                print(f"{YELLOW}[SIMULATOR] No findings to simulate attacks from.{RESET_COLOR}")
            for finding in top_findings:
                sim = sim_ai.simulate_from_finding(finding, target_dir)
                if sim and not sim.get("error"):
                    simulations.append(sim)
        else:
            sim = sim_ai.simulate_attack_type(args.simulate, target_dir)
            if sim and not sim.get("error"):
                simulations.append(sim)

        if simulations:
            report_path = args.training_report or "bass-training.html"
            html = generate_training_report(simulations, target=str(target_dir))
            Path(report_path).write_text(html, encoding="utf-8")
            print(f"\n{GREEN}Training report saved to: {report_path}{RESET_COLOR}")
            print(f"{CYAN}Share with your security team for training and assessment.{RESET_COLOR}")

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
