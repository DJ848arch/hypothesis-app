"""
Compliance framework mapper — maps BASS findings to SOC 2, PCI DSS 4.0,
NIST 800-53, and OWASP ASVS compliance requirements.

Generates an HTML compliance gap report showing which controls are violated
and which are satisfied.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ──────────────────────────────────────────────────────────────
# Framework definitions
# ──────────────────────────────────────────────────────────────

FRAMEWORKS: dict[str, dict] = {
    "soc2": {
        "name": "SOC 2 Type II (Trust Services Criteria)",
        "controls": {
            "CC6.1": {
                "title": "Logical Access Controls",
                "description": "Restricts logical access to systems and data",
                "cwes": ["CWE-287", "CWE-639", "CWE-284", "CWE-306", "CWE-862", "CWE-863"],
            },
            "CC6.6": {
                "title": "Security Threats from Outside",
                "description": "Guards against external threats via firewall, IDS, and input controls",
                "cwes": ["CWE-89", "CWE-78", "CWE-79", "CWE-22", "CWE-918", "CWE-352"],
            },
            "CC6.7": {
                "title": "Confidentiality of Data in Transmission",
                "description": "Encrypts data in transit and at rest",
                "cwes": ["CWE-327", "CWE-326", "CWE-311", "CWE-319"],
            },
            "CC7.1": {
                "title": "Threat Detection Infrastructure",
                "description": "Detects and monitors for security events",
                "cwes": ["CWE-778", "CWE-532", "CWE-209"],
            },
            "CC8.1": {
                "title": "Change Management",
                "description": "Controls system changes to prevent unauthorized modifications",
                "cwes": ["CWE-494", "CWE-829"],
            },
        },
    },
    "pci_dss": {
        "name": "PCI DSS 4.0",
        "controls": {
            "REQ-6.2.4": {
                "title": "Software Attack Prevention",
                "description": "Prevent injection, XSS, and other application-layer attacks",
                "cwes": ["CWE-89", "CWE-79", "CWE-78", "CWE-22", "CWE-918", "CWE-352"],
            },
            "REQ-6.4.1": {
                "title": "Public-Facing Web Application Protection",
                "description": "WAF or regular reviews for public web apps",
                "cwes": ["CWE-79", "CWE-89", "CWE-352"],
            },
            "REQ-8.2": {
                "title": "User Identification and Authentication",
                "description": "Unique IDs for all users; strong authentication required",
                "cwes": ["CWE-287", "CWE-306", "CWE-798"],
            },
            "REQ-8.3": {
                "title": "Strong Authentication for Passwords",
                "description": "Secure handling of authentication factors",
                "cwes": ["CWE-347", "CWE-327", "CWE-916", "CWE-521"],
            },
            "REQ-4.2": {
                "title": "Strong Cryptography in Transmission",
                "description": "Protect PAN in transit with strong cryptography",
                "cwes": ["CWE-327", "CWE-326", "CWE-295", "CWE-319"],
            },
            "REQ-10.2": {
                "title": "Audit Log Implementation",
                "description": "Implement audit logs for all access and changes",
                "cwes": ["CWE-778", "CWE-532"],
            },
            "REQ-11.3": {
                "title": "External and Internal Penetration Testing",
                "description": "Regular pen testing required",
                "cwes": [],
            },
        },
    },
    "nist_800_53": {
        "name": "NIST 800-53 Rev 5",
        "controls": {
            "SI-10": {
                "title": "Information Input Validation",
                "description": "Validate all inputs for accuracy, completeness, and format",
                "cwes": ["CWE-89", "CWE-79", "CWE-78", "CWE-20", "CWE-22"],
            },
            "AC-3": {
                "title": "Access Enforcement",
                "description": "Enforce logical access policies for all systems",
                "cwes": ["CWE-639", "CWE-284", "CWE-862", "CWE-863"],
            },
            "IA-2": {
                "title": "Identification and Authentication",
                "description": "Uniquely identify and authenticate users",
                "cwes": ["CWE-287", "CWE-306", "CWE-798", "CWE-521"],
            },
            "IA-5": {
                "title": "Authenticator Management",
                "description": "Manage authentication credentials",
                "cwes": ["CWE-347", "CWE-916", "CWE-798"],
            },
            "SC-8": {
                "title": "Transmission Confidentiality and Integrity",
                "description": "Protect transmitted data against disclosure and modification",
                "cwes": ["CWE-319", "CWE-295", "CWE-311"],
            },
            "SC-28": {
                "title": "Protection of Information at Rest",
                "description": "Protect stored sensitive information",
                "cwes": ["CWE-327", "CWE-326", "CWE-311", "CWE-916"],
            },
            "SC-7": {
                "title": "Boundary Protection",
                "description": "Monitor and control communications at network boundaries",
                "cwes": ["CWE-918"],
            },
            "CM-6": {
                "title": "Configuration Settings",
                "description": "Establish, document, and implement configuration settings",
                "cwes": ["CWE-16", "CWE-1188"],
            },
            "AU-2": {
                "title": "Event Logging",
                "description": "Determine which events require audit logging",
                "cwes": ["CWE-778", "CWE-532", "CWE-209"],
            },
            "SA-11": {
                "title": "Developer Testing and Evaluation",
                "description": "Require developers to perform security testing",
                "cwes": ["CWE-494", "CWE-829"],
            },
        },
    },
    "owasp_asvs": {
        "name": "OWASP ASVS 4.0",
        "controls": {
            "V1.5": {
                "title": "Input and Output Validation",
                "description": "Input validation and output encoding requirements",
                "cwes": ["CWE-89", "CWE-79", "CWE-78", "CWE-20"],
            },
            "V2.1": {
                "title": "Password Security",
                "description": "Password length and complexity requirements",
                "cwes": ["CWE-521", "CWE-916"],
            },
            "V2.7": {
                "title": "Out of Band Verification",
                "description": "Out-of-band authentication requirements",
                "cwes": ["CWE-287", "CWE-306"],
            },
            "V3.4": {
                "title": "Cookie-Based Session Management",
                "description": "Session token and cookie security",
                "cwes": ["CWE-614", "CWE-1004", "CWE-352"],
            },
            "V4.1": {
                "title": "Access Control Design",
                "description": "Access control and authorization requirements",
                "cwes": ["CWE-639", "CWE-862", "CWE-863"],
            },
            "V6.2": {
                "title": "Algorithms",
                "description": "Strong cryptographic algorithms required",
                "cwes": ["CWE-327", "CWE-326"],
            },
            "V6.3": {
                "title": "Random Values",
                "description": "Cryptographically secure random number generation",
                "cwes": ["CWE-330", "CWE-338"],
            },
            "V9.1": {
                "title": "Communications Security",
                "description": "TLS and secure communications requirements",
                "cwes": ["CWE-295", "CWE-319"],
            },
            "V10.3": {
                "title": "Deployed Application Integrity",
                "description": "Protect against supply chain attacks",
                "cwes": ["CWE-494", "CWE-829"],
            },
            "V13.2": {
                "title": "RESTful Web Services",
                "description": "REST API security requirements",
                "cwes": ["CWE-918", "CWE-352"],
            },
        },
    },
}

FRAMEWORK_KEYS = list(FRAMEWORKS.keys())


# ──────────────────────────────────────────────────────────────
# Mapping logic
# ──────────────────────────────────────────────────────────────

def map_findings_to_frameworks(findings: list[dict], framework_keys: list[str] | None = None) -> dict:
    """
    Map findings to compliance frameworks.
    Returns dict: {framework_key: {control_id: {violated: bool, findings: list, ...}}}
    """
    keys = framework_keys or FRAMEWORK_KEYS
    result: dict[str, Any] = {}

    finding_cwes: list[str] = [f.get("cwe", "") for f in findings if f.get("cwe")]

    for fkey in keys:
        fw = FRAMEWORKS.get(fkey)
        if not fw:
            continue

        controls_status: dict[str, dict] = {}
        total_violated = 0

        for ctrl_id, ctrl in fw["controls"].items():
            ctrl_cwes: list[str] = ctrl.get("cwes", [])
            violated_findings = [
                f for f in findings
                if f.get("cwe") and any(cwe in f.get("cwe", "") for cwe in ctrl_cwes)
            ]
            violated = bool(violated_findings)
            if violated:
                total_violated += 1

            controls_status[ctrl_id] = {
                "title": ctrl["title"],
                "description": ctrl["description"],
                "violated": violated,
                "finding_count": len(violated_findings),
                "findings": [
                    {
                        "title": f.get("title", ""),
                        "severity": f.get("severity", ""),
                        "file": f.get("file", ""),
                        "line": f.get("line"),
                        "cwe": f.get("cwe", ""),
                    }
                    for f in violated_findings[:5]
                ],
            }

        total_controls = len(fw["controls"])
        compliant = total_controls - total_violated

        result[fkey] = {
            "framework_name": fw["name"],
            "total_controls": total_controls,
            "compliant": compliant,
            "violated": total_violated,
            "compliance_pct": round(compliant / total_controls * 100, 1) if total_controls else 100,
            "controls": controls_status,
        }

    return result


def generate_compliance_report(
    findings: list[dict],
    target: str = ".",
    scan_id: str = "",
    framework_keys: list[str] | None = None,
) -> str:
    """Generate a self-contained HTML compliance gap report."""
    mapping = map_findings_to_frameworks(findings, framework_keys)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    keys = list(mapping.keys())

    # Summary bar items
    summary_cards = ""
    for fkey, fdata in mapping.items():
        pct = fdata["compliance_pct"]
        color = "#52c41a" if pct >= 80 else "#ffc53d" if pct >= 60 else "#ff4d4f"
        summary_cards += f"""
        <div class="card">
          <div class="card-score" style="color:{color}">{pct}%</div>
          <div class="card-name">{FRAMEWORKS[fkey]['name'].split('(')[0].strip()}</div>
          <div class="card-sub">{fdata['compliant']}/{fdata['total_controls']} controls</div>
        </div>"""

    # Control detail sections
    sections = ""
    for fkey, fdata in mapping.items():
        controls_html = ""
        for ctrl_id, ctrl in fdata["controls"].items():
            status_icon = "✖" if ctrl["violated"] else "✔"
            status_color = "#ff4d4f" if ctrl["violated"] else "#52c41a"
            findings_html = ""
            if ctrl["findings"]:
                rows = "".join(
                    f"<tr><td class='sev-{f['severity'].lower()}'>{f['severity']}</td>"
                    f"<td>{f['title']}</td>"
                    f"<td><code>{f['file']}:{f.get('line','?')}</code></td>"
                    f"<td>{f['cwe']}</td></tr>"
                    for f in ctrl["findings"]
                )
                findings_html = f"""
                  <table class="ftable">
                    <thead><tr><th>Severity</th><th>Finding</th><th>Location</th><th>CWE</th></tr></thead>
                    <tbody>{rows}</tbody>
                  </table>"""
                if ctrl["finding_count"] > 5:
                    findings_html += f"<p class='more'>…and {ctrl['finding_count'] - 5} more findings.</p>"

            controls_html += f"""
            <details class="ctrl" {"open" if ctrl["violated"] else ""}>
              <summary>
                <span style="color:{status_color};font-weight:bold">{status_icon}</span>
                <span class="ctrl-id">{ctrl_id}</span>
                <span class="ctrl-title">{ctrl['title']}</span>
                {f'<span class="badge-bad">{ctrl["finding_count"]} violation(s)</span>' if ctrl["violated"] else '<span class="badge-ok">Compliant</span>'}
              </summary>
              <div class="ctrl-body">
                <p class="ctrl-desc">{ctrl['description']}</p>
                {findings_html}
              </div>
            </details>"""

        pct = fdata["compliance_pct"]
        color = "#52c41a" if pct >= 80 else "#ffc53d" if pct >= 60 else "#ff4d4f"
        sections += f"""
        <section class="fw-section">
          <div class="fw-header">
            <div>
              <h2>{fdata['framework_name']}</h2>
              <p>{fdata['compliant']} of {fdata['total_controls']} controls passing</p>
            </div>
            <div class="fw-score" style="color:{color}">{pct}%</div>
          </div>
          <div class="fw-bar">
            <div style="width:{pct}%;background:{color};height:100%;border-radius:4px;transition:.4s"></div>
          </div>
          {controls_html}
        </section>"""

    tab_buttons = "".join(
        f'<button class="tab-btn" onclick="showFw(\'fw-{k}\')">{FRAMEWORKS[k]["name"].split("(")[0].strip()}</button>'
        for k in keys
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BASS Compliance Report</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:#0d1117;color:#c9d1d9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5}}
  .header{{background:#161b22;border-bottom:1px solid #21262d;padding:24px 32px}}
  .header h1{{font-size:24px;font-weight:900;background:linear-gradient(90deg,#ff4d4f,#ffc53d);-webkit-background-clip:text;-webkit-text-fill-color:transparent}}
  .meta{{color:#8b949e;font-size:13px;margin-top:4px}}
  .summary{{display:flex;gap:16px;padding:24px 32px;flex-wrap:wrap}}
  .card{{background:#161b22;border:1px solid #21262d;border-radius:12px;padding:20px 24px;min-width:160px;text-align:center}}
  .card-score{{font-size:32px;font-weight:900}}
  .card-name{{font-size:13px;font-weight:600;margin-top:4px}}
  .card-sub{{font-size:11px;color:#8b949e;margin-top:2px}}
  .tabs{{display:flex;gap:4px;padding:0 32px;border-bottom:1px solid #21262d;overflow-x:auto}}
  .tab-btn{{padding:10px 18px;background:none;border:none;border-bottom:2px solid transparent;color:#8b949e;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:.2s}}
  .tab-btn:hover{{color:#fff}}
  .tab-btn.active{{border-bottom-color:#fff;color:#fff}}
  .fw-panel{{display:none;padding:24px 32px}}
  .fw-panel.active{{display:block}}
  .fw-section{{margin-bottom:32px}}
  .fw-header{{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}}
  .fw-header h2{{font-size:18px;font-weight:800}}
  .fw-header p{{font-size:13px;color:#8b949e}}
  .fw-score{{font-size:36px;font-weight:900}}
  .fw-bar{{height:6px;background:#21262d;border-radius:4px;margin-bottom:16px;overflow:hidden}}
  .ctrl{{background:#161b22;border:1px solid #21262d;border-radius:8px;margin-bottom:8px;overflow:hidden}}
  .ctrl summary{{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;list-style:none;user-select:none}}
  .ctrl summary::-webkit-details-marker{{display:none}}
  .ctrl-id{{font-family:monospace;font-size:12px;background:#21262d;padding:2px 6px;border-radius:4px;color:#8b949e;shrink:0}}
  .ctrl-title{{flex:1;font-size:14px;font-weight:600}}
  .badge-bad{{background:#ff4d4f20;color:#ff4d4f;border:1px solid #ff4d4f40;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;shrink:0}}
  .badge-ok{{background:#52c41a20;color:#52c41a;border:1px solid #52c41a40;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;shrink:0}}
  .ctrl-body{{padding:12px 16px;border-top:1px solid #21262d}}
  .ctrl-desc{{color:#8b949e;font-size:13px;margin-bottom:12px}}
  .ftable{{width:100%;border-collapse:collapse;font-size:12px}}
  .ftable th{{background:#21262d;padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#8b949e}}
  .ftable td{{padding:6px 10px;border-bottom:1px solid #21262d}}
  .ftable code{{font-size:11px;color:#8b949e}}
  .more{{color:#8b949e;font-size:12px;margin-top:8px}}
  .sev-critical{{color:#ff4d4f;font-weight:700}}
  .sev-high{{color:#ff7a45;font-weight:700}}
  .sev-medium{{color:#ffc53d;font-weight:700}}
  .sev-low{{color:#40a9ff}}
  .sev-info{{color:#36cfc9}}
  @media print{{.tabs,.tab-btn{{display:none}}.fw-panel{{display:block!important}}}}
</style>
</head>
<body>
<div class="header">
  <h1>⚔ BASS Compliance Report</h1>
  <p class="meta">Target: {target} &nbsp;·&nbsp; Generated: {timestamp}{' &nbsp;·&nbsp; Scan: ' + scan_id if scan_id else ''}</p>
</div>
<div class="summary">{summary_cards}</div>
<div class="tabs">{tab_buttons}</div>
{"".join(f'<div class="fw-panel" id="fw-{k}">{s}</div>' for k, s in zip(keys, sections.split("</section>")[:-1], strict=False))}
<script>
const panels = document.querySelectorAll('.fw-panel');
const btns = document.querySelectorAll('.tab-btn');
function showFw(id) {{
  panels.forEach(p => p.classList.remove('active'));
  btns.forEach(b => b.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  const btn = [...btns].find(b => b.getAttribute('onclick').includes(id));
  if (btn) btn.classList.add('active');
}}
if (panels.length) {{ panels[0].classList.add('active'); btns[0]?.classList.add('active'); }}
</script>
</body>
</html>"""
