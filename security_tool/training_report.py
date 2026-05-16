"""
Training report generator — produces a self-contained HTML training document
from one or more attack simulations.

Designed to be printed, shared with teams, or used in instructor-led sessions.
"""

from __future__ import annotations

import html
from datetime import datetime


_DIFF_COLORS = {
    "BEGINNER":     "#52c41a",
    "INTERMEDIATE": "#ffc53d",
    "ADVANCED":     "#ff7a45",
    "EXPERT":       "#ff4d4f",
}

_IMPACT_COLORS = {
    "CRITICAL": "#ff4d4f",
    "HIGH":     "#ff7a45",
    "MEDIUM":   "#ffc53d",
    "LOW":      "#40a9ff",
    "NONE":     "#8b949e",
}


def _e(val: object) -> str:
    return html.escape(str(val or ""), quote=True)


def _impact_badge(level: str) -> str:
    color = _IMPACT_COLORS.get(level.upper(), "#888")
    return f'<span style="color:{color};font-weight:700">{_e(level)}</span>'


def _section(title: str, content: str, emoji: str = "") -> str:
    return f"""
<div class="section">
  <div class="section-title">{emoji + " " if emoji else ""}{_e(title)}</div>
  {content}
</div>"""


def _kill_chain_html(steps: list[dict]) -> str:
    items = []
    for i, step in enumerate(steps):
        phase = _e(step.get("phase", ""))
        action = _e(step.get("action", ""))
        detail = _e(step.get("detail", ""))
        technique = _e(step.get("mitre_technique", ""))
        items.append(f"""
<div class="kc-step">
  <div class="kc-num">{i + 1}</div>
  <div class="kc-body">
    <div class="kc-phase">{phase} {f'<span class="tag">{technique}</span>' if technique else ""}</div>
    <div class="kc-action">{action}</div>
    {f'<div class="kc-detail">{detail}</div>' if detail else ""}
  </div>
</div>""")
    return '<div class="kill-chain">' + "\n".join(items) + "</div>"


def _quiz_html(questions: list[dict]) -> str:
    items = []
    for q in questions:
        qid = q.get("id", "?")
        question = _e(q.get("question", ""))
        options = q.get("options", {})
        correct = q.get("correct", "")
        explanation = _e(q.get("explanation", ""))

        opts_html = ""
        for letter, text in options.items():
            cls = "opt opt-correct" if letter == correct else "opt"
            opts_html += f'<div class="{cls}"><strong>{_e(letter)}.</strong> {_e(text)}</div>'

        items.append(f"""
<div class="quiz-q">
  <div class="q-num">Question {_e(str(qid))}</div>
  <div class="q-text">{question}</div>
  <div class="q-options">{opts_html}</div>
  <details class="q-explain">
    <summary>Show explanation</summary>
    <div class="explain-body">{explanation}</div>
  </details>
</div>""")
    return '<div class="quiz">' + "\n".join(items) + "</div>"


