"""
Threat Intelligence client — enriches findings with CVE/NVD data,
EPSS exploit probability scores, and CISA Known Exploited Vulnerabilities (KEV).

All lookups are cached locally for 24 hours to avoid rate limiting.
Uses only stdlib urllib — no extra dependencies required.
"""

from __future__ import annotations

import json
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any

_CACHE_FILE = Path(__file__).parent / ".bass_threat_cache.json"
_CACHE_TTL_HOURS = 24
_REQUEST_TIMEOUT = 8

_NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
_EPSS_URL = "https://api.first.org/data/v1/epss"
_CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


# ──────────────────────────────────────────────────────────────
# Local cache
# ──────────────────────────────────────────────────────────────

def _load_cache() -> dict:
    if _CACHE_FILE.exists():
        try:
            return json.loads(_CACHE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"cves": {}, "epss": {}, "kev_ids": [], "kev_fetched": None}


def _save_cache(cache: dict) -> None:
    try:
        _CACHE_FILE.write_text(json.dumps(cache, indent=2, default=str))
    except OSError:
        pass


def _is_stale(ts_str: str | None) -> bool:
    if not ts_str:
        return True
    try:
        ts = datetime.fromisoformat(ts_str)
        return datetime.now(timezone.utc) - ts > timedelta(hours=_CACHE_TTL_HOURS)
    except (ValueError, TypeError):
        return True


# ──────────────────────────────────────────────────────────────
# HTTP helpers
# ──────────────────────────────────────────────────────────────

def _get_json(url: str, params: dict | None = None) -> Any:
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "BASS-Security-Tool/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=_REQUEST_TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


# ──────────────────────────────────────────────────────────────
# CVE lookup via NVD
# ──────────────────────────────────────────────────────────────

def _fetch_cves_for_cwe(cwe: str) -> list[dict]:
    """Return top 5 CVEs for a CWE from NVD."""
    # Strip "CWE-" prefix for the API
    cwe_id = cwe.replace("CWE-", "").strip()
    data = _get_json(_NVD_URL, {"cweId": f"CWE-{cwe_id}", "resultsPerPage": 5,
                                 "sortOrder": "publishedDate"})
    if not data:
        return []
    results = []
    for vuln in data.get("vulnerabilities", []):
        cve = vuln.get("cve", {})
        cve_id = cve.get("id", "")
        descriptions = cve.get("descriptions", [])
        desc = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")
        metrics = cve.get("metrics", {})
        # Try CVSSv3.1 then v3.0 then v2
        cvss_score = None
        cvss_severity = None
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            if key in metrics and metrics[key]:
                m = metrics[key][0]
                cvss_data = m.get("cvssData", {})
                cvss_score = cvss_data.get("baseScore")
                cvss_severity = cvss_data.get("baseSeverity") or m.get("baseSeverity")
                break
        published = cve.get("published", "")[:10]
        results.append({
            "cve_id": cve_id,
            "description": desc[:300],
            "cvss_score": cvss_score,
            "cvss_severity": cvss_severity,
            "published": published,
        })
    return results


# ──────────────────────────────────────────────────────────────
# EPSS scores
# ──────────────────────────────────────────────────────────────

def _fetch_epss(cve_ids: list[str]) -> dict[str, float]:
    """Return EPSS exploit probability (0-1) for each CVE ID."""
    if not cve_ids:
        return {}
    data = _get_json(_EPSS_URL, {"cve": ",".join(cve_ids)})
    if not data:
        return {}
    return {
        row["cve"]: float(row.get("epss", 0))
        for row in data.get("data", [])
    }


# ──────────────────────────────────────────────────────────────
# CISA KEV
# ──────────────────────────────────────────────────────────────

def _fetch_kev_ids(cache: dict) -> set[str]:
    """Return the set of CVE IDs in CISA's Known Exploited Vulnerabilities catalog."""
    if not _is_stale(cache.get("kev_fetched")):
        return set(cache.get("kev_ids", []))
    data = _get_json(_CISA_KEV_URL)
    if data:
        ids = [v["cveID"] for v in data.get("vulnerabilities", []) if "cveID" in v]
        cache["kev_ids"] = ids
        cache["kev_fetched"] = datetime.now(timezone.utc).isoformat()
        _save_cache(cache)
        return set(ids)
    return set(cache.get("kev_ids", []))


