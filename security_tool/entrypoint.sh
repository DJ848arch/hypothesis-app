#!/bin/bash
set -euo pipefail

TARGET="${BASS_TARGET:-.}"
MODE="${BASS_MODE:-both}"
FAIL_ON="${BASS_FAIL_ON:-HIGH}"
NOTIFY_ON="${BASS_NOTIFY_ON:-MEDIUM}"
WORKSPACE="${GITHUB_WORKSPACE:-/github/workspace}"

# Resolve target path
if [[ "$TARGET" = /* ]]; then
  FULL_TARGET="$TARGET"
else
  FULL_TARGET="${WORKSPACE}/${TARGET}"
fi

REPORT_PATH="${WORKSPACE}/bass-report.html"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  BASS — Base Alert Security System                          ║"
echo "║  GitHub Actions Mode                                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Target:    ${FULL_TARGET}"
echo "  Mode:      ${MODE}"
echo "  Fail on:   ${FAIL_ON}"
echo ""

cd /app

python main.py "$FULL_TARGET" \
  --mode "$MODE" \
  --fail-on "$FAIL_ON" \
  --notify-on "$NOTIFY_ON" \
  --format html \
  --output "$REPORT_PATH" \
  --github-action \
  --no-bass

EXIT_CODE=$?

if [[ -f "$REPORT_PATH" ]]; then
  echo ""
  echo "HTML report written to: $REPORT_PATH"
fi

exit $EXIT_CODE