def _simulation_html(sim: dict, index: int) -> str:
    attack_name = _e(sim.get("attack_name", "Attack Simulation"))
    owasp = _e(sim.get("owasp_category", ""))
    cwe = _e(sim.get("cwe", ""))
    mitre = _e(sim.get("mitre_technique", ""))
    mitre_tactic = _e(sim.get("mitre_tactic", ""))
    difficulty = sim.get("difficulty", "INTERMEDIATE")
    diff_color = _DIFF_COLORS.get(difficulty, "#888")
    cvss = sim.get("cvss_estimate", "N/A")
    narrative = _e(sim.get("narrative", ""))

    target = sim.get("target", {})
    target_file = _e(target.get("file", "unknown"))
    target_line = _e(str(target.get("line", "?")))
    target_fn = _e(target.get("function", ""))
    target_desc = _e(target.get("description", ""))

    attacker = sim.get("attacker_profile", {})
    impact = sim.get("impact_assessment", {})
    detection = sim.get("detection", {})
    defense = sim.get("defense", {})
    poc = sim.get("proof_of_concept", {})
    real_world = sim.get("real_world_parallels", [])
    assessment = sim.get("training_assessment", {})
    kill_chain = sim.get("kill_chain", [])

    # Detection section
    log_indicators = "".join(f"<li>{_e(l)}</li>" for l in detection.get("log_indicators", []))
    anomalies = "".join(f"<li>{_e(a)}</li>" for a in detection.get("anomaly_patterns", []))
    siem = _e(detection.get("siem_query", ""))

    # Defense section
    immediate = "".join(f"<li>{_e(i)}</li>" for i in defense.get("immediate", []))
    architectural = "".join(f"<li>{_e(a)}</li>" for a in defense.get("architectural", []))
    did = "".join(f"<li>{_e(d)}</li>" for d in defense.get("defense_in_depth", []))
    code_fix = _e(defense.get("code_fix", ""))

    # Real-world section
    rw_cards = ""
    for rw in real_world:
        rw_cards += f"""
<div class="rw-card">
  <div class="rw-title">{_e(rw.get("incident", ""))} ({_e(str(rw.get("year", "")))})</div>
  <div class="rw-body">
    <div><strong>Similarity:</strong> {_e(rw.get("attack_similarity", ""))}</div>
    <div><strong>Impact:</strong> {_e(rw.get("impact", ""))}</div>
    <div><strong>Lesson:</strong> {_e(rw.get("lesson", ""))}</div>
  </div>
</div>"""

    # Learning objectives
    obj_list = "".join(f"<li>{_e(o)}</li>" for o in assessment.get("learning_objectives", []))
    further = "".join(f"<li>{_e(r)}</li>" for r in assessment.get("further_reading", []))
    questions = assessment.get("questions", [])

    return f"""
<div class="sim-block" id="sim-{index}">
  <!-- Header -->
  <div class="sim-header">
    <div class="sim-num">Simulation {index}</div>
    <h2 class="sim-title">{attack_name}</h2>
    <div class="sim-meta">
      <span class="tag">{owasp}</span>
      <span class="tag">{cwe}</span>
      <span class="tag">{mitre} {mitre_tactic}</span>
      <span class="tag diff-tag" style="color:{diff_color};border-color:{diff_color}40">{difficulty}</span>
      <span class="tag">CVSS {cvss}</span>
    </div>
  </div>

  <!-- Target -->
  {_section("Target", f"""
<div class="target-box">
  <div><strong>File:</strong> <code>{target_file}:{target_line}</code></div>
  {"<div><strong>Function:</strong> <code>" + target_fn + "</code></div>" if target_fn else ""}
  <div class="mt-1">{target_desc}</div>
</div>""", "🎯")}

  <!-- Attacker Profile -->
  {_section("Attacker Profile", f"""
<div class="profile-grid">
  <div><span class="label">Skill Level</span><span>{_e(attacker.get("skill_level",""))}</span></div>
  <div><span class="label">Motivation</span><span>{_e(attacker.get("motivation",""))}</span></div>
  <div><span class="label">Access Required</span><span>{_e(attacker.get("access_required",""))}</span></div>
  <div><span class="label">Typical Tools</span><span>{_e(", ".join(attacker.get("typical_tools",[])))}</span></div>
</div>""", "🕵")}

  <!-- Impact -->
  {_section("Impact Assessment", f"""
<div class="impact-grid">
  <div class="impact-cell"><div class="impact-label">Confidentiality</div>{_impact_badge(impact.get("confidentiality","?"))}</div>
  <div class="impact-cell"><div class="impact-label">Integrity</div>{_impact_badge(impact.get("integrity","?"))}</div>
  <div class="impact-cell"><div class="impact-label">Availability</div>{_impact_badge(impact.get("availability","?"))}</div>
</div>
<div class="mt-2"><strong>Business Impact:</strong> {_e(impact.get("business_impact",""))}</div>
<div><strong>Blast Radius:</strong> {_e(impact.get("blast_radius",""))}</div>""", "💥")}

  <!-- Kill Chain -->
  {_section("Attack Kill Chain", _kill_chain_html(kill_chain), "⚔")}

  <!-- Proof of Concept -->
  {_section("Proof of Concept", f"""
<div class="poc-box">
  <div class="poc-disclaimer">⚠ {_e(poc.get("disclaimer","EDUCATIONAL ONLY"))}</div>
  <div class="poc-label">Payload</div>
  <pre class="poc-code">{_e(poc.get("payload",""))}</pre>
  {"<div class='poc-label'>Example Request</div><pre class='poc-code'>" + _e(poc.get("request_example","")) + "</pre>" if poc.get("request_example") else ""}
  <div class="poc-label">Expected Result</div>
  <div class="poc-result">{_e(poc.get("expected_result",""))}</div>
</div>""", "🔬")}

  <!-- Attack Narrative -->
  {_section("Attack Narrative", f'<div class="narrative">{narrative}</div>', "📖")}

  <!-- Detection -->
  {_section("Detection", f"""
