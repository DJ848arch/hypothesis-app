"""
BASS Alerting — push security findings to Slack, Microsoft Teams, and email.

Configure via environment variables or constructor args:
  BASS_SLACK_WEBHOOK      — Slack incoming webhook URL
  BASS_TEAMS_WEBHOOK      — Teams incoming webhook URL
  BASS_SMTP_HOST          — SMTP host (e.g. smtp.gmail.com)
  BASS_SMTP_PORT          — SMTP port (default 587)
  BASS_SMTP_USER          — SMTP username
  BASS_SMTP_PASS          — SMTP password
  BASS_SMTP_TO            — Comma-separated recipient addresses
  BASS_SMTP_FROM          — Sender address
  BASS_NOTIFY_ON          — Minimum severity to alert (default HIGH)
"""

from __future__ import annotations

import json
import os
import smtplib
import urllib.request
import urllib.error
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

_SEVERITY_PRIORITY = {"CRITICAL": 5, "HIGH": 4, "MEDIUM": 3, "LOW": 2, "INFO": 1}

_SEV_COLORS = {
    "CRITICAL": "#ff4d4f",
    "HIGH":     "#ff7a45",
    "MEDIUM":   "#ffc53d",
    "LOW":      "#40a9ff",
    "INFO":     "#36cfc9",
}


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _filter_findings(findings: list[dict], min_severity: str) -> list[dict]:
    threshold = _SEVERITY_PRIORITY.get(min_severity.upper(), 4)
    return [f for f in findings if _SEVERITY_PRIORITY.get(f.get("severity", "INFO").upper(), 0) >= threshold]


def _post_json(url: str, payload: dict) -> bool:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "User-Agent": "BASS-Security-Tool/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10):
            return True
    except urllib.error.URLError:
        return False


# ──────────────────────────────────────────────────────────────
# Slack
# ──────────────────────────────────────────────────────────────

class SlackAlerter:
    def __init__(self, webhook_url: str):
        self._url = webhook_url

    def send(self, results: dict, min_severity: str = "HIGH") -> bool:
        findings = _filter_findings(results.get("all_findings", []), min_severity)
        if not findings:
            return True

        highest = results.get("highest_severity", "?")
        target = results.get("target", "?")
        total = results.get("total_findings", 0)
        counts = results.get("severity_counts", {})

        count_line = " | ".join(
            f"{sev}: {counts.get(sev, 0)}" for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            if counts.get(sev, 0) > 0
        )
        color = _SEV_COLORS.get(highest, "#8b949e")

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"⚔ BASS Security Alert — {highest}"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Target:*\n`{target}`"},
                    {"type": "mrkdwn", "text": f"*Total Findings:*\n{total}"},
                    {"type": "mrkdwn", "text": f"*Severity Breakdown:*\n{count_line or 'None'}"},
                    {"type": "mrkdwn", "text": f"*Scanned:*\n{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"},
                ],
            },
        ]

        # Top findings
        for f in findings[:5]:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*[{f.get('severity')}]* {f.get('title', 'Finding')}\n"
                        f"`{f.get('file', '?')}:{f.get('line', '?')}`\n"
                        f"{f.get('description', '')[:200]}"
                    ),
                },
            })

        if len(findings) > 5:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"_…and {len(findings) - 5} more finding(s) above {min_severity}._"},
            })

        return _post_json(self._url, {"attachments": [{"color": color, "blocks": blocks}]})


# ──────────────────────────────────────────────────────────────
# Microsoft Teams
# ──────────────────────────────────────────────────────────────

