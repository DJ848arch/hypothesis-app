"""
Taint Analyzer — tracks data flow from user-controlled sources to dangerous sinks.

Approach:
  1. Regex-scan each file for source patterns (HTTP input, env vars, user input)
  2. Regex-scan each file for sink patterns (SQL, shell, eval, file write, template)
  3. Build a lightweight function-level call graph across all files
  4. Find source→sink paths (direct in-file paths + cross-file via imports)
  5. Use Claude to verify which paths are actually exploitable (no sanitization)

Each verified path becomes a high-confidence TaintFinding with a concrete
data-flow description, making it far easier for developers to trace and fix.
"""

from __future__ import annotations

import os
import re
import json
from pathlib import Path
from typing import Any

import anthropic

from config import CODE_EXTENSIONS, EXCLUDED_DIRS, CYAN, MAGENTA, YELLOW, RESET_COLOR, BOLD


# ──────────────────────────────────────────────────────────────
# Source / sink pattern definitions
# ──────────────────────────────────────────────────────────────

# Each entry: (pattern, label, language_hint or None)
SOURCE_PATTERNS: list[tuple[re.Pattern, str, str | None]] = [
    # HTTP inputs
    (re.compile(r'request\.(args|form|json|data|get_json|values|files)\b'), "HTTP request input", "python"),
    (re.compile(r'request\.(query|body|params|headers)\b'), "HTTP request input", "js"),
    (re.compile(r'\bparams\['), "Route params", "js"),
    (re.compile(r'\bflask\.request\b'), "Flask request", "python"),
    (re.compile(r'\bdjango\.http\b'), "Django HTTP", "python"),
    (re.compile(r'\bBottle\.request\b'), "Bottle request", "python"),
    # Environment / config
    (re.compile(r'os\.environ(?:\.get)?\('), "Environment variable", "python"),
    (re.compile(r'process\.env\b'), "Environment variable", "js"),
    (re.compile(r'getenv\('), "Environment variable", None),
    # CLI / user input
    (re.compile(r'\bsys\.argv\b'), "Command-line argument", "python"),
    (re.compile(r'\binput\s*\('), "User input()", "python"),
    (re.compile(r'readline\(\)'), "Stdin readline", "python"),
    # Database / file (secondary sources)
    (re.compile(r'\.fetchone\(\)|\.fetchall\(\)|\.fetch\('), "DB query result", None),
    (re.compile(r'open\([^)]+,\s*["\']r'), "File read", "python"),
    (re.compile(r'fs\.readFile'), "File read", "js"),
    (re.compile(r'Cookie|session\[|cookie\.get'), "Cookie / session", None),
]

SINK_PATTERNS: list[tuple[re.Pattern, str, str, str]] = [
    # (pattern, label, sink_type, cwe)
    (re.compile(r'cursor\.execute\s*\(|\.execute\s*\([^)]*%|\.raw\s*\(|session\.execute\s*\('), "SQL execution", "sqli", "CWE-89"),
    (re.compile(r'db\.query\s*\(|Model\.objects\.raw\s*\(|\.filter\s*\(.*%.*\)'), "SQL ORM raw", "sqli", "CWE-89"),
    (re.compile(r'os\.system\s*\(|subprocess\.(run|call|Popen|check_output)\s*\('), "Shell execution", "cmdi", "CWE-78"),
    (re.compile(r'\bexec\s*\(|\beval\s*\('), "eval/exec", "cmdi", "CWE-78"),
    (re.compile(r'render_template_string\s*\(|jinja2\.Template\s*\(|Markup\s*\('), "Template injection", "ssti", "CWE-94"),
    (re.compile(r'\.innerHTML\s*=|document\.write\s*\(|\.html\s*\('), "HTML injection", "xss", "CWE-79"),
    (re.compile(r'open\([^)]+,\s*["\']w|Path\([^)]+\)\.write_text|\.write\s*\('), "File write", "path_traversal", "CWE-22"),
    (re.compile(r'urllib\.request\.(urlopen|urlretrieve)\s*\(|requests\.(get|post|put)\s*\(|fetch\s*\('), "Outbound HTTP", "ssrf", "CWE-918"),
    (re.compile(r'pickle\.loads\s*\(|pickle\.load\s*\('), "Pickle deserialization", "deserialization", "CWE-502"),
    (re.compile(r'yaml\.load\s*\([^)]*Loader'), "Unsafe YAML load", "deserialization", "CWE-502"),
    (re.compile(r'ldap.*search|ldap.*bind'), "LDAP operation", "injection", "CWE-90"),
    (re.compile(r'smtplib|sendmail\s*\(|send_message\s*\('), "Email sending", "injection", "CWE-93"),
]


