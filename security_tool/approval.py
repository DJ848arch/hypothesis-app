"""
Human-in-the-loop approval gate.

Every proposed fix must pass through this gate before being applied.
No exceptions — even in auto-remediate mode, a human sees and approves
each diff before any code changes.
"""

from __future__ import annotations

import sys

from config import (
    SEVERITY_LEVELS, RESET_COLOR, BOLD, GREEN, RED, YELLOW, CYAN, MAGENTA,
)


def _color(severity: str) -> str:
    return SEVERITY_LEVELS.get(severity.upper(), {}).get("color", "")


def _render_diff(diff: str) -> str:
    lines = []
    for line in diff.splitlines():
        if line.startswith("+++") or line.startswith("---"):
            lines.append(f"{BOLD}{line}{RESET_COLOR}")
        elif line.startswith("@@"):
            lines.append(f"{CYAN}{line}{RESET_COLOR}")
        elif line.startswith("+"):
            lines.append(f"{GREEN}{line}{RESET_COLOR}")
        elif line.startswith("-"):
            lines.append(f"{RED}{line}{RESET_COLOR}")
        else:
            lines.append(line)
    return "\n".join(lines)


def request_approval(proposal: dict) -> str:
    """
    Show the proposed fix to the human and ask for approval.

    Returns:
        'approve'  — apply this fix
        'reject'   — skip this fix
        'abort'    — stop all auto-remediation for this session
    """
    finding = proposal.get("finding", {})
    diff = proposal.get("diff", "")
    explanation = proposal.get("explanation", "")
    severity = finding.get("severity", "INFO").upper()
    color = _color(severity)

    print(f"\n{'═' * 68}")
    print(f"  {BOLD}{MAGENTA}RESPONDER AI — Proposed Fix{RESET_COLOR}  {color}[{severity}]{RESET_COLOR}")
    print(f"{'─' * 68}")
    print(f"  {BOLD}Finding:{RESET_COLOR}  {finding.get('title')}")
    print(f"  {BOLD}File:{RESET_COLOR}     {finding.get('file')}:{finding.get('line', '?')}")
    if finding.get("cwe"):
        print(f"  {BOLD}CWE:{RESET_COLOR}      {finding.get('cwe')}")
    print(f"\n  {BOLD}Proposed Diff:{RESET_COLOR}")
    print(f"{'─' * 68}")
    print(_render_diff(diff))
    print(f"{'─' * 68}")

    if explanation:
        print(f"\n  {BOLD}Explanation:{RESET_COLOR}")
        for line in explanation.splitlines():
            print(f"    {line}")

    print(f"\n  {GREEN}[A]{RESET_COLOR} Approve & apply fix")
    print(f"  {RED}[R]{RESET_COLOR} Reject — skip this fix")
    print(f"  {YELLOW}[S]{RESET_COLOR} Stop — skip all remaining auto-remediation")
    print(f"\n{'═' * 68}")

    while True:
        try:
            choice = input("  Your decision [A/R/S]: ").strip().upper()
        except (EOFError, KeyboardInterrupt):
            print()
            return "abort"

        if choice == "A":
            print(f"  {GREEN}✔ Approved. Applying fix...{RESET_COLOR}\n")
            return "approve"
        if choice == "R":
            print(f"  {RED}✖ Rejected. Skipping this fix.{RESET_COLOR}\n")
            return "reject"
        if choice == "S":
            print(f"  {YELLOW}⚠ Stopping auto-remediation for this session.{RESET_COLOR}\n")
            return "abort"

        print("  Please enter A, R, or S.")


def show_remediation_result(result: dict) -> None:
    status = result.get("status")
    branch = result.get("branch", "")
    message = result.get("message", "")
    test_output = result.get("test_output", "")
    merge_cmd = result.get("merge_command", "")

    print(f"\n{'─' * 68}")
    if status == "success":
        print(f"  {GREEN}{BOLD}✔ Fix applied successfully{RESET_COLOR}")
        print(f"  Branch: {BOLD}{branch}{RESET_COLOR}")
        if merge_cmd:
            print(f"  To merge: {CYAN}{merge_cmd}{RESET_COLOR}")
    elif status == "test_failure":
        print(f"  {RED}{BOLD}✖ Fix reverted — tests failed{RESET_COLOR}")
        print(f"  Branch {branch} has been deleted.")
        if test_output:
            print(f"\n  {BOLD}Test output:{RESET_COLOR}")
            for line in test_output.splitlines()[:20]:
                print(f"    {line}")
    elif status == "git_error":
        print(f"  {RED}✖ Could not apply diff: {message}{RESET_COLOR}")
    elif status == "no_git":
        print(f"  {YELLOW}⚠ Not a git repo: {message}{RESET_COLOR}")

    print(f"{'─' * 68}\n")
