"""
Simulator AI — generates realistic attack simulations for security training.

Takes a finding (from a scan or manually specified) and produces:
  - A full attack narrative written from an attacker's perspective
  - A proof-of-concept payload (clearly marked educational only)
  - MITRE ATT&CK kill chain breakdown
  - Detection indicators (what to look for in logs/SIEM)
  - Defense strategies (immediate + long-term)
  - A training assessment (quiz questions with explanations)
  - Real-world incident references

Designed for security training programs, red team exercises, and
professional development — NOT for active exploitation.
"""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

import anthropic

from attack_catalog import get_attack, attacks_for_cwe, ATTACK_CATALOG
from config import CYAN, MAGENTA, YELLOW, RESET_COLOR, BOLD

SYSTEM_PROMPT = """You are SIMULATOR AI, an expert security trainer and former penetration tester turned educator.

Your mission is to generate realistic, educational attack simulations that help security professionals understand HOW attacks work so they can build better defenses. This is for authorized security training programs.

Given a vulnerability in a codebase, you construct:
1. A realistic attack scenario as a skilled threat actor would execute it
2. A step-by-step kill chain (reconnaissance → exploitation → impact)
3. A proof-of-concept (PoC) payload — clearly labeled EDUCATIONAL ONLY
4. MITRE ATT&CK framework mapping
5. Detection indicators (SIEM queries, log patterns, anomaly signals)
6. Defense strategies (immediate mitigations + long-term architectural fixes)
7. Real-world incident parallels with impact statistics
8. Training assessment questions with detailed explanations

Tone: write the attack narrative in first-person from the attacker's perspective — this is deliberate. Defenders who understand attacker thinking are more effective. Be technically precise, not sensationalist.

⚠ EDUCATIONAL DISCLAIMER: All PoC payloads and techniques are for authorized security training only.

Respond ONLY with valid JSON in this exact structure — no markdown, no prose outside JSON:
{
  "simulation_id": "<provided>",
  "attack_name": "<attack type>",
  "owasp_category": "<OWASP category>",
  "cwe": "<CWE-XXX>",
  "mitre_technique": "<TXXXX>",
  "mitre_tactic": "<tactic name>",
  "difficulty": "<BEGINNER|INTERMEDIATE|ADVANCED|EXPERT>",
  "cvss_estimate": <float 0-10>,
  "target": {
    "file": "<file path>",
    "line": <line or null>,
    "function": "<function/class name if identifiable>",
    "description": "<what makes this target vulnerable>"
  },
  "attacker_profile": {
    "skill_level": "<Script Kiddie|Opportunist|Advanced Persistent Threat|Nation State>",
    "motivation": "<financial|espionage|sabotage|hacktivism>",
    "access_required": "<none|user|admin>",
    "typical_tools": ["<tool1>", "<tool2>"]
  },
  "kill_chain": [
    {
      "phase": "<Reconnaissance|Weaponization|Delivery|Exploitation|Installation|C2|Impact>",
      "mitre_technique": "<T-code>",
      "action": "<what the attacker does>",
      "detail": "<technical detail>"
    }
  ],
  "proof_of_concept": {
    "disclaimer": "EDUCATIONAL ONLY — authorized security training use",
    "payload": "<example payload or technique>",
    "request_example": "<HTTP request or code snippet showing the attack>",
    "expected_result": "<what happens if the attack succeeds>",
    "difficulty_notes": "<why this is easy or hard to execute>"
  },
  "impact_assessment": {
    "confidentiality": "<NONE|LOW|MEDIUM|HIGH|CRITICAL>",
    "integrity": "<NONE|LOW|MEDIUM|HIGH|CRITICAL>",
    "availability": "<NONE|LOW|MEDIUM|HIGH|CRITICAL>",
    "business_impact": "<description of business consequences>",
    "blast_radius": "<how far the compromise could spread>"
  },
  "detection": {
    "log_indicators": ["<what to look for in application logs>"],
    "siem_query": "<example SIEM/Splunk/ELK query>",
    "anomaly_patterns": ["<behavioral anomaly to watch for>"],
    "ids_signatures": ["<IDS/WAF rule descriptions>"],
    "mean_time_to_detect": "<typical detection window if unmonitored>"
  },
  "defense": {
    "immediate": ["<quick wins that stop this specific attack>"],
    "code_fix": "<what change in the vulnerable code prevents this>",
    "architectural": ["<deeper structural improvements>"],
    "defense_in_depth": ["<layered controls beyond the fix>"],
    "verification": "<how to test that the fix works>"
  },
  "narrative": "<500-800 word first-person attack story: how I found and exploited this. Be specific about the vulnerable code. Write for a security training audience.>",
  "real_world_parallels": [
    {
      "incident": "<incident name>",
      "year": <year>,
      "attack_similarity": "<how this mirrors the real incident>",
      "impact": "<what happened>",
      "lesson": "<key takeaway>"
    }
  ],
  "training_assessment": {
    "learning_objectives": ["<objective 1>", "<objective 2>", "<objective 3>"],
    "questions": [
      {
        "id": 1,
        "question": "<question>",
        "options": {"A": "<option>", "B": "<option>", "C": "<option>", "D": "<option>"},
        "correct": "<A|B|C|D>",
        "explanation": "<detailed explanation of why the answer is correct and others are wrong>"
      }
    ],
    "further_reading": ["<resource: title (URL or reference)>"]
  }
}"""


