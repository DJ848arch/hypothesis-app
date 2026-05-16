#!/usr/bin/env bash
# Runs after every Write/Edit tool call. Scans the written file for common
# security issues and prints findings to stdout (surfaced in Claude's context).

set -uo pipefail

PAYLOAD=$(cat)
FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // empty')

# Nothing to scan
if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Skip binary and generated files
case "$FILE_PATH" in
  *.png|*.jpg|*.jpeg|*.gif|*.ico|*.woff|*.woff2|*.ttf|*.eot|\
  *.pdf|*.zip|*.tar|*.gz|*.lock|*.min.js|*.min.css)
    exit 0
    ;;
esac

ISSUES=()

scan() {
  local label="$1"
  local pattern="$2"
  local hits
  hits=$(grep -nEi -- "$pattern" "$FILE_PATH" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    ISSUES+=("[$label] $FILE_PATH\n$hits")
  fi
}

# Credentials & secrets
scan "HARDCODED SECRET"    "(password|passwd|secret|api_key|apikey|api-key)\s*=\s*['\"][^'\"]{4,}['\"]"
scan "AUTH TOKEN"          "(token|auth|bearer)\s*[:=]\s*['\"][a-zA-Z0-9+/._-]{16,}['\"]"
scan "PRIVATE KEY"         "-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY"
scan "AWS ACCESS KEY"      "AKIA[0-9A-Z]{16}"
scan "GCP SERVICE ACCOUNT" "\"type\":\s*\"service_account\""

# Injection risks
scan "SQL INJECTION RISK"   "(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*(\\\$[a-zA-Z_]|\+\s*[a-zA-Z_])"
scan "SHELL INJECTION RISK" "(exec|system|popen|subprocess\.call|os\.system)\s*\(.*(\\\$|f['\"]|%s|\.format)"
scan "EVAL USAGE"           "\beval\s*\("

# Dangerous output / XSS
scan "UNSAFE HTML RENDER"     "(innerHTML|dangerouslySetInnerHTML|document\.write)\s*[=\(]"
scan "UNESCAPED TEMPLATE VAR" "\{\{\s*[^|{]+\|\s*safe\s*\}\}"

# Misconfigurations
scan "DEBUG FLAG ENABLED"    "(DEBUG|TESTING)\s*=\s*(True|1|true)"
scan "CORS WILDCARD"         "Access-Control-Allow-Origin['\"]?\s*[:=]\s*['\"]?\*"
scan "BROAD FILE PERMISSION" "chmod\s+(0?777|0?666|a\+[rwx])"

if [[ ${#ISSUES[@]} -eq 0 ]]; then
  exit 0
fi

echo "=== Security scan: $(basename "$FILE_PATH") ==="
for issue in "${ISSUES[@]}"; do
  echo -e "$issue"
  echo "---"
done
echo "Review the above before committing."
