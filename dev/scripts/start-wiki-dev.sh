#!/usr/bin/env sh
set -eu

cd /wiki

# Avoid duplicate dev servers when this script is called manually.
if pgrep -f "node dev" >/dev/null 2>&1; then
  echo "Wiki dev server already running. Skipping duplicate start."
  exit 0
fi

deps_fingerprint () {
  cat package.json yarn.lock 2>/dev/null | sha256sum | awk '{print $1}'
}

DEPS_STAMP_FILE=node_modules/.deps-fingerprint
CURRENT_FINGERPRINT=$(deps_fingerprint)
STORED_FINGERPRINT=$(cat "$DEPS_STAMP_FILE" 2>/dev/null || true)

# Fresh volume or package.json/yarn.lock changed since last install.
if [ ! -x node_modules/.bin/cross-env ] || [ "$CURRENT_FINGERPRINT" != "$STORED_FINGERPRINT" ]; then
  echo "Installing/updating dependencies..."
  npm install --legacy-peer-deps
  echo "$CURRENT_FINGERPRINT" > "$DEPS_STAMP_FILE"
fi

echo "Starting Wiki.js dev server..."
exec npm run dev
