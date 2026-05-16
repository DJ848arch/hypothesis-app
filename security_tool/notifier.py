"""
Human notification system.

When Sentinel or Patrol detect vulnerabilities, this module presents
structured alerts to the human operator and displays required security
protocols based on severity.
"""

from __future__ import annotations

import sys
from datetime import datetime

from config import (
    SEVERITY_LEVELS,
    SECURITY_PROTOCOLS,
    RESET_COLOR,
    BOLD,
    GREEN,
    YELLOW,
    RED,
    CYAN,
    MAGENTA,
)


def _color(severity: str) -> str:
    return SEVERITY_LEVELS.get(severity, {}).get("color", "")


def _priority(severity: str) -> int:
    return SEVERITY_LEVELS.get(severity, {}).get("priority", 0)


def _severity_bar(severity: str) -> str:
    bars = {
        "CRITICAL": f"{_color('CRITICAL')}[!!!!! CRITICAL !!!!!]{RESET_COLOR}",
        "HIGH":     f"{_color('HIGH')}[!!!! HIGH !!!!]{RESET_COLOR}",
        "MEDIUM":   f"{_color('MEDIUM')}[!!! MEDIUM !!!]{RESET_COLOR}",
        "LOW":      f"{_color('LOW')}[!! LOW !!]{RESET_COLOR}",
        "INFO":     f"{_color('INFO')}[i INFO i]{RESET_COLOR}",
    }
    return bars.get(severity, f"[{severity}]")


def notify_finding(finding: dict, source: str, checkpoint: str | None = None) -> None:
    severity = finding.get("severity", "INFO").upper()
    file_path = finding.get("file", "unknown")
    line = finding.get("line")
    title = finding.get("title", "Security Issue Detected")
    description = finding.get("description", "")
    recommendation = finding.get("recommendation", "")
    cwe = finding.get("cwe", "")

    location = f"{file_path}:{line}" if line else file_path
    source_label = f"[{source.upper()}]" + (f" [{checkpoint.upper()}]" if checkpoint else "")

    print(f"\n{'═' * 68}")
    print(f"  {_severity_bar(severity)}  {BOLD}{source_label}{RESET_COLOR}")
    print(f"{'─' * 68}")
    print(f"  {BOLD}Title:{RESET_COLOR}       {title}")
    print(f"  {BOLD}Location:{RESET_COLOR}    {location}")
    if cwe:
        print(f"  {BOLD}CWE:{RESET_COLOR}         {cwe}")
    print(f"  {BOLD}Description:{RESET_COLOR}")
    for line_text in description.splitlines():
        print(f"    {line_text}")
    if recommendation:
        print(f"  {BOLD}Recommendation:{RESET_COLOR}")
        for line_text in recommendation.splitlines():
            print(f"    {line_text}")
    print(f"{'═' * 68}")


def notify_human(findings: list[dict], source: str, checkpoint: str | None = None) -> None:
    if not findings:
        return

    sorted_findings = sorted(findings, key=lambda f: _priority(f.get("severity", "INFO").upper()), reverse=True)

    for finding in sorted_findings:
        notify_finding(finding, source, checkpoint)

    highest_severity = sorted_findings[0].get("severity", "INFO").upper()
    _display_protocols(highest_severity)
    _prompt_human_acknowledgment(findings, source)


def _display_protocols(severity: str) -> None:
    protocols = SECURITY_PROTOCOLS.get(severity, SECURITY_PROTOCOLS["INFO"])
    color = _color(severity)

    print(f"\n{BOLD}{color}⚠  SECURITY PROTOCOL — {severity}{RESET_COLOR}")
    print(f"{'─' * 68}")
    print(f"{BOLD}Required human actions:{RESET_COLOR}")
    for step in protocols:
        print(f"  {step}")
    print()


