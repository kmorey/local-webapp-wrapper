#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT/dist"
BUILD_DIR="$DIST_DIR/linux-unpacked"
PACKAGE_DIR="$BUILD_DIR/local-webapp-wrapper"
APP_RESOURCES="$PACKAGE_DIR/resources/app"
VERSION="$(node -p "require('$ROOT/package.json').version")"
ARCH="$(uname -m)"
TARBALL="$DIST_DIR/local-webapp-wrapper-$VERSION-linux-$ARCH.tar.gz"

command -v npm >/dev/null 2>&1 || {
  printf 'Missing npm. Install Node.js/npm first.\n' >&2
  exit 1
}

npm install --prefix "$ROOT"

rm -rf "$BUILD_DIR" "$TARBALL"
mkdir -p "$PACKAGE_DIR" "$APP_RESOURCES"

cp -a "$ROOT/node_modules/electron/dist/." "$PACKAGE_DIR/"
mv "$PACKAGE_DIR/electron" "$PACKAGE_DIR/local-webapp-wrapper"

cp "$ROOT/package.json" "$APP_RESOURCES/package.json"
cp "$ROOT/config.example.json" "$APP_RESOURCES/config.example.json"
cp -a "$ROOT/src" "$APP_RESOURCES/src"
mkdir -p "$APP_RESOURCES/scripts"
cp "$ROOT/scripts/install-desktop.js" "$APP_RESOURCES/scripts/install-desktop.js"
cp "$ROOT/scripts/install-packaged-app.sh" "$PACKAGE_DIR/install.sh"

chmod +x "$PACKAGE_DIR/local-webapp-wrapper"
chmod +x "$PACKAGE_DIR/install.sh"

tar -C "$BUILD_DIR" -czf "$TARBALL" local-webapp-wrapper

printf 'Built %s\n' "$TARBALL"