# ──────────────────────────────────────────────────────────────
# Language detection
# ──────────────────────────────────────────────────────────────

def _detect_language(path: Path) -> str:
    return {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".jsx": "javascript", ".tsx": "typescript",
        ".rb": "ruby", ".go": "go", ".java": "java", ".php": "php",
    }.get(path.suffix, "unknown")


# ──────────────────────────────────────────────────────────────
# Per-file source/sink detection
# ──────────────────────────────────────────────────────────────

def _find_in_file(content: str, patterns: list, path: Path) -> list[dict]:
    hits = []
    lines = content.splitlines()
    lang = _detect_language(path)
    for pat_tuple in patterns:
        pattern = pat_tuple[0]
        meta = pat_tuple[1:]
        for lineno, line in enumerate(lines, 1):
            if pattern.search(line):
                hits.append({"line": lineno, "code": line.strip(), "meta": meta, "lang": lang})
    return hits


def find_sources(content: str, path: Path) -> list[dict]:
    return _find_in_file(content, SOURCE_PATTERNS, path)


def find_sinks(content: str, path: Path) -> list[dict]:
    return _find_in_file(content, SINK_PATTERNS, path)


# ──────────────────────────────────────────────────────────────
# Simple function-level call graph
# ──────────────────────────────────────────────────────────────

_FUNC_DEF_RE = re.compile(r'^\s*(?:def|function|func|fn|sub)\s+(\w+)\s*\(', re.MULTILINE)
_FUNC_CALL_RE = re.compile(r'\b(\w+)\s*\(')
_IMPORT_RE = re.compile(r'(?:from\s+([\w.]+)\s+import|import\s+([\w.]+)|require\(["\']([^"\']+)["\'])')


def _extract_functions(content: str) -> dict[str, dict]:
    """Map function name → {start_line, body_lines}."""
    funcs: dict[str, dict] = {}
    lines = content.splitlines()
    current: str | None = None
    start = 0
    for i, line in enumerate(lines):
        m = _FUNC_DEF_RE.match(line)
        if m:
            current = m.group(1)
            start = i + 1
            funcs[current] = {"start": start, "lines": []}
        if current:
            funcs[current].setdefault("lines", []).append(line)
    return funcs


def _extract_local_imports(content: str, file_path: Path, target_dir: Path) -> list[Path]:
    """Return list of local file paths imported by this file."""
    imports = []
    for m in _IMPORT_RE.finditer(content):
        module = (m.group(1) or m.group(2) or m.group(3) or "").replace(".", "/")
        if not module:
            continue
        # Try to resolve as a local module
        for ext in [".py", ".js", ".ts", ".jsx", ".tsx"]:
            candidate = (file_path.parent / (module.split("/")[-1] + ext))
            if candidate.exists() and candidate.resolve().is_relative_to(target_dir):
                imports.append(candidate)
            candidate2 = target_dir / (module + ext)
            if candidate2.exists():
                imports.append(candidate2)
    return list(set(imports))


# ──────────────────────────────────────────────────────────────
# Taint path detection (intra + inter-file)
# ──────────────────────────────────────────────────────────────

