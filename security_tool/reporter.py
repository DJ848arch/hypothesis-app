"""
HTML report generator — produces a self-contained, professional security report.
No external dependencies; all CSS and JS are inlined.
"""

from __future__ import annotations

import html
import json
from datetime import datetime


_SEVERITY_COLOR = {
    "CRITICAL": "#ff4d4f",
    "HIGH":     "#ff7a45",
    "MEDIUM":   "#ffc53d",
    "LOW":      "#40a9ff",
    "INFO":     "#36cfc9",
    "CLEAR":    "#52c41a",
}

_SEVERITY_BG = {
    "CRITICAL": "rgba(255,77,79,0.15)",
    "HIGH":     "rgba(255,122,69,0.15)",
    "MEDIUM":   "rgba(255,197,61,0.15)",
    "LOW":      "rgba(64,169,255,0.15)",
    "INFO":     "rgba(54,207,201,0.15)",
}


def _esc(text: object) -> str:
    return html.escape(str(text or ""), quote=True)


def _severity_badge(severity: str) -> str:
    color = _SEVERITY_COLOR.get(severity.upper(), "#888")
    bg = _SEVERITY_BG.get(severity.upper(), "rgba(136,136,136,0.15)")
    return (
        f'<span class="badge" style="color:{color};background:{bg};'
        f'border:1px solid {color}40">{_esc(severity.upper())}</span>'
    )


def _donut_chart_svg(counts: dict[str, int], total: int) -> str:
    if total == 0:
        return '<div class="no-findings-chart">No findings</div>'

    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    cx, cy, r, stroke_w = 80, 80, 60, 22
    circumference = 3.14159 * 2 * r

    segments = []
    offset = 0.0
    for sev in order:
        count = counts.get(sev, 0)
        if count == 0:
            continue
        fraction = count / total
        dash = fraction * circumference
        gap = circumference - dash
        color = _SEVERITY_COLOR.get(sev, "#888")
        segments.append(
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" '
            f'stroke-width="{stroke_w}" stroke-dasharray="{dash:.2f} {gap:.2f}" '
            f'stroke-dashoffset="{-offset:.2f}" transform="rotate(-90 {cx} {cy})">'
            f'<title>{sev}: {count}</title></circle>'
        )
        offset += dash

    label = f'<text x="{cx}" y="{cy - 6}" text-anchor="middle" fill="#e6edf3" font-size="22" font-weight="700">{total}</text>'
    sub = f'<text x="{cx}" y="{cy + 16}" text-anchor="middle" fill="#8b949e" font-size="11">findings</text>'

    return f'<svg viewBox="0 0 160 160" width="160" height="160">{"".join(segments)}{label}{sub}</svg>'


def _legend_items(counts: dict[str, int]) -> str:
    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    items = []
    for sev in order:
        count = counts.get(sev, 0)
        color = _SEVERITY_COLOR.get(sev, "#888")
        items.append(
            f'<div class="legend-item">'
            f'<span class="legend-dot" style="background:{color}"></span>'
            f'<span class="legend-label">{sev}</span>'
            f'<span class="legend-count" style="color:{color}">{count}</span>'
            f'</div>'
        )
    return "\n".join(items)


def _stat_card(severity: str, count: int) -> str:
    color = _SEVERITY_COLOR.get(severity.upper(), "#888")
    bg = _SEVERITY_BG.get(severity.upper(), "rgba(136,136,136,0.1)")
    return (
        f'<div class="stat-card" style="border-top:3px solid {color};background:{bg}">'
        f'<div class="stat-count" style="color:{color}">{count}</div>'
        f'<div class="stat-label">{severity.upper()}</div>'
        f'</div>'
    )


