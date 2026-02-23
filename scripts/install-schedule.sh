#!/bin/bash
# install-schedule.sh — installs the Garment ERP daily delivery check as a macOS LaunchAgent
# Run once: bash ~/Desktop/Garment\ ERP/scripts/install-schedule.sh

set -e

PLIST="com.garment-erp.check-delivery.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

echo "Installing Garment ERP delivery check schedule..."

# Make runner executable
chmod +x "$SCRIPT_DIR/check-delivery-runner.sh"

# Copy plist to LaunchAgents
mkdir -p "$LAUNCH_AGENTS"
cp "$SCRIPT_DIR/$PLIST" "$LAUNCH_AGENTS/$PLIST"

# Unload first (in case it was already loaded)
launchctl unload "$LAUNCH_AGENTS/$PLIST" 2>/dev/null || true

# Load the agent
launchctl load "$LAUNCH_AGENTS/$PLIST"

echo ""
echo "✓ Scheduled: weekdays at 08:45 Beijing time"
echo "✓ Logs:      $SCRIPT_DIR/check-delivery.log"
echo ""
echo "To run now:    node '$SCRIPT_DIR/check-delivery.mjs'"
echo "To view logs:  tail -f '$SCRIPT_DIR/check-delivery.log'"
echo "To uninstall:  launchctl unload ~/Library/LaunchAgents/$PLIST && rm ~/Library/LaunchAgents/$PLIST"