<div class="detect-grid">
  <div>
    <div class="sub-title">Log Indicators</div>
    <ul>{log_indicators}</ul>
    <div class="sub-title mt-2">Anomaly Patterns</div>
    <ul>{anomalies}</ul>
  </div>
  <div>
    {"<div class='sub-title'>SIEM Query</div><pre class='siem'>" + siem + "</pre>" if siem else ""}
    <div class="sub-title mt-2">Detection Window</div>
    <div>{_e(detection.get("mean_time_to_detect",""))}</div>
  </div>
</div>""", "🔍")}

  <!-- Defense -->
  {_section("Defense Strategy", f"""
<div class="defense-grid">
  <div>
    <div class="sub-title">Immediate Mitigations</div>
    <ul>{immediate}</ul>
  </div>
  <div>
    <div class="sub-title">Architectural Improvements</div>
    <ul>{architectural}</ul>
  </div>
</div>
{"<div class='sub-title mt-2'>Code Fix</div><div class='code-fix'>" + code_fix + "</div>" if code_fix else ""}
{"<div class='sub-title mt-2'>Defense in Depth</div><ul>" + did + "</ul>" if did else ""}
{"<div class='sub-title mt-2'>Verification</div><div>" + _e(defense.get("verification","")) + "</div>" if defense.get("verification") else ""}""", "🛡")}

  <!-- Real-World Parallels -->
  {f'<div class="section"><div class="section-title">🌐 Real-World Incidents</div><div class="rw-grid">{rw_cards}</div></div>' if rw_cards else ""}

  <!-- Training Assessment -->
  <div class="section">
    <div class="section-title">📝 Training Assessment</div>
    {"<div class='sub-title'>Learning Objectives</div><ul>" + obj_list + "</ul>" if obj_list else ""}
    {_quiz_html(questions) if questions else ""}
    {"<div class='sub-title mt-3'>Further Reading</div><ul>" + further + "</ul>" if further else ""}
  </div>
</div>"""