def find_taint_paths(
    file_path: Path,
    content: str,
    target_dir: Path,
    all_file_contents: dict[Path, str],
) -> list[dict]:
    """
    Return candidate taint paths for a file.
    A path is: {source, sink, type, cross_file, imported_files}
    """
    sources = find_sources(content, file_path)
    sinks = find_sinks(content, file_path)

    paths: list[dict] = []

    # Direct in-file paths (same file has both source and sink)
    if sources and sinks:
        for src in sources:
            for snk in sinks:
                paths.append({
                    "type": "direct",
                    "source_line": src["line"],
                    "source_code": src["code"],
                    "source_label": src["meta"][0],
                    "sink_line": snk["line"],
                    "sink_code": snk["code"],
                    "sink_label": snk["meta"][0],
                    "sink_type": snk["meta"][1],
                    "cwe": snk["meta"][2],
                    "cross_file": False,
                    "imported_files": [],
                })

    # Cross-file paths (source in this file, sink in an import)
    if sources:
        imported = _extract_local_imports(content, file_path, target_dir)
        for imp in imported:
            imp_content = all_file_contents.get(imp, "")
            if not imp_content:
                try:
                    imp_content = imp.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
            imp_sinks = find_sinks(imp_content, imp)
            for src in sources:
                for snk in imp_sinks:
                    paths.append({
                        "type": "cross_file",
                        "source_line": src["line"],
                        "source_code": src["code"],
                        "source_label": src["meta"][0],
                        "sink_line": snk["line"],
                        "sink_code": snk["code"],
                        "sink_label": snk["meta"][0],
                        "sink_type": snk["meta"][1],
                        "cwe": snk["meta"][2],
                        "cross_file": True,
                        "imported_files": [str(imp.relative_to(target_dir))],
                    })

    return paths


# ──────────────────────────────────────────────────────────────
# Claude verification
# ──────────────────────────────────────────────────────────────

_VERIFY_SYSTEM = """You are TAINT AI — a security expert specializing in data flow analysis.

Given source code and a list of CANDIDATE TAINT PATHS (potential flows from user-controlled input to dangerous sinks), determine:

1. Is this path actually exploitable? (User input reaches the sink WITHOUT being sanitized or validated)
2. What is the confidence? (0-100)
3. What is the exact attack scenario?

Respond ONLY with a JSON array. Each element must be:
{
  "path_index": <int>,
  "exploitable": <true|false>,
  "confidence": <0-100>,
  "reason": "<why exploitable or why not>",
  "sanitization_present": <true|false>,
  "sanitization_description": "<what sanitization exists, if any>",
  "attack_scenario": "<concrete one-liner: what an attacker would do>"
}

Be conservative: if you see ANY input validation, escaping, parameterization, or sanitization between the source and sink — mark exploitable=false, even if bypasses might exist.
Only mark exploitable=true when there is a clear, direct path with NO sanitization."""


def verify_taint_paths(
    file_path: Path,
    content: str,
    paths: list[dict],
    client: anthropic.Anthropic,
) -> list[dict]:
    """Ask Claude to verify which taint paths are actually exploitable."""
    if not paths:
        return []

    # Cap to avoid token explosion
    paths_to_verify = paths[:8]

    path_summaries = "\n".join(
        f"PATH {i}: Source line {p['source_line']} [{p['source_label']}]: `{p['source_code'][:120]}`\n"
        f"  → Sink line {p['sink_line']} [{p['sink_label']}]: `{p['sink_code'][:120]}`\n"
        f"  Cross-file via: {p['imported_files'] or 'N/A'}"
        for i, p in enumerate(paths_to_verify)
    )

    user_msg = (
        f"FILE: {file_path}\n\n"
        f"SOURCE CODE:\n```\n{content[:5000]}\n```\n\n"
        f"CANDIDATE TAINT PATHS:\n{path_summaries}\n\n"
        "Verify each path. Respond with the JSON array only."
    )

    try:
        msg = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=2048,
            thinking={"type": "adaptive"},
            system=[{"type": "text", "text": _VERIFY_SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_msg}],
        )
        text = next((b.text for b in msg.content if hasattr(b, "text")), "")
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            verifications = json.loads(match.group())
            results = []
            for v in verifications:
                idx = v.get("path_index", 0)
                if 0 <= idx < len(paths_to_verify) and v.get("exploitable"):
                    path = dict(paths_to_verify[idx])
                    path["confidence"] = v.get("confidence", 70)
                    path["verified"] = True
                    path["attack_scenario"] = v.get("attack_scenario", "")
                    path["sanitization_present"] = v.get("sanitization_present", False)
                    path["reason"] = v.get("reason", "")
                    results.append(path)
            return results
    except Exception:
        pass
    return []