def _finding_card(finding: dict, idx: int) -> str:
    severity = finding.get("severity", "INFO").upper()
    color = _SEVERITY_COLOR.get(severity, "#888")
    file_path = _esc(finding.get("file", ""))
    line = finding.get("line")
    title = _esc(finding.get("title", "Security Issue"))
    description = _esc(finding.get("description", ""))
    recommendation = _esc(finding.get("recommendation", ""))
    cwe = finding.get("cwe", "")
    source = finding.get("_source", "")
    checkpoint = finding.get("_checkpoint", "")

    location = f"{file_path}:{line}" if line else file_path
    src_label = f"{source}" + (f" / {checkpoint}" if checkpoint else "")

    cwe_tag = (
        f'<span class="tag tag-cwe">{_esc(cwe)}</span>' if cwe else ""
    )
    src_tag = (
        f'<span class="tag tag-src">{_esc(src_label)}</span>' if src_label else ""
    )

    return f"""
<details class="finding" data-severity="{severity}" style="border-left:3px solid {color}">
  <summary class="finding-summary">
    <div class="finding-header">
      {_severity_badge(severity)}
      <span class="finding-title">{title}</span>
      <span class="finding-location">{location}</span>
      <div class="finding-tags">{cwe_tag}{src_tag}</div>
    </div>
  </summary>
  <div class="finding-body">
    {"<div class='finding-section'><div class='section-label'>Description</div><div class='section-text'>" + description + "</div></div>" if description else ""}
    {"<div class='finding-section'><div class='section-label'>Recommendation</div><div class='section-text rec'>" + recommendation + "</div></div>" if recommendation else ""}
  </div>
</details>"""


def generate_html_report(results: dict) -> str:
    target = _esc(results.get("target", "Unknown"))
    mode = _esc(results.get("mode", "both").upper())
    timestamp = results.get("timestamp", datetime.now().isoformat())
    duration = results.get("duration_seconds", 0)
    severity_counts = results.get("severity_counts", {s: 0 for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]})
    all_findings = results.get("all_findings", [])
    total = results.get("total_findings", 0)
    highest = results.get("highest_severity", "CLEAR")
    sentinel_data = results.get("sentinel", {})

    try:
        ts_fmt = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        ts_fmt = timestamp

    status_color = _SEVERITY_COLOR.get(highest, _SEVERITY_COLOR["CLEAR"])
    status_bg = _SEVERITY_BG.get(highest, "rgba(82,196,26,0.1)")

    findings_html = "\n".join(_finding_card(f, i) for i, f in enumerate(all_findings))

    checkpoint_rows = ""
    for cp_name, cp_data in sentinel_data.get("checkpoints", {}).items():
        count = len(cp_data.get("findings", []))
        status_icon = "✖" if count else "✔"
        status_cls = "cp-fail" if count else "cp-pass"
        summary = _esc(cp_data.get("summary", "")[:100])
        checkpoint_rows += (
            f"<tr><td>{_esc(cp_name)}</td>"
            f'<td class="{status_cls}">{status_icon} {count} finding(s)</td>'
            f"<td>{summary}</td></tr>\n"
        )

    scan_id = _esc(results.get("scan_id", ""))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BASS Security Report — {target}</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --bg:#0d1117;--surface:#161b22;--surface2:#21262d;--border:#30363d;
  --text:#e6edf3;--muted:#8b949e;--link:#58a6ff;
  --font:'Segoe UI',system-ui,-apple-system,sans-serif;
}}
body{{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}}
a{{color:var(--link)}}
.container{{max-width:1100px;margin:0 auto;padding:24px 16px}}
/* Header */
.header{{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;
  padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:12px;
  margin-bottom:24px}}
