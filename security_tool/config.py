SENTINEL_CHECKPOINTS = {
    "authentication": {
        "patterns": ["*auth*", "*login*", "*session*", "*token*", "*jwt*", "*oauth*", "*signin*", "*signup*"],
        "description": "Authentication and identity management",
        "severity_weight": 1.5,
    },
    "authorization": {
        "patterns": ["*permission*", "*role*", "*access*", "*policy*", "*acl*", "*rbac*"],
        "description": "Authorization and access control",
        "severity_weight": 1.4,
    },
    "database": {
        "patterns": ["*sql*", "*query*", "*model*", "*repository*", "*dao*", "*orm*"],
        "description": "Database access and query handling",
        "severity_weight": 1.3,
    },
    "file_upload": {
        "patterns": ["*upload*", "*file*", "*attachment*", "*media*", "*storage*"],
        "description": "File upload and storage handling",
        "severity_weight": 1.2,
    },
    "api_routes": {
        "patterns": ["*route*", "*endpoint*", "*api*", "*controller*", "*view*", "*handler*"],
        "description": "API endpoints and request handlers",
        "severity_weight": 1.2,
    },
    "cryptography": {
        "patterns": ["*crypto*", "*hash*", "*encrypt*", "*decrypt*", "*password*", "*secret*", "*key*"],
        "description": "Cryptography and secret management",
        "severity_weight": 1.5,
    },
    "configuration": {
        "patterns": ["*config*", "*setting*", "*env*", "*secret*", "*.ini", "*.yaml", "*.json"],
        "description": "Configuration and secrets management",
        "severity_weight": 1.3,
    },
    "input_validation": {
        "patterns": ["*validate*", "*sanitize*", "*input*", "*form*", "*request*", "*parse*"],
        "description": "Input validation and sanitization",
        "severity_weight": 1.1,
    },
    "network": {
        "patterns": ["*http*", "*request*", "*fetch*", "*curl*", "*client*", "*proxy*"],
        "description": "Network request handling",
        "severity_weight": 1.0,
    },
    "injection": {
        "patterns": ["*exec*", "*eval*", "*command*", "*subprocess*", "*shell*", "*system*"],
        "description": "Command execution and injection-prone operations",
        "severity_weight": 1.5,
    },
}

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rb", ".php",
    ".cs", ".cpp", ".c", ".h",
    ".rs", ".swift", ".kt", ".scala",
    ".sh", ".bash", ".zsh",
}

CONFIG_EXTENSIONS = {
    ".ini", ".yaml", ".yml", ".json", ".toml", ".env",
    ".cfg", ".conf", ".properties",
}

EXCLUDED_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", "vendor", ".cargo",
    "target", "out", ".terraform", ".pytest_cache", "coverage",
    ".mypy_cache", ".ruff_cache",
}

SEVERITY_LEVELS = {
    "CRITICAL": {"color": "\033[91m\033[1m", "priority": 5},
    "HIGH":     {"color": "\033[91m",         "priority": 4},
    "MEDIUM":   {"color": "\033[93m",         "priority": 3},
    "LOW":      {"color": "\033[94m",         "priority": 2},
    "INFO":     {"color": "\033[96m",         "priority": 1},
}

RESET_COLOR = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"

SECURITY_PROTOCOLS = {
    "CRITICAL": [
        "1. IMMEDIATELY halt all deployments",
        "2. Isolate affected systems from production",
        "3. Alert security team and management",
        "4. Begin incident response procedures",
        "5. Document all findings and preserve evidence",
        "6. Engage incident response team",
    ],
    "HIGH": [
        "1. Flag for immediate review",
        "2. Notify development team lead",
        "3. Create security issue in tracker",
        "4. Schedule emergency patch within 24 hours",
        "5. Review related code for similar issues",
    ],
    "MEDIUM": [
        "1. Create security issue in tracker",
        "2. Assign to security-aware developer",
        "3. Fix within current sprint",
        "4. Conduct peer review of fix",
    ],
    "LOW": [
        "1. Log finding for future reference",
        "2. Address in next security review cycle",
        "3. Update security documentation",
    ],
    "INFO": [
        "1. Note for security awareness",
        "2. Consider in future security audits",
    ],
}

BASS_BANNER = r"""
╔══════════════════════════════════════════════════════════════════╗
║          BASS — Base Alert Security System                       ║
║          AI-Powered Security Intelligence Platform               ║
╚══════════════════════════════════════════════════════════════════╝

  [SENTINEL AI] — Guards known vulnerability checkpoints
  [PATROL AI]   — Patrols entire codebase dynamically

  ⚠  BASS authorization required before arming security AIs
"""

SENTINEL_BANNER = """
┌─────────────────────────────────────────────────────────┐
│  SENTINEL AI — Checkpoint Security Guard                 │
│  Watching known vulnerability hotspots                   │
└─────────────────────────────────────────────────────────┘"""

PATROL_BANNER = """
┌─────────────────────────────────────────────────────────┐
│  PATROL AI — Full Codebase Security Patrol               │
│  Dynamically scanning all code files                     │
└─────────────────────────────────────────────────────────┘"""