# ──────────────────────────────────────────────────────────────
# Convert taint paths → findings
# ──────────────────────────────────────────────────────────────

def taint_path_to_finding(path: dict, file_path: Path, target_dir: Path) -> dict:
    rel = str(file_path.relative_to(target_dir)) if file_path.is_relative_to(target_dir) else str(file_path)
    sink_type = path.get("sink_type", "injection")
    cwe = path.get("cwe", "CWE-20")
    confidence = path.get("confidence", 70)

    sev_map = {
        "sqli": "CRITICAL", "cmdi": "CRITICAL", "ssti": "HIGH",
        "xss": "HIGH", "path_traversal": "HIGH", "ssrf": "HIGH",
        "deserialization": "HIGH", "injection": "MEDIUM",
    }
    severity = sev_map.get(sink_type, "HIGH")

    cross = " (cross-file)" if path.get("cross_file") else ""
    imported = " via " + ", ".join(path.get("imported_files", [])) if path.get("imported_files") else ""

    return {
        "file": rel,
        "line": path["source_line"],
        "severity": severity,
        "cwe": cwe,
        "title": f"Taint: {path['source_label']} → {path['sink_label']}{cross}",
        "description": (
            f"User-controlled input ({path['source_label']}) at line {path['source_line']} "
            f"flows to dangerous sink ({path['sink_label']}) at line {path['sink_line']}{imported} "
            f"without sanitization. {path.get('attack_scenario', '')} "
            f"[Confidence: {confidence}%]"
        ),
        "recommendation": (
            f"Validate and sanitize all input before passing to {path['sink_label']}. "
            f"Use parameterized queries for SQL, shlex.quote for shell, "
            f"auto-escaping templates for HTML output."
        ),
        "confidence": confidence,
        "_source": "TAINT",
        "_taint_path": path,
    }


# ──────────────────────────────────────────────────────────────
# Main entry point
# ──────────────────────────────────────────────────────────────

def run_taint_analysis(
    target_dir: Path,
    client: anthropic.Anthropic,
    max_files: int = 50,
    progress_cb=None,
) -> list[dict]:
    """
    Run full taint analysis across the target directory.
    Returns list of verified taint findings.
    """
    # Collect code files
    code_files: list[Path] = []
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        for fname in files:
            p = Path(root) / fname
            if p.suffix in CODE_EXTENSIONS:
                code_files.append(p)
        if len(code_files) >= max_files * 2:
            break

    # Pre-load file contents
    all_contents: dict[Path, str] = {}
    for p in code_files[:max_files * 2]:
        try:
            all_contents[p] = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass

    if progress_cb:
        progress_cb("taint_start", f"[TAINT] Scanning {len(all_contents)} files for taint paths…")

    # Find files with both sources and sinks (or source + importing a sink file)
    priority_files: list[Path] = []
    for fp, content in all_contents.items():
        srcs = find_sources(content, fp)
        snks = find_sinks(content, fp)
        if srcs and snks:
            priority_files.append(fp)
        elif srcs:
            imports = _extract_local_imports(content, fp, target_dir)
            if any(find_sinks(all_contents.get(i, ""), i) for i in imports):
                priority_files.append(fp)

    all_findings: list[dict] = []

    print(f"  {CYAN}[TAINT]{RESET_COLOR} {len(priority_files)} file(s) have potential taint paths")

    for fp in priority_files[:max_files]:
        content = all_contents.get(fp, "")
        paths = find_taint_paths(fp, content, target_dir, all_contents)
        if not paths:
            continue

        rel = str(fp.relative_to(target_dir)) if fp.is_relative_to(target_dir) else str(fp)
        print(f"  {MAGENTA}[TAINT]{RESET_COLOR} Verifying {len(paths)} path(s) in {rel}…")

        verified = verify_taint_paths(fp, content, paths, client)
        for vp in verified:
            all_findings.append(taint_path_to_finding(vp, fp, target_dir))
            if progress_cb:
                progress_cb("taint_finding", f"[TAINT] {vp.get('sink_type','?')} taint in {rel}")

    print(f"  {CYAN}[TAINT]{RESET_COLOR} {len(all_findings)} verified taint finding(s)")
    return all_findings