def _prompt_human_acknowledgment(findings: list[dict], source: str) -> None:
    severities = [f.get("severity", "INFO").upper() for f in findings]
    has_critical = "CRITICAL" in severities
    has_high = "HIGH" in severities

    print(f"\n{RED if has_critical or has_high else YELLOW}{'▓' * 68}{RESET_COLOR}")
    print(f"{BOLD}  HUMAN OPERATOR ACTION REQUIRED{RESET_COLOR}")
    print(f"{'▓' * 68}")
    print(f"  Source:   {source.upper()}")
    print(f"  Findings: {len(findings)} vulnerability/vulnerabilities detected")
    print(f"  Time:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    if has_critical:
        print(f"  {RED}{BOLD}CRITICAL vulnerabilities detected — immediate action required!{RESET_COLOR}")
        print(f"  {RED}All deployments must be halted until resolved.{RESET_COLOR}")
    elif has_high:
        print(f"  {_color('HIGH')}{BOLD}HIGH severity findings — urgent review needed within 24 hours.{RESET_COLOR}")
    else:
        print(f"  {YELLOW}Security findings logged. Review and remediate per protocol above.{RESET_COLOR}")

    print()
    print("  Press ENTER to acknowledge and continue...")
    try:
        input()
    except (EOFError, KeyboardInterrupt):
        print()


def print_summary_report(sentinel_results: dict, patrol_results: dict) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n{'╔' + '═' * 66 + '╗'}")
    print(f"{'║':1}{'BASS SECURITY SCAN REPORT':^66}{'║':1}")
    print(f"{'║':1}{f'Generated: {now}':^66}{'║':1}")
    print(f"{'╚' + '═' * 66 + '╝'}")

    # Collect all findings
    all_findings: list[dict] = []

    sentinel_checkpoints = sentinel_results.get("checkpoints", {})
    for cp_name, cp_data in sentinel_checkpoints.items():
        for finding in cp_data.get("findings", []):
            finding["_source"] = "SENTINEL"
            finding["_checkpoint"] = cp_name
            all_findings.append(finding)

    patrol_batches = patrol_results.get("batches", [])
    for batch in patrol_batches:
        for finding in batch.get("findings", []):
            finding["_source"] = "PATROL"
            finding["_checkpoint"] = None
            all_findings.append(finding)

    severity_counts: dict[str, int] = {s: 0 for s in SEVERITY_LEVELS}
    for f in all_findings:
        sev = f.get("severity", "INFO").upper()
        if sev in severity_counts:
            severity_counts[sev] += 1

    print(f"\n{BOLD}  FINDINGS SUMMARY{RESET_COLOR}")
    print(f"  {'─' * 40}")
    for sev, count in sorted(severity_counts.items(), key=lambda x: _priority(x[0]), reverse=True):
        color = _color(sev)
        bar = "█" * count if count <= 30 else "█" * 30 + f"(+{count - 30})"
        print(f"  {color}{sev:<10}{RESET_COLOR}  {count:>4}  {color}{bar}{RESET_COLOR}")

    print(f"\n  {BOLD}Total findings: {len(all_findings)}{RESET_COLOR}")
    print(f"  Sentinel checkpoints scanned: {len(sentinel_checkpoints)}")
    print(f"  Patrol files scanned:         {patrol_results.get('total_files', 0)}")

    if sentinel_checkpoints:
        print(f"\n{BOLD}  SENTINEL CHECKPOINT RESULTS{RESET_COLOR}")
        print(f"  {'─' * 40}")
        for cp_name, cp_data in sentinel_checkpoints.items():
            count = len(cp_data.get("findings", []))
            status = f"{RED}✖  {count} finding(s){RESET_COLOR}" if count else f"{GREEN}✔  Clean{RESET_COLOR}"
            print(f"  {cp_name:<25} {status}")
            summary = cp_data.get("summary", "")
            if summary:
                print(f"    {CYAN}{summary[:90]}{RESET_COLOR}")

    if patrol_batches:
        total_patrol_findings = sum(len(b.get("findings", [])) for b in patrol_batches)
        print(f"\n{BOLD}  PATROL RESULTS{RESET_COLOR}")
        print(f"  {'─' * 40}")
        status = f"{RED}✖  {total_patrol_findings} finding(s) across {len(patrol_batches)} batch(es){RESET_COLOR}" if total_patrol_findings else f"{GREEN}✔  No issues found{RESET_COLOR}"
        print(f"  Full codebase patrol: {status}")

    overall = "CRITICAL" if severity_counts["CRITICAL"] > 0 else \
              "HIGH"     if severity_counts["HIGH"] > 0 else \
              "MEDIUM"   if severity_counts["MEDIUM"] > 0 else \
              "LOW"      if severity_counts["LOW"] > 0 else \
              "CLEAR"

    color_map = {"CRITICAL": RED, "HIGH": _color("HIGH"), "MEDIUM": _color("MEDIUM"),
                 "LOW": _color("LOW"), "CLEAR": GREEN}
    overall_color = color_map.get(overall, GREEN)

    print(f"\n  {BOLD}OVERALL SECURITY STATUS:{RESET_COLOR} {overall_color}{BOLD}{overall}{RESET_COLOR}")
    print(f"\n{'═' * 68}\n")