class TeamsAlerter:
    def __init__(self, webhook_url: str):
        self._url = webhook_url

    def send(self, results: dict, min_severity: str = "HIGH") -> bool:
        findings = _filter_findings(results.get("all_findings", []), min_severity)
        if not findings:
            return True

        highest = results.get("highest_severity", "?")
        target = results.get("target", "?")
        total = results.get("total_findings", 0)
        counts = results.get("severity_counts", {})

        facts = [
            {"name": "Target", "value": str(target)},
            {"name": "Highest Severity", "value": highest},
            {"name": "Total Findings", "value": str(total)},
        ]
        for sev in ["CRITICAL", "HIGH", "MEDIUM"]:
            if counts.get(sev, 0):
                facts.append({"name": sev, "value": str(counts[sev])})

        finding_text = "\n\n".join(
            f"**[{f.get('severity')}] {f.get('title', 'Finding')}**  \n"
            f"`{f.get('file', '?')}:{f.get('line', '?')}`  \n"
            f"{f.get('description', '')[:200]}"
            for f in findings[:5]
        )
        if len(findings) > 5:
            finding_text += f"\n\n_…and {len(findings) - 5} more._"

        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": _SEV_COLORS.get(highest, "8b949e").lstrip("#"),
            "summary": f"BASS Security Alert — {highest} ({total} findings)",
            "sections": [
                {
                    "activityTitle": f"⚔ BASS Security Alert — {highest}",
                    "activitySubtitle": f"Scanned: `{target}`",
                    "facts": facts,
                    "markdown": True,
                },
                {
                    "title": f"Top Findings (≥ {min_severity})",
                    "text": finding_text,
                    "markdown": True,
                },
            ],
        }
        return _post_json(self._url, payload)


# ──────────────────────────────────────────────────────────────
# Email (SMTP)
# ──────────────────────────────────────────────────────────────

class EmailAlerter:
    def __init__(
        self,
        smtp_host: str,
        smtp_port: int = 587,
        username: str = "",
        password: str = "",
        from_addr: str = "",
        to_addrs: list[str] | None = None,
    ):
        self._host = smtp_host
        self._port = smtp_port
        self._user = username
        self._pass = password
        self._from = from_addr or username
        self._to = to_addrs or []

    def send(self, results: dict, min_severity: str = "HIGH") -> bool:
        findings = _filter_findings(results.get("all_findings", []), min_severity)
        if not findings or not self._to:
            return True

        highest = results.get("highest_severity", "?")
        target = results.get("target", "?")
        total = results.get("total_findings", 0)
        counts = results.get("severity_counts", {})

        subject = f"[BASS] {highest} Security Alert — {total} findings in {target}"

        rows = "".join(
            f"<tr>"
            f"<td style='color:{_SEV_COLORS.get(f.get(\"severity\",\"INFO\"),\"#8b949e\")};font-weight:bold;padding:6px 12px'>{f.get('severity','?')}</td>"
            f"<td style='padding:6px 12px'>{f.get('title','')}</td>"
            f"<td style='font-family:monospace;padding:6px 12px'>{f.get('file','?')}:{f.get('line','?')}</td>"
            f"<td style='padding:6px 12px;color:#8b949e'>{f.get('description','')[:150]}</td>"
            f"</tr>"
            for f in findings[:20]
        )

        count_badges = " ".join(
            f"<span style='background:{_SEV_COLORS.get(sev,\"#8b949e\")};color:#0d1117;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold'>"
            f"{sev}: {counts.get(sev,0)}</span>"
            for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
            if counts.get(sev, 0) > 0
        )

        html = f"""<!DOCTYPE html>
<html><body style="background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:24px">
  <div style="max-width:800px;margin:0 auto">
    <h1 style="color:#ffc53d;margin-bottom:4px">⚔ BASS Security Alert</h1>
    <p style="color:#8b949e">Highest severity: <strong style="color:{_SEV_COLORS.get(highest,'#8b949e')}">{highest}</strong>
       &nbsp;·&nbsp; Target: <code>{target}</code>
       &nbsp;·&nbsp; {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
    <p>{count_badges}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;background:#161b22;border-radius:8px">
      <thead>
        <tr style="background:#21262d;text-align:left">
          <th style="padding:8px 12px">Severity</th>
          <th style="padding:8px 12px">Finding</th>
          <th style="padding:8px 12px">Location</th>
          <th style="padding:8px 12px">Description</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    {"<p style='color:#8b949e;margin-top:8px'>… and " + str(len(findings)-20) + " more findings above " + min_severity + ".</p>" if len(findings) > 20 else ""}
    <hr style="border-color:#21262d;margin-top:24px">
    <p style="color:#8b949e;font-size:12px">Generated by BASS — Base Alert Security System</p>
  </div>
</body></html>"""

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self._from
        msg["To"] = ", ".join(self._to)
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(self._host, self._port, timeout=10) as smtp:
                smtp.ehlo()
                smtp.starttls()
                if self._user and self._pass:
                    smtp.login(self._user, self._pass)
                smtp.sendmail(self._from, self._to, msg.as_string())
            return True
        except Exception:
            return False


