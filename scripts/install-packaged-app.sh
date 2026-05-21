#!/bin/bash

set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
OPT_HOME="$HOME/.local/opt"
BIN_HOME="$HOME/.local/bin"
CONFIG_DIR="$CONFIG_HOME/local-webapp-wrapper"
CONFIG_FILE="$CONFIG_DIR/config.json"
APPLICATIONS_DIR="$DATA_HOME/applications"
INSTALL_DIR="$OPT_HOME/local-webapp-wrapper"

mkdir -p "$CONFIG_DIR" "$APPLICATIONS_DIR" "$BIN_HOME" "$OPT_HOME"

if [[ "$SOURCE_DIR" != "$INSTALL_DIR" ]]; then
  rm -rf "$INSTALL_DIR"
  cp -a "$SOURCE_DIR" "$INSTALL_DIR"
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  cp "$INSTALL_DIR/resources/app/config.example.json" "$CONFIG_FILE"
  printf 'Created %s from config.example.json\n' "$CONFIG_FILE"
else
  printf 'Using existing %s\n' "$CONFIG_FILE"
fi

if [[ "${LOCAL_WEBAPP_SKIP_BIN_LINK:-0}" != "1" ]]; then
  ln -sfn "$INSTALL_DIR/local-webapp-wrapper" "$BIN_HOME/local-webapp-wrapper"
fi

LOCAL_WEBAPP_CONFIG="$CONFIG_FILE" LOCAL_WEBAPP_LAUNCHER="$BIN_HOME/local-webapp-wrapper" \
  ELECTRON_RUN_AS_NODE=1 "$INSTALL_DIR/local-webapp-wrapper" "$INSTALL_DIR/resources/app/scripts/install-desktop.js"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_DIR"
fi

printf 'Installed local-webapp-wrapper to %s\n' "$INSTALL_DIR"