# ──────────────────────────────────────────────────────────────
# Main enrichment entrypoint
# ──────────────────────────────────────────────────────────────

def enrich_finding(finding: dict) -> dict:
    """
    Add threat intel fields to a finding dict (mutates in place, also returns it).
    Fields added: threat_intel.cves, threat_intel.actively_exploited, threat_intel.epss_max
    """
    cwe = finding.get("cwe", "")
    if not cwe:
        return finding

    cache = _load_cache()
    cache_key = cwe.upper()
    cached_entry = cache["cves"].get(cache_key, {})

    if _is_stale(cached_entry.get("fetched")):
        cves = _fetch_cves_for_cwe(cwe)
        cached_entry = {"cves": cves, "fetched": datetime.now(timezone.utc).isoformat()}
        cache["cves"][cache_key] = cached_entry
        _save_cache(cache)

    cves = cached_entry.get("cves", [])

    # EPSS scores
    cve_ids = [c["cve_id"] for c in cves if c.get("cve_id")]
    epss_map: dict[str, float] = {}
    if cve_ids:
        # Only fetch EPSS for IDs not yet cached
        uncached_ids = [i for i in cve_ids if i not in cache.get("epss", {})]
        if uncached_ids:
            fetched = _fetch_epss(uncached_ids)
            cache.setdefault("epss", {}).update(fetched)
            _save_cache(cache)
        epss_map = {i: cache["epss"].get(i, 0.0) for i in cve_ids}

    # CISA KEV
    kev_ids = _fetch_kev_ids(cache)
    in_kev = [c["cve_id"] for c in cves if c.get("cve_id") in kev_ids]

    # Attach to finding
    epss_max = max(epss_map.values()) if epss_map else 0.0
    for cve in cves:
        cve["epss"] = epss_map.get(cve.get("cve_id", ""), 0.0)
        cve["in_kev"] = cve.get("cve_id") in kev_ids

    finding["threat_intel"] = {
        "cves": cves,
        "cve_count": len(cves),
        "actively_exploited": bool(in_kev),
        "in_kev": in_kev,
        "epss_max": round(epss_max, 4),
        "epss_label": _epss_label(epss_max),
    }
    return finding


def enrich_findings(findings: list[dict]) -> list[dict]:
    """Enrich a batch of findings. Rate-limited to avoid NVD throttling."""
    enriched = []
    for i, f in enumerate(findings):
        enriched.append(enrich_finding(f))
        if i > 0 and i % 5 == 0:
            time.sleep(0.6)  # NVD rate limit: ~5 req/s without API key
    return enriched


def _epss_label(score: float) -> str:
    if score >= 0.5:
        return "CRITICAL EXPLOIT RISK"
    if score >= 0.1:
        return "HIGH EXPLOIT RISK"
    if score >= 0.01:
        return "MEDIUM EXPLOIT RISK"
    return "LOW EXPLOIT RISK"


def get_threat_summary(findings: list[dict]) -> dict:
    """Aggregate threat intel across all findings."""
    total_cves = 0
    actively_exploited = 0
    kev_cve_ids: list[str] = []
    max_epss = 0.0

    for f in findings:
        ti = f.get("threat_intel", {})
        total_cves += ti.get("cve_count", 0)
        if ti.get("actively_exploited"):
            actively_exploited += 1
            kev_cve_ids.extend(ti.get("in_kev", []))
        max_epss = max(max_epss, ti.get("epss_max", 0.0))

    return {
        "total_cves_found": total_cves,
        "findings_with_active_exploits": actively_exploited,
        "cisa_kev_cves": list(set(kev_cve_ids)),
        "max_epss_score": round(max_epss, 4),
        "max_epss_label": _epss_label(max_epss),
    }
