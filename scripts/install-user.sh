#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
BIN_HOME="$HOME/.local/bin"
CONFIG_DIR="$CONFIG_HOME/local-webapp-wrapper"
CONFIG_FILE="$CONFIG_DIR/config.json"
APPLICATIONS_DIR="$DATA_HOME/applications"

command -v npm >/dev/null 2>&1 || {
  printf 'Missing npm. Install Node.js/npm first.\n' >&2
  exit 1
}

mkdir -p "$CONFIG_DIR" "$APPLICATIONS_DIR" "$BIN_HOME"

npm install --prefix "$ROOT"
chmod +x "$ROOT/bin/local-webapp-wrapper"

if [[ ! -f "$CONFIG_FILE" ]]; then
  cp "$ROOT/config.example.json" "$CONFIG_FILE"
  printf 'Created %s from config.example.json\n' "$CONFIG_FILE"
else
  printf 'Using existing %s\n' "$CONFIG_FILE"
fi

ln -sfn "$ROOT/bin/local-webapp-wrapper" "$BIN_HOME/local-webapp-wrapper"

LOCAL_WEBAPP_CONFIG="$CONFIG_FILE" node "$ROOT/scripts/install-desktop.js"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_DIR"
fi

printf 'Installed local-webapp-wrapper. Run apps with: local-webapp-wrapper <app-id>\n'
