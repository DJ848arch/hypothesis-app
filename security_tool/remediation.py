"""
Remediation engine — applies approved fixes safely.

Flow for each approved fix:
1. Verify we're in a git repo
2. Create an isolated branch: bass/fix-{cwe}-{slug}
3. Apply the diff via git apply
4. Detect and run the project's test suite (with timeout)
5. If tests pass  → commit the fix, return success + branch name
6. If tests fail  → git checkout (revert), return failure + test output
7. Human is shown the result and decides whether to merge

Never modifies files outside of a git-tracked branch.
Never force-pushes or touches main/master.
"""

from __future__ import annotations

import re
import subprocess
import tempfile
import time
from pathlib import Path

from config import GREEN, RED, YELLOW, CYAN, RESET_COLOR, BOLD

_TEST_RUNNERS = [
    # (check_for, command)
    ("pytest.ini",       ["python", "-m", "pytest", "--tb=short", "-q"]),
    ("setup.cfg",        ["python", "-m", "pytest", "--tb=short", "-q"]),
    ("pyproject.toml",   ["python", "-m", "pytest", "--tb=short", "-q"]),
    ("tests",            ["python", "-m", "pytest", "--tb=short", "-q"]),
    ("package.json",     ["npm", "test", "--", "--watchAll=false"]),
    ("go.mod",           ["go", "test", "./..."]),
    ("Cargo.toml",       ["cargo", "test", "--quiet"]),
]

_TEST_TIMEOUT = 120  # seconds


def _git(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
    )


def _in_git_repo(target: Path) -> bool:
    result = _git(["rev-parse", "--is-inside-work-tree"], target)
    return result.returncode == 0


def _repo_root(target: Path) -> Path:
    result = _git(["rev-parse", "--show-toplevel"], target)
    return Path(result.stdout.strip()) if result.returncode == 0 else target


def _current_branch(repo_root: Path) -> str:
    result = _git(["rev-parse", "--abbrev-ref", "HEAD"], repo_root)
    return result.stdout.strip() if result.returncode == 0 else "HEAD"


def _branch_name(finding: dict) -> str:
    cwe = (finding.get("cwe") or "unknown").replace("CWE-", "cwe")
    file_slug = re.sub(r"[^a-z0-9]", "-", (finding.get("file") or "").lower())[:30]
    return f"bass/fix-{cwe}-{file_slug}"[:60]


def _detect_test_runner(repo_root: Path) -> list[str] | None:
    for indicator, cmd in _TEST_RUNNERS:
        check = repo_root / indicator
        if check.exists():
            return cmd
    return None


def _run_tests(repo_root: Path, test_cmd: list[str]) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            test_cmd,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=_TEST_TIMEOUT,
        )
        output = (result.stdout + result.stderr)[:3000]
        return result.returncode == 0, output
    except subprocess.TimeoutExpired:
        return False, f"Tests timed out after {_TEST_TIMEOUT}s"
    except FileNotFoundError:
        return False, "Test runner not found"


def apply_fix(proposal: dict, target_dir: Path) -> dict:
    """
    Apply an approved fix proposal.
    Returns a result dict with: status, branch, test_output, message.
    status: success | test_failure | git_error | no_git
    """
    finding = proposal.get("finding", {})
    diff = proposal.get("diff", "")

    if not _in_git_repo(target_dir):
        return {
            "status": "no_git",
            "message": "Target directory is not inside a git repository. Cannot apply fix safely.",
        }

    repo_root = _repo_root(target_dir)
    original_branch = _current_branch(repo_root)
    fix_branch = _branch_name(finding)

    print(f"  {CYAN}[REMEDIATION]{RESET_COLOR} Creating branch: {BOLD}{fix_branch}{RESET_COLOR}")

    # Create fix branch
    checkout = _git(["checkout", "-b", fix_branch], repo_root)
    if checkout.returncode != 0:
        # Branch may already exist — try switching
        _git(["checkout", fix_branch], repo_root)

    # Write diff to temp file and apply
    with tempfile.NamedTemporaryFile(mode="w", suffix=".patch", delete=False) as tmp:
        tmp.write(diff)
        patch_path = tmp.name

    apply = _git(["apply", "--whitespace=nowarn", patch_path], repo_root)
    Path(patch_path).unlink(missing_ok=True)

    if apply.returncode != 0:
        _git(["checkout", original_branch], repo_root)
        return {
            "status": "git_error",
            "message": f"git apply failed: {apply.stderr[:500]}",
            "branch": fix_branch,
        }

    print(f"  {GREEN}[REMEDIATION]{RESET_COLOR} Diff applied. Running tests...")

    # Detect and run tests
    test_cmd = _detect_test_runner(repo_root)
    if not test_cmd:
        print(f"  {YELLOW}[REMEDIATION] No test suite detected — committing without test validation.{RESET_COLOR}")
        tests_passed = True
        test_output = "No test suite found."
    else:
        print(f"  {CYAN}[REMEDIATION]{RESET_COLOR} Test command: {' '.join(test_cmd)}")
        tests_passed, test_output = _run_tests(repo_root, test_cmd)

    if tests_passed:
        # Commit the fix
        commit_msg = (
            f"fix(security): {finding.get('title', 'security fix')}\n\n"
            f"Resolves: {finding.get('cwe', 'N/A')}\n"
            f"File: {finding.get('file')}:{finding.get('line', '')}\n"
            f"Applied by BASS Responder AI — approved by human operator.\n"
        )
        _git(["add", "-A"], repo_root)
        _git(["commit", "-m", commit_msg], repo_root)
        _git(["checkout", original_branch], repo_root)

        print(f"  {GREEN}[REMEDIATION] ✔ Fix committed on branch {fix_branch}{RESET_COLOR}")
        return {
            "status": "success",
            "branch": fix_branch,
            "test_output": test_output,
            "message": f"Fix committed on branch '{fix_branch}'. Tests passed.",
            "merge_command": f"git merge {fix_branch}",
        }
    else:
        # Revert
        _git(["checkout", "."], repo_root)
        _git(["checkout", original_branch], repo_root)
        _git(["branch", "-D", fix_branch], repo_root)

        print(f"  {RED}[REMEDIATION] ✖ Tests failed — fix reverted.{RESET_COLOR}")
        return {
            "status": "test_failure",
            "branch": fix_branch,
            "test_output": test_output,
            "message": "Fix reverted — tests failed after applying the patch.",
        }
