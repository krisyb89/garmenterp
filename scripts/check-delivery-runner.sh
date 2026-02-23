#!/bin/bash
# check-delivery-runner.sh
# Wrapper called by macOS LaunchAgent — resolves node from common install locations

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$PROJECT_DIR/scripts/check-delivery.log"

echo "" >> "$LOG"
echo "==== $(date '+%Y-%m-%d %H:%M:%S') ====" >> "$LOG"

# Find node (Homebrew arm64, Homebrew x86, nvm, system)
for NODE_PATH in \
  /opt/homebrew/bin/node \
  /usr/local/bin/node \
  "$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin/node" \
  /usr/bin/node; do
  if [ -x "$NODE_PATH" ]; then
    "$NODE_PATH" "$PROJECT_DIR/scripts/check-delivery.mjs" >> "$LOG" 2>&1
    exit $?
  fi
done

echo "ERROR: node not found — install Node.js or update NODE_PATH in check-delivery-runner.sh" >> "$LOG"
exit 1