class SimulatorAI:
    def __init__(self, client: anthropic.Anthropic):
        self._client = client

    def simulate_from_finding(self, finding: dict, target_dir: Path) -> dict:
        """Generate an attack simulation from a scan finding."""
        sim_id = str(uuid.uuid4())
        attack_meta = self._resolve_attack_meta(finding)

        file_path = finding.get("file", "")
        full_path = Path(file_path) if Path(file_path).is_absolute() else target_dir / file_path
        code_context = ""
        try:
            code_context = full_path.read_text(encoding="utf-8", errors="replace")[:6000]
        except OSError:
            pass

        print(f"  {MAGENTA}[SIMULATOR]{RESET_COLOR} Building attack simulation: {BOLD}{attack_meta.get('name', finding.get('title'))}{RESET_COLOR}")
        print(f"  {CYAN}Target:{RESET_COLOR} {file_path}:{finding.get('line', '?')}")

        user_message = (
            f"SIMULATION ID: {sim_id}\n\n"
            f"VULNERABILITY FINDING:\n"
            f"  Title: {finding.get('title')}\n"
            f"  Severity: {finding.get('severity')}\n"
            f"  CWE: {finding.get('cwe', 'N/A')}\n"
            f"  File: {file_path}\n"
            f"  Line: {finding.get('line', 'unknown')}\n"
            f"  Description: {finding.get('description')}\n\n"
            f"ATTACK TYPE CONTEXT:\n"
            f"  Name: {attack_meta.get('name', 'Unknown')}\n"
            f"  OWASP: {attack_meta.get('owasp', 'N/A')}\n"
            f"  MITRE: {attack_meta.get('mitre', 'N/A')}\n"
            f"  Difficulty: {attack_meta.get('difficulty', 'INTERMEDIATE')}\n"
            f"  Variants: {', '.join(attack_meta.get('variants', []))}\n\n"
            f"VULNERABLE CODE:\n```\n{code_context}\n```\n\n"
            "Generate a complete attack simulation and training module as specified. "
            "Make the narrative specific to THIS codebase and vulnerability. "
            "The PoC payload must be directly relevant to the code shown."
        )

        return self._call_claude(user_message, sim_id, finding)

    def simulate_attack_type(self, attack_key: str, target_dir: Path) -> dict | None:
        """Hunt codebase for a target, then simulate a specific attack type."""
        attack_meta = get_attack(attack_key)
        if not attack_meta:
            print(f"  {YELLOW}[SIMULATOR] Unknown attack type: {attack_key}{RESET_COLOR}")
            return None

        print(f"  {MAGENTA}[SIMULATOR]{RESET_COLOR} Hunting codebase for {BOLD}{attack_meta['name']}{RESET_COLOR} targets...")

        # Read codebase to find a target
        from integrations.runner import IntegrationRunner
        code_sample = self._sample_codebase(target_dir, attack_meta)

        sim_id = str(uuid.uuid4())
        user_message = (
            f"SIMULATION ID: {sim_id}\n\n"
            f"ATTACK TYPE: {attack_meta['name']}\n"
            f"OWASP: {attack_meta['owasp']}\n"
            f"CWE: {attack_meta['cwe']}\n"
            f"MITRE: {attack_meta['mitre']}\n"
            f"Difficulty: {attack_meta['difficulty']}\n"
            f"Variants to consider: {', '.join(attack_meta.get('variants', []))}\n\n"
            f"CODEBASE SAMPLE:\n```\n{code_sample}\n```\n\n"
            "Hunt through the codebase sample above. Find the most realistic target for this attack type. "
            "If no clear target exists, construct a plausible scenario based on the code patterns shown. "
            "Generate the complete simulation and training module."
        )

        return self._call_claude(user_message, sim_id, {"cwe": attack_meta["cwe"], "severity": "HIGH"})

    def _build_feedback_context(self, attack_type: str) -> str:
        try:
            from feedback import get_improvement_context
            return get_improvement_context(attack_type)
        except Exception:
            return ""

    def _call_claude(self, user_message: str, sim_id: str, finding: dict) -> dict:
        # Inject feedback from past simulations so Claude self-improves
        attack_key = finding.get("_attack_key", "")
        feedback_context = self._build_feedback_context(attack_key)
        if feedback_context:
            user_message = f"{feedback_context}\n\n{user_message}"
        full_response = ""
        try:
            with self._client.messages.stream(
                model="claude-opus-4-7",
                max_tokens=8192,
                thinking={"type": "adaptive"},
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                for text in stream.text_stream:
                    full_response += text
        except Exception as exc:
            return {"error": str(exc), "simulation_id": sim_id}

        return self._parse(full_response, sim_id, finding)

    def _parse(self, response: str, sim_id: str, finding: dict) -> dict:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
                data["simulation_id"] = sim_id
                data["_finding"] = finding
                return data
            except json.JSONDecodeError:
                pass
        return {
            "simulation_id": sim_id,
            "error": "Parse failed",
            "raw": response[:500],
            "_finding": finding,
        }

    def _resolve_attack_meta(self, finding: dict) -> dict:
        cwe = finding.get("cwe", "")
        if cwe:
            matches = attacks_for_cwe(cwe)
            if matches:
                return matches[0]
        # Fallback: scan title for keywords
        title = finding.get("title", "").lower()
        for key, meta in ATTACK_CATALOG.items():
            if any(alias.lower() in title for alias in [key] + meta.get("aliases", [])):
                return meta
        return {"name": finding.get("title", "Generic Attack"), "owasp": "N/A", "mitre": "N/A",
                "difficulty": "INTERMEDIATE", "variants": []}

    def _sample_codebase(self, target_dir: Path, attack_meta: dict) -> str:
        import os
        import fnmatch
        from config import CODE_EXTENSIONS, EXCLUDED_DIRS

        # Use checkpoint patterns relevant to the attack type
        cwe = attack_meta.get("cwe", "")
        interesting_patterns = {
            "CWE-89":  ["*sql*", "*query*", "*db*", "*database*"],
            "CWE-78":  ["*exec*", "*command*", "*shell*", "*subprocess*"],
            "CWE-79":  ["*template*", "*render*", "*view*", "*html*"],
            "CWE-22":  ["*file*", "*path*", "*upload*", "*download*"],
            "CWE-918": ["*request*", "*fetch*", "*http*", "*url*"],
            "CWE-352": ["*form*", "*csrf*", "*token*", "*request*"],
            "CWE-639": ["*id*", "*user*", "*object*", "*resource*"],
            "CWE-287": ["*auth*", "*login*", "*session*", "*password*"],
            "CWE-327": ["*crypt*", "*hash*", "*encrypt*", "*secret*"],
            "CWE-347": ["*jwt*", "*token*", "*sign*", "*verify*"],
        }.get(cwe, ["*"])

        collected: list[str] = []
        char_limit = 8000

        for root, dirs, files in os.walk(target_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for filename in files:
                filepath = Path(root) / filename
                if filepath.suffix not in CODE_EXTENSIONS:
                    continue
                name_lower = filename.lower()
                if not any(fnmatch.fnmatch(name_lower, p) for p in interesting_patterns):
                    continue
                try:
                    content = filepath.read_text(encoding="utf-8", errors="replace")[:2000]
                    rel = filepath.relative_to(target_dir)
                    collected.append(f"=== {rel} ===\n{content}")
                    if sum(len(c) for c in collected) > char_limit:
                        break
                except OSError:
                    continue
            if sum(len(c) for c in collected) > char_limit:
                break

        return "\n\n".join(collected) or "(No matching files found)"