def generate_training_report(simulations: list[dict], target: str = "") -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sims_html = "\n".join(_simulation_html(s, i + 1) for i, s in enumerate(simulations))
    attack_names = ", ".join(s.get("attack_name", "?") for s in simulations)

    toc = "".join(
        f'<li><a href="#sim-{i+1}">{_e(s.get("attack_name", f"Simulation {i+1}"))}</a></li>'
        for i, s in enumerate(simulations)
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BASS Security Training Report</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',system-ui,sans-serif;background:#0d1117;color:#e6edf3;line-height:1.7;font-size:15px}}
a{{color:#58a6ff}}
.container{{max-width:960px;margin:0 auto;padding:32px 20px}}
.header{{background:linear-gradient(135deg,#161b22,#21262d);border:1px solid #30363d;border-radius:16px;padding:32px;margin-bottom:32px;text-align:center}}
.logo{{font-size:36px;font-weight:900;background:linear-gradient(135deg,#ff4d4f,#ff7a45,#ffc53d);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}}
.report-subtitle{{color:#8b949e;margin-bottom:16px}}
.header-meta{{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;color:#8b949e;font-size:13px;border-top:1px solid #30363d;padding-top:16px;margin-top:16px}}
.header-meta strong{{color:#e6edf3}}
.disclaimer{{background:rgba(255,197,61,0.1);border:1px solid rgba(255,197,61,0.3);border-radius:10px;padding:16px 20px;margin-bottom:32px;font-size:13px;color:#ffc53d}}
.toc{{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:32px}}
.toc h3{{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:12px}}
.toc ol{{padding-left:20px;display:flex;flex-direction:column;gap:6px}}
.toc li a{{color:#58a6ff;text-decoration:none;font-weight:600}}
.sim-block{{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:32px;margin-bottom:32px}}
.sim-header{{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #30363d}}
.sim-num{{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8b949e;margin-bottom:6px}}
.sim-title{{font-size:24px;font-weight:800;margin-bottom:12px}}
.sim-meta{{display:flex;flex-wrap:wrap;gap:8px}}
.tag{{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid #30363d;color:#8b949e;background:#21262d}}
.diff-tag{{background:transparent}}
.section{{margin-bottom:28px}}
.section-title{{font-size:16px;font-weight:700;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:8px}}
.sub-title{{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:8px}}
.mt-1{{margin-top:8px}}.mt-2{{margin-top:16px}}.mt-3{{margin-top:24px}}
.target-box,.poc-box,.code-fix{{background:#21262d;border:1px solid #30363d;border-radius:8px;padding:16px;font-size:14px}}
.target-box code{{font-family:monospace;color:#79c0ff;background:#0d1117;padding:2px 6px;border-radius:4px}}
.profile-grid,.impact-grid,.detect-grid,.defense-grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:14px}}
.profile-grid .label{{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:4px}}
.impact-cell{{background:#21262d;border:1px solid #30363d;border-radius:8px;padding:16px;text-align:center}}
.impact-label{{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:6px}}
.kill-chain{{display:flex;flex-direction:column;gap:10px}}
.kc-step{{display:flex;gap:16px;align-items:flex-start}}
.kc-num{{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff4d4f,#ff7a45);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}}
.kc-body{{flex:1}}
.kc-phase{{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:4px}}
.kc-action{{font-weight:600;margin-bottom:4px}}
.kc-detail{{font-size:13px;color:#8b949e}}
.poc-disclaimer{{background:rgba(255,197,61,0.1);border:1px solid rgba(255,197,61,0.3);border-radius:6px;padding:10px 14px;color:#ffc53d;font-size:13px;font-weight:600;margin-bottom:12px}}
.poc-label{{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:6px;margin-top:12px}}
.poc-code{{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;white-space:pre-wrap;color:#79c0ff}}
.poc-result{{font-size:14px;color:#ff7a45;font-style:italic}}
.narrative{{font-size:14px;color:#c9d1d9;line-height:1.8;white-space:pre-wrap;background:#21262d;border-left:3px solid #30363d;padding:16px 20px;border-radius:0 8px 8px 0}}
.siem{{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;font-family:monospace;font-size:12px;overflow-x:auto;white-space:pre-wrap;color:#36cfc9}}
.code-fix{{font-size:13px;color:#7ee787;font-style:italic}}
ul{{padding-left:20px;font-size:14px;color:#c9d1d9}}li{{margin-bottom:4px}}
.rw-grid{{display:flex;flex-direction:column;gap:12px}}
.rw-card{{background:#21262d;border:1px solid #30363d;border-radius:8px;padding:16px}}
.rw-title{{font-weight:700;color:#ffc53d;margin-bottom:8px}}
.rw-body{{font-size:13px;color:#c9d1d9;display:flex;flex-direction:column;gap:4px}}
.quiz{{display:flex;flex-direction:column;gap:20px;margin-top:12px}}
.quiz-q{{background:#21262d;border:1px solid #30363d;border-radius:10px;padding:20px}}
.q-num{{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8b949e;margin-bottom:8px}}
.q-text{{font-weight:600;margin-bottom:14px}}
.q-options{{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}}
.opt{{padding:10px 14px;border-radius:8px;border:1px solid #30363d;background:#161b22;font-size:14px;cursor:default}}
.opt-correct{{border-color:#52c41a40;background:rgba(82,196,26,0.1);color:#7ee787}}
.q-explain{{margin-top:8px}}
.q-explain summary{{cursor:pointer;color:#58a6ff;font-size:13px;font-weight:600;user-select:none}}
.explain-body{{margin-top:10px;font-size:13px;color:#c9d1d9;padding:12px;background:#161b22;border-radius:6px;border:1px solid #30363d}}
.footer{{text-align:center;color:#8b949e;font-size:12px;margin-top:32px;padding-top:16px;border-top:1px solid #30363d}}
@media print{{body{{background:#fff;color:#000}}.sim-block{{border:1px solid #ccc;break-inside:avoid}}.poc-code,.siem{{background:#f5f5f5;color:#333}}.header{{background:#f8f8f8}}}}
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <div class="logo">⚔ BASS</div>
    <div style="font-size:20px;font-weight:800;margin-bottom:4px">Security Training Report</div>
    <div class="report-subtitle">Attack Simulation &amp; Professional Development</div>
    <div class="header-meta">
      <span><strong>Target:</strong> {_e(target or "Codebase")}</span>
      <span><strong>Generated:</strong> {_e(now)}</span>
      <span><strong>Simulations:</strong> {len(simulations)}</span>
      <span><strong>Attacks:</strong> {_e(attack_names[:80])}</span>
    </div>
  </div>

  <div class="disclaimer">
    ⚠ <strong>AUTHORIZED USE ONLY</strong> — This document contains security training material including proof-of-concept attack techniques.
    Distribution is restricted to authorized security personnel. Do not use techniques described herein against systems without explicit written authorization.
  </div>

  {"<div class='toc'><h3>Table of Contents</h3><ol>" + toc + "</ol></div>" if len(simulations) > 1 else ""}

  {sims_html}

  <div class="footer">
    <strong>BASS — Base Alert Security System</strong> &nbsp;·&nbsp; AI-Powered Security Training Platform<br>
    This report was generated for authorized security training purposes only.
  </div>

</div>
</body>
</html>"""
