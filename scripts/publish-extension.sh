#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_SCRIPT="$ROOT_DIR/scripts/package-extension.sh"
TARGET_LIST_RAW="${WCA_VSCE_TARGETS:-win32-x64 win32-arm64 linux-x64 linux-arm64 darwin-x64 darwin-arm64}"
TARGET_LIST_RAW="${TARGET_LIST_RAW//,/ }"
read -r -a WCA_TARGETS <<<"$TARGET_LIST_RAW"

if [[ ${#WCA_TARGETS[@]} -eq 0 ]]; then
  echo "[wca-publish] ERROR: no VSCE targets defined"
  exit 1
fi

if [[ -z "${WCA_SKIP_PACKAGE:-}" ]]; then
  echo "[wca-publish] Building fresh VSIX artifacts via package-extension.sh ..."
  "$PACKAGE_SCRIPT"
else
  echo "[wca-publish] Skipping package step because WCA_SKIP_PACKAGE is set"
fi

pushd "$ROOT_DIR" >/dev/null
EXT_NAME="$(node -pe "require('./packages/extension/package.json').name")"
EXT_VERSION="$(node -pe "require('./packages/extension/package.json').version")"
popd >/dev/null

if [[ -z "$EXT_NAME" || -z "$EXT_VERSION" ]]; then
  echo "[wca-publish] ERROR: Unable to read extension package metadata"
  exit 1
fi

echo "[wca-publish] Publishing targets: ${WCA_TARGETS[*]}"

for TARGET in "${WCA_TARGETS[@]}"; do
  VSIX_PATH="$ROOT_DIR/${EXT_NAME}-${EXT_VERSION}-${TARGET}.vsix"
  if [[ ! -f "$VSIX_PATH" ]]; then
    echo "[wca-publish] ERROR: Expected artifact $VSIX_PATH not found"
    exit 1
  fi
  echo "[wca-publish] Publishing $TARGET using $VSIX_PATH ..."
  npx vsce publish --packagePath "$VSIX_PATH" "$@"
  echo "[wca-publish] ✓ Published $TARGET"
fi

echo "[wca-publish] All targets published successfully"
