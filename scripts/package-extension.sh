#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d -t wca-extension-build-XXXXXX)"
PACKAGES_DIR="$TMP_ROOT/packages"
VSIX_DEST_DIR="$ROOT_DIR"
KEEP_TEMP="${WCA_KEEP_PACKAGE_TEMP:-}" # set to non-empty to keep temp dir for debugging
BASE_CONTENT_URL="${WCA_BASE_CONTENT_URL:-https://github.com/shibukawa/web-component-analyzer/blob/main/packages/extension}"
BASE_IMAGES_URL="${WCA_BASE_IMAGES_URL:-https://raw.githubusercontent.com/shibukawa/web-component-analyzer/main/packages/extension}"

cleanup() {
  if [[ -z "$KEEP_TEMP" && -d "$TMP_ROOT" ]]; then
    rm -rf "$TMP_ROOT"
  else
    echo "Temporary workspace preserved at: $TMP_ROOT"
  fi
}
trap cleanup EXIT

mkdir -p "$PACKAGES_DIR"

echo "[wca-package] Building analyzer workspace for fresh dist artifacts..."
npm run --workspace @web-component-analyzer/analyzer build

echo "[wca-package] Copying extension sources into temp workspace..."
rsync -a --delete --exclude=node_modules "$ROOT_DIR/packages/extension/" "$PACKAGES_DIR/extension/"

echo "[wca-package] Vendoring analyzer sources inside extension/.wca ..."
mkdir -p "$PACKAGES_DIR/extension/.wca"
rsync -a --delete --exclude=node_modules "$ROOT_DIR/packages/analyzer/" "$PACKAGES_DIR/extension/.wca/analyzer/"

pushd "$PACKAGES_DIR/extension" >/dev/null

echo "[wca-package] Rewriting analyzer dependency to point at vendored copy..."
node -e "const fs=require('fs');const pkgPath='package.json';const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));pkg.dependencies=pkg.dependencies||{};pkg.dependencies['@web-component-analyzer/analyzer']='file:./.wca/analyzer';fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2));"

echo "[wca-package] Installing extension dependencies (workspace disabled)..."
npm install --workspaces=false

echo "[wca-package] Running vsce package $*"
npx vsce package \
  --baseContentUrl "$BASE_CONTENT_URL" \
  --baseImagesUrl "$BASE_IMAGES_URL" \
  "$@"

LATEST_VSIX="$(ls -t *.vsix | head -n 1)"
if [[ -z "$LATEST_VSIX" ]]; then
  echo "[wca-package] ERROR: vsce did not produce a VSIX"
  exit 1
fi
cp "$LATEST_VSIX" "$VSIX_DEST_DIR/$LATEST_VSIX"

echo "[wca-package] VSIX available at: $VSIX_DEST_DIR/$LATEST_VSIX"

popd >/dev/null