.header-brand{{display:flex;align-items:center;gap:12px}}
.logo{{font-size:28px;font-weight:800;letter-spacing:-1px;
  background:linear-gradient(135deg,#ff4d4f,#ff7a45,#ffc53d);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}}
.logo-sub{{color:var(--muted);font-size:13px;margin-top:2px}}
.header-meta{{text-align:right;color:var(--muted);font-size:13px;line-height:1.8}}
.header-meta strong{{color:var(--text)}}
/* Status banner */
.status-banner{{display:flex;align-items:center;gap:12px;padding:16px 24px;
  border-radius:10px;margin-bottom:24px;border:1px solid {status_color}40;
  background:{status_bg}}}
.status-dot{{width:12px;height:12px;border-radius:50%;background:{status_color};
  box-shadow:0 0 8px {status_color}}}
.status-text{{font-weight:700;font-size:18px;color:{status_color}}}
.status-sub{{color:var(--muted);margin-left:auto;font-size:13px}}
/* Stat cards */
.stats-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:24px}}
.stat-card{{padding:16px;border-radius:10px;border:1px solid var(--border);text-align:center}}
.stat-count{{font-size:32px;font-weight:800;line-height:1}}
.stat-label{{font-size:11px;font-weight:600;letter-spacing:.5px;color:var(--muted);margin-top:4px}}
/* Chart section */
.chart-section{{display:flex;align-items:center;gap:32px;padding:24px;
  background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:24px}}
.legend{{display:flex;flex-direction:column;gap:10px}}
.legend-item{{display:flex;align-items:center;gap:10px;font-size:14px}}
.legend-dot{{width:10px;height:10px;border-radius:50%;flex-shrink:0}}
.legend-label{{color:var(--muted);min-width:72px}}
.legend-count{{font-weight:700;margin-left:auto;min-width:24px;text-align:right}}
.no-findings-chart{{color:var(--muted);font-size:14px;padding:20px}}
/* Checkpoint table */
.section-title{{font-size:16px;font-weight:700;margin-bottom:12px;color:var(--text);
  display:flex;align-items:center;gap:8px}}
.section-title::before{{content:'';display:block;width:3px;height:18px;border-radius:2px;
  background:linear-gradient(180deg,#ff4d4f,#ff7a45)}}
table{{width:100%;border-collapse:collapse;margin-bottom:24px;
  background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}}
th{{text-align:left;padding:12px 16px;background:var(--surface2);color:var(--muted);
  font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}}
td{{padding:12px 16px;border-top:1px solid var(--border);font-size:14px;vertical-align:top}}
.cp-pass{{color:#52c41a}}
.cp-fail{{color:#ff4d4f}}
/* Filter bar */
.filter-bar{{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center}}
.filter-bar label{{color:var(--muted);font-size:13px;font-weight:600}}
.filter-btn{{padding:5px 14px;border-radius:20px;border:1px solid var(--border);
  background:var(--surface2);color:var(--muted);font-size:12px;font-weight:600;
  cursor:pointer;letter-spacing:.3px;transition:all .15s}}
.filter-btn:hover,.filter-btn.active{{color:var(--text);border-color:var(--text);background:var(--surface)}}
.filter-btn[data-sev="CRITICAL"].active{{color:#ff4d4f;border-color:#ff4d4f}}
.filter-btn[data-sev="HIGH"].active{{color:#ff7a45;border-color:#ff7a45}}
.filter-btn[data-sev="MEDIUM"].active{{color:#ffc53d;border-color:#ffc53d}}
.filter-btn[data-sev="LOW"].active{{color:#40a9ff;border-color:#40a9ff}}
.filter-btn[data-sev="INFO"].active{{color:#36cfc9;border-color:#36cfc9}}
/* Findings */
.findings-list{{display:flex;flex-direction:column;gap:8px}}
.finding{{border-radius:8px;background:var(--surface);border:1px solid var(--border);overflow:hidden}}
.finding-summary{{padding:14px 16px;cursor:pointer;list-style:none;user-select:none}}
.finding-summary::-webkit-details-marker{{display:none}}
.finding-summary::marker{{display:none}}
.finding-header{{display:flex;align-items:center;flex-wrap:wrap;gap:10px}}
.finding-title{{font-size:14px;font-weight:600;flex:1;min-width:200px}}
.finding-location{{font-size:12px;color:var(--muted);font-family:monospace;background:var(--surface2);
  padding:2px 8px;border-radius:4px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.finding-tags{{display:flex;gap:6px;flex-wrap:wrap}}
.badge{{padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.5px}}
.tag{{padding:2px 8px;border-radius:4px;font-size:11px;color:var(--muted);background:var(--surface2);border:1px solid var(--border)}}
.finding-body{{padding:16px;border-top:1px solid var(--border);background:var(--bg)}}
.finding-section{{margin-bottom:12px}}
.finding-section:last-child{{margin-bottom:0}}
.section-label{{font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--muted);
  text-transform:uppercase;margin-bottom:6px}}
.section-text{{font-size:14px;color:#c9d1d9;line-height:1.7;white-space:pre-wrap}}
.section-text.rec{{color:#7ee787}}
.empty-state{{text-align:center;padding:48px;color:var(--muted)}}
.empty-icon{{font-size:48px;margin-bottom:12px}}
/* Footer */
.footer{{text-align:center;color:var(--muted);font-size:12px;margin-top:32px;padding-top:16px;
  border-top:1px solid var(--border)}}
/* Print */
@media print{{
  body{{background:#fff;color:#000}}
  .filter-bar,.filter-btn{{display:none}}
  details{{display:block}}
  details summary{{pointer-events:none}}
}}
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <div class="header-brand">
      <div>
        <div class="logo">⚔ BASS</div>
        <div class="logo-sub">Base Alert Security System</div>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>Target:</strong> {target}</div>
      <div><strong>Mode:</strong> {mode}</div>
      <div><strong>Scanned:</strong> {_esc(ts_fmt)}</div>
      <div><strong>Duration:</strong> {duration:.1f}s</div>
      {"<div><strong>Scan ID:</strong> " + scan_id + "</div>" if scan_id else ""}
    </div>
  </div>

  <div class="status-banner">
    <div class="status-dot"></div>
    <div class="status-text">{highest}</div>
    <div class="status-sub">{total} total finding(s)</div>
  </div>

  <div class="stats-grid">
    {_stat_card("CRITICAL", severity_counts.get("CRITICAL", 0))}
    {_stat_card("HIGH",     severity_counts.get("HIGH", 0))}
    {_stat_card("MEDIUM",   severity_counts.get("MEDIUM", 0))}
    {_stat_card("LOW",      severity_counts.get("LOW", 0))}
    {_stat_card("INFO",     severity_counts.get("INFO", 0))}
  </div>

  <div class="chart-section">
    {_donut_chart_svg(severity_counts, total)}
    <div class="legend">
      {_legend_items(severity_counts)}
    </div>
  </div>

  {"<div class='section-title'>Sentinel Checkpoint Coverage</div><table><thead><tr><th>Checkpoint</th><th>Status</th><th>Summary</th></tr></thead><tbody>" + checkpoint_rows + "</tbody></table>" if checkpoint_rows else ""}

  <div class="section-title">Findings</div>

  <div class="filter-bar">
    <label>Filter:</label>
    <button class="filter-btn active" data-sev="ALL" onclick="filterFindings('ALL',this)">ALL ({total})</button>
    <button class="filter-btn" data-sev="CRITICAL" onclick="filterFindings('CRITICAL',this)">CRITICAL ({severity_counts.get("CRITICAL", 0)})</button>
    <button class="filter-btn" data-sev="HIGH" onclick="filterFindings('HIGH',this)">HIGH ({severity_counts.get("HIGH", 0)})</button>
    <button class="filter-btn" data-sev="MEDIUM" onclick="filterFindings('MEDIUM',this)">MEDIUM ({severity_counts.get("MEDIUM", 0)})</button>
    <button class="filter-btn" data-sev="LOW" onclick="filterFindings('LOW',this)">LOW ({severity_counts.get("LOW", 0)})</button>
    <button class="filter-btn" data-sev="INFO" onclick="filterFindings('INFO',this)">INFO ({severity_counts.get("INFO", 0)})</button>
  </div>

  <div class="findings-list" id="findings-list">
    {findings_html if findings_html else '<div class="empty-state"><div class="empty-icon">✅</div><div>No security findings detected.</div></div>'}
  </div>

  <div class="footer">
    Generated by <strong>BASS — Base Alert Security System</strong> &nbsp;·&nbsp; AI-Powered Security Intelligence
  </div>

</div>
<script>
function filterFindings(sev, btn) {{
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.finding').forEach(el => {{
    el.style.display = (sev === 'ALL' || el.dataset.severity === sev) ? '' : 'none';
  }});
}}
// Auto-expand critical findings
document.querySelectorAll('.finding[data-severity="CRITICAL"]').forEach(el => el.open = true);
</script>
</body>
</html>"""