# ──────────────────────────────────────────────────────────────
# Training / quiz notifications
# ──────────────────────────────────────────────────────────────

class TrainingSlackNotifier:
    def __init__(self, webhook_url: str):
        self._url = webhook_url

    def notify_quiz_result(self, result: dict) -> bool:
        name = result.get("member_name", "A team member")
        score = result.get("score_pct", 0)
        passed = result.get("passed", False)
        training = result.get("training_scheduled", [])

        text = (
            f"{'✅' if passed else '📚'} *{name}* scored *{score}%* on a security quiz "
            f"({'passed' if passed else 'did not pass'})."
        )
        if training:
            topics = ", ".join(t.get("topic", "?") for t in training)
            text += f"\n📅 Training auto-scheduled: _{topics}_"

        return _post_json(self._url, {"text": text})


# ──────────────────────────────────────────────────────────────
# AlertManager — fan-out to all configured channels
# ──────────────────────────────────────────────────────────────

class AlertManager:
    def __init__(self, min_severity: str = "HIGH"):
        self._min_severity = min_severity
        self._channels: list = []

        # Auto-configure from environment
        if slack_url := os.environ.get("BASS_SLACK_WEBHOOK", ""):
            self._channels.append(SlackAlerter(slack_url))

        if teams_url := os.environ.get("BASS_TEAMS_WEBHOOK", ""):
            self._channels.append(TeamsAlerter(teams_url))

        smtp_host = os.environ.get("BASS_SMTP_HOST", "")
        if smtp_host:
            to = [a.strip() for a in os.environ.get("BASS_SMTP_TO", "").split(",") if a.strip()]
            if to:
                self._channels.append(EmailAlerter(
                    smtp_host=smtp_host,
                    smtp_port=int(os.environ.get("BASS_SMTP_PORT", "587")),
                    username=os.environ.get("BASS_SMTP_USER", ""),
                    password=os.environ.get("BASS_SMTP_PASS", ""),
                    from_addr=os.environ.get("BASS_SMTP_FROM", ""),
                    to_addrs=to,
                ))

    def add_channel(self, channel) -> None:
        self._channels.append(channel)

    def is_configured(self) -> bool:
        return bool(self._channels)

    def send_scan_results(self, results: dict) -> dict[str, bool]:
        outcomes = {}
        for ch in self._channels:
            name = type(ch).__name__
            try:
                outcomes[name] = ch.send(results, self._min_severity)
            except Exception:
                outcomes[name] = False
        return outcomes

    def send_quiz_result(self, result: dict) -> None:
        for ch in self._channels:
            if isinstance(ch, (SlackAlerter, TrainingSlackNotifier)):
                try:
                    if isinstance(ch, TrainingSlackNotifier):
                        ch.notify_quiz_result(result)
                    elif isinstance(ch, SlackAlerter):
                        TrainingSlackNotifier(ch._url).notify_quiz_result(result)
                except Exception:
                    pass
