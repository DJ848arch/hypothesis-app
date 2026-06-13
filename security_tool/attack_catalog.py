"""
Attack catalog — definitions, metadata, and learning objectives for
every attack type BASS can simulate.

Each entry maps to OWASP Top 10 (2021), CWE, and MITRE ATT&CK where applicable.
Difficulty: BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
"""

from __future__ import annotations

ATTACK_CATALOG: dict[str, dict] = {
    # ── OWASP A03: Injection ───────────────────────────────────
    "sqli": {
        "name": "SQL Injection",
        "aliases": ["sql_injection", "sql-injection", "SQLi"],
        "owasp": "A03:2021 – Injection",
        "cwe": "CWE-89",
        "mitre": "T1190",
        "cvss_base": 9.8,
        "difficulty": "INTERMEDIATE",
        "description": "Attacker inserts malicious SQL into input fields to manipulate database queries.",
        "variants": ["Classic", "Blind (Boolean)", "Blind (Time-based)", "UNION-based", "Error-based", "Out-of-band"],
        "prerequisites": ["Input field that reaches database", "Insufficient parameterization"],
        "real_world": [
            {"year": 2021, "incident": "Accellion FTA breach", "impact": "3.5M records stolen from 100+ organizations"},
            {"year": 2022, "incident": "Twitter API exploitation", "impact": "5.4M user records exposed"},
        ],
        "learning_objectives": [
            "Understand how SQL injection bypasses authentication",
            "Recognize vulnerable query patterns in code",
            "Implement parameterized queries and prepared statements",
            "Detect SQL injection attempts in logs",
        ],
    },
    "cmdi": {
        "name": "Command Injection",
        "aliases": ["command_injection", "os_injection", "RCE"],
        "owasp": "A03:2021 – Injection",
        "cwe": "CWE-78",
        "mitre": "T1059",
        "cvss_base": 9.8,
        "difficulty": "INTERMEDIATE",
        "description": "Attacker injects OS commands into application inputs that are passed to a system shell.",
        "variants": ["Direct command injection", "Blind command injection", "Out-of-band exfiltration"],
        "prerequisites": ["Application executes OS commands", "User input reaches shell"],
        "real_world": [
            {"year": 2021, "incident": "Log4Shell (CVE-2021-44228)", "impact": "Millions of servers exposed to RCE"},
            {"year": 2023, "incident": "MOVEit Transfer (CVE-2023-34362)", "impact": "Data stolen from 2,000+ organizations"},
        ],
        "learning_objectives": [
            "Identify code paths that pass user input to system shells",
            "Understand command chaining and injection payloads",
            "Apply input sanitization and allowlisting",
            "Replace shell calls with safer library alternatives",
        ],
    },
    "xss": {
        "name": "Cross-Site Scripting (XSS)",
        "aliases": ["cross_site_scripting", "xss"],
        "owasp": "A03:2021 – Injection",
        "cwe": "CWE-79",
        "mitre": "T1189",
        "cvss_base": 6.1,
        "difficulty": "BEGINNER",
        "description": "Attacker injects malicious scripts into web pages viewed by other users.",
        "variants": ["Reflected XSS", "Stored (Persistent) XSS", "DOM-based XSS", "Blind XSS"],
        "prerequisites": ["Application reflects user input in HTML", "Missing output encoding"],
        "real_world": [
            {"year": 2022, "incident": "Mastodon stored XSS", "impact": "Account takeover via profile fields"},
            {"year": 2023, "incident": "GitLab XSS via Mermaid diagrams", "impact": "Session hijacking in enterprise environments"},
        ],
        "learning_objectives": [
            "Distinguish reflected, stored, and DOM-based XSS",
            "Apply context-aware output encoding",
            "Implement Content Security Policy (CSP)",
            "Recognize browser-side attack chaining",
        ],
    },
    # ── OWASP A01: Broken Access Control ──────────────────────
    "idor": {
        "name": "Insecure Direct Object Reference (IDOR)",
        "aliases": ["broken_access_control", "idor"],
        "owasp": "A01:2021 – Broken Access Control",
        "cwe": "CWE-639",
        "mitre": "T1078",
        "cvss_base": 8.1,
        "difficulty": "BEGINNER",
        "description": "Attacker manipulates object identifiers in requests to access unauthorized resources.",
        "variants": ["Numeric ID enumeration", "UUID guessing", "Path traversal IDOR", "API parameter tampering"],
        "prerequisites": ["Predictable object identifiers", "Missing ownership checks"],
        "real_world": [
            {"year": 2021, "incident": "Parler API IDOR", "impact": "All user data scraped before shutdown"},
            {"year": 2023, "incident": "T-Mobile API IDOR", "impact": "37M customer accounts exposed"},
        ],
        "learning_objectives": [
            "Understand why sequential IDs create enumeration risk",
            "Implement server-side authorization checks",
            "Apply indirect object references (UUIDs, mapping tables)",
            "Test access control with multi-account scenarios",
        ],
    },
    "path_traversal": {
        "name": "Path Traversal",
        "aliases": ["directory_traversal", "dot_dot_slash"],
        "owasp": "A01:2021 – Broken Access Control",
        "cwe": "CWE-22",
        "mitre": "T1083",
        "cvss_base": 7.5,
        "difficulty": "BEGINNER",
        "description": "Attacker uses '../' sequences to escape the intended directory and access restricted files.",
        "variants": ["Classic ../", "URL-encoded (%2e%2e%2f)", "Double-encoded (%252e)", "Null byte injection"],
        "prerequisites": ["Application reads files based on user input", "Insufficient path sanitization"],
        "real_world": [
            {"year": 2022, "incident": "Zimbra path traversal (CVE-2022-41352)", "impact": "RCE on email servers"},
        ],
        "learning_objectives": [
            "Recognize file path construction from user input",
            "Apply canonical path validation",
            "Understand OS-level path normalization differences",
            "Implement chroot/container isolation",
        ],
    },
    # ── OWASP A07: Auth Failures ───────────────────────────────
    "auth_bypass": {
        "name": "Authentication Bypass",
        "aliases": ["broken_auth", "auth_bypass"],
        "owasp": "A07:2021 – Identification and Authentication Failures",
        "cwe": "CWE-287",
        "mitre": "T1110",
        "cvss_base": 9.1,
        "difficulty": "INTERMEDIATE",
        "description": "Attacker circumvents authentication mechanisms to gain unauthorized access.",
        "variants": ["Brute force", "Credential stuffing", "Default credentials", "Logic bypass", "Token forging"],
        "prerequisites": ["Missing rate limiting", "Weak session management", "Predictable tokens"],
        "real_world": [
            {"year": 2022, "incident": "Cisco VPN brute force campaigns", "impact": "Corporate network breaches"},
            {"year": 2023, "incident": "Okta support system breach", "impact": "Customer auth tokens compromised"},
        ],
        "learning_objectives": [
            "Understand multi-factor authentication bypass techniques",
            "Implement account lockout and rate limiting",
            "Recognize session fixation and hijacking",
            "Apply secure password hashing (bcrypt, argon2)",
        ],
    },
    "jwt_attack": {
        "name": "JWT Attack",
        "aliases": ["jwt", "json_web_token_attack"],
        "owasp": "A07:2021 – Identification and Authentication Failures",
        "cwe": "CWE-347",
        "mitre": "T1550.001",
        "cvss_base": 8.8,
        "difficulty": "ADVANCED",
        "description": "Attacker exploits JWT implementation flaws to forge valid tokens without the secret key.",
        "variants": ["Algorithm confusion (RS256→HS256)", "None algorithm", "Key confusion", "jwk injection", "kid injection"],
        "prerequisites": ["Application uses JWT", "Improper algorithm validation"],
        "real_world": [
            {"year": 2022, "incident": "Auth0 JWT library vulnerability", "impact": "Authentication bypass in thousands of apps"},
        ],
        "learning_objectives": [
            "Understand JWT structure (header.payload.signature)",
            "Identify algorithm confusion vulnerabilities",
            "Implement strict algorithm allowlisting",
            "Validate all JWT claims (exp, iss, aud)",
        ],
    },
    # ── OWASP A02: Cryptographic Failures ─────────────────────
    "weak_crypto": {
        "name": "Weak Cryptography",
        "aliases": ["crypto_failures", "weak_encryption"],
        "owasp": "A02:2021 – Cryptographic Failures",
        "cwe": "CWE-327",
        "mitre": "T1600",
        "cvss_base": 7.5,
        "difficulty": "ADVANCED",
        "description": "Attacker exploits weak or misused cryptographic algorithms to decrypt sensitive data.",
        "variants": ["ECB mode oracle", "Padding oracle", "Hash length extension", "Hardcoded keys", "Weak RNG"],
        "prerequisites": ["Use of deprecated algorithms (MD5, SHA1, DES, RC4)", "Static IVs or keys"],
        "real_world": [
            {"year": 2023, "incident": "LastPass breach", "impact": "Password vaults exposed due to weak iteration count"},
        ],
        "learning_objectives": [
            "Identify deprecated cryptographic algorithms",
            "Understand why ECB mode leaks structure",
            "Apply AES-GCM or ChaCha20-Poly1305 correctly",
            "Implement secure key management practices",
        ],
    },
    # ── OWASP A10: SSRF ───────────────────────────────────────
    "ssrf": {
        "name": "Server-Side Request Forgery (SSRF)",
        "aliases": ["server_side_request_forgery"],
        "owasp": "A10:2021 – Server-Side Request Forgery",
        "cwe": "CWE-918",
        "mitre": "T1090",
        "cvss_base": 8.6,
        "difficulty": "ADVANCED",
        "description": "Attacker tricks the server into making requests to internal systems on their behalf.",
        "variants": ["Basic SSRF", "Blind SSRF", "Cloud metadata (AWS/GCP/Azure)", "SSRF via DNS rebinding"],
        "prerequisites": ["Application fetches URLs from user input", "No SSRF allowlist"],
        "real_world": [
            {"year": 2019, "incident": "Capital One breach via SSRF", "impact": "100M records + AWS credentials stolen"},
            {"year": 2021, "incident": "GitLab SSRF (CVE-2021-22214)", "impact": "Internal network access"},
        ],
        "learning_objectives": [
            "Understand cloud metadata endpoint risks (169.254.169.254)",
            "Implement URL allowlisting and DNS resolution validation",
            "Detect SSRF in code that fetches external URLs",
            "Apply network segmentation as defense in depth",
        ],
    },
    # ── CSRF ──────────────────────────────────────────────────
    "csrf": {
        "name": "Cross-Site Request Forgery (CSRF)",
        "aliases": ["cross_site_request_forgery"],
        "owasp": "A01:2021 – Broken Access Control",
        "cwe": "CWE-352",
        "mitre": "T1185",
        "cvss_base": 6.5,
        "difficulty": "INTERMEDIATE",
        "description": "Attacker tricks authenticated users into making unintended requests to a trusted site.",
        "variants": ["GET-based CSRF", "POST CSRF", "JSON CSRF", "Login CSRF"],
        "prerequisites": ["Session cookies without SameSite", "Missing CSRF tokens"],
        "real_world": [
            {"year": 2023, "incident": "WordPress plugin CSRF chains", "impact": "Admin account takeover"},
        ],
        "learning_objectives": [
            "Understand the same-origin policy and its limits",
            "Implement synchronizer token pattern",
            "Apply SameSite cookie attribute",
            "Validate Origin/Referer headers",
        ],
    },
    # ── Supply Chain ──────────────────────────────────────────
    "supply_chain": {
        "name": "Supply Chain Attack",
        "aliases": ["dependency_confusion", "typosquatting"],
        "owasp": "A08:2021 – Software and Data Integrity Failures",
        "cwe": "CWE-829",
        "mitre": "T1195.001",
        "cvss_base": 9.0,
        "difficulty": "EXPERT",
        "description": "Attacker compromises software supply chain by injecting malicious code into dependencies.",
        "variants": ["Dependency confusion", "Typosquatting", "Compromised maintainer", "Build system hijack"],
        "prerequisites": ["Unpinned or broad version ranges", "Private package names predictable"],
        "real_world": [
            {"year": 2021, "incident": "ua-parser-js npm hijack", "impact": "Malware in 8M weekly downloads"},
            {"year": 2021, "incident": "SolarWinds Orion", "impact": "18,000 organizations backdoored"},
        ],
        "learning_objectives": [
            "Pin exact dependency versions and use lock files",
            "Implement SBOM (Software Bill of Materials)",
            "Verify package integrity with checksums",
            "Monitor for dependency confusion attack patterns",
        ],
    },
}

DIFFICULTY_ORDER = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]


def get_attack(key: str) -> dict | None:
    key_lower = key.lower().replace("-", "_")
    if key_lower in ATTACK_CATALOG:
        return {**ATTACK_CATALOG[key_lower], "key": key_lower}
    for k, v in ATTACK_CATALOG.items():
        aliases = [a.lower().replace("-", "_") for a in v.get("aliases", [])]
        if key_lower in aliases:
            return {**v, "key": k}
    return None


def list_attacks(difficulty: str | None = None) -> list[dict]:
    attacks = [{"key": k, **v} for k, v in ATTACK_CATALOG.items()]
    if difficulty:
        attacks = [a for a in attacks if a["difficulty"] == difficulty.upper()]
    return sorted(attacks, key=lambda a: DIFFICULTY_ORDER.index(a["difficulty"]))


def attacks_for_cwe(cwe: str) -> list[dict]:
    return [{"key": k, **v} for k, v in ATTACK_CATALOG.items() if v.get("cwe") == cwe]
