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

ANALYZER_PKG_JSON="$PACKAGES_DIR/extension/.wca/analyzer/package.json"
if [[ -f "$ANALYZER_PKG_JSON" ]]; then
  echo "[wca-package] Stripping analyzer dev-only metadata..."
  ANALYZER_PKG_JSON="$ANALYZER_PKG_JSON" node - <<'NODE'
const fs = require('fs');
const path = process.env.ANALYZER_PKG_JSON;
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
const minimal = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: pkg.main,
  types: pkg.types,
  exports: pkg.exports,
  peerDependencies: pkg.peerDependencies,
  license: pkg.license,
  keywords: pkg.keywords,
  files: ['dist']
};
fs.writeFileSync(path, JSON.stringify(minimal, null, 2));
NODE
else
  echo "[wca-package] ERROR: Analyzer package.json missing in vendored copy" >&2
  exit 1
fi

pushd "$PACKAGES_DIR/extension" >/dev/null

echo "[wca-package] Rewriting analyzer dependency and stubbing prepublish script..."
node -e "const fs=require('fs');const pkgPath='package.json';const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));pkg.dependencies=pkg.dependencies||{};pkg.dependencies['@web-component-analyzer/analyzer']='file:./.wca/analyzer';pkg.scripts=pkg.scripts||{};pkg.scripts['vscode:prepublish']='node -e \"console.log(\\'Skipping vscode:prepublish (already built)\\')\"';fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2));"

echo "[wca-package] Installing extension dependencies (workspace disabled)..."
npm install --workspaces=false

echo "[wca-package] Building extension outputs (compile + webview)..."
npm run build

if [[ ! -f "media/mermaid.min.js" ]]; then
  echo "[wca-package] ERROR: media/mermaid.min.js not found after build"
  exit 1
fi

cp package-lock.json package-lock.base.json

TARGET_LIST_RAW="${WCA_VSCE_TARGETS:-win32-x64 win32-arm64 linux-x64 linux-arm64 darwin-x64 darwin-arm64}"
TARGET_LIST_RAW="${TARGET_LIST_RAW//,/ }"
read -r -a WCA_TARGETS <<<"$TARGET_LIST_RAW"

EXT_NAME="$(node -pe "require('./package.json').name")"
EXT_VERSION="$(node -pe "require('./package.json').version")"
SWC_VERSION="$(node -pe "(require('./package.json').dependencies||{})['@swc/core'] || ''")"

if [[ -z "$SWC_VERSION" ]]; then
  echo "[wca-package] ERROR: Unable to determine @swc/core version from package.json"
  exit 1
fi

if [[ ${#WCA_TARGETS[@]} -eq 0 ]]; then
  echo "[wca-package] ERROR: no VSCE targets defined"
  exit 1
fi

echo "[wca-package] Packaging targets: ${WCA_TARGETS[*]}"

for TARGET in "${WCA_TARGETS[@]}"; do
  PLATFORM="${TARGET%%-*}"
  ARCH="${TARGET##*-}"
  if [[ -z "$PLATFORM" || -z "$ARCH" || "$PLATFORM" == "$ARCH" ]]; then
    echo "[wca-package] ERROR: Unable to parse platform/arch from target '$TARGET'"
    exit 1
  fi

  case "$TARGET" in
    win32-x64) SWC_TARGET="win32-x64-msvc" ;;
    win32-arm64) SWC_TARGET="win32-arm64-msvc" ;;
    linux-x64) SWC_TARGET="linux-x64-gnu" ;;
    linux-arm64) SWC_TARGET="linux-arm64-gnu" ;;
    darwin-x64) SWC_TARGET="darwin-x64" ;;
    darwin-arm64) SWC_TARGET="darwin-arm64" ;;
    *)
      echo "[wca-package] ERROR: No SWC mapping for target '$TARGET'"
      exit 1
      ;;
  esac

  echo "[wca-package] Preparing dependencies for $TARGET (platform=$PLATFORM arch=$ARCH) ..."
  rm -rf node_modules
  cp package-lock.base.json package-lock.json
  npm_config_platform="$PLATFORM" npm_config_arch="$ARCH" npm install --workspaces=false --omit=dev

  rm -rf node_modules/@swc/core-*
  mkdir -p node_modules/@swc
  npx --yes pacote extract "@swc/core-$SWC_TARGET@$SWC_VERSION" "node_modules/@swc/core-$SWC_TARGET"

  if [[ ! -d "node_modules/@swc/core-$SWC_TARGET" ]]; then
    echo "[wca-package] ERROR: Expected node_modules/@swc/core-$SWC_TARGET after binary install"
    exit 1
  fi

  OUT_VSIX="$VSIX_DEST_DIR/${EXT_NAME}-${EXT_VERSION}-${TARGET}.vsix"
  echo "[wca-package] Running vsce package for $TARGET -> $OUT_VSIX"
  npx vsce package \
    --target "$TARGET" \
    --out "$OUT_VSIX" \
    --baseContentUrl "$BASE_CONTENT_URL" \
    --baseImagesUrl "$BASE_IMAGES_URL" \
    "$@"

  if [[ ! -f "$OUT_VSIX" ]]; then
    echo "[wca-package] ERROR: vsce failed for target $TARGET"
    exit 1
  fi
  echo "[wca-package] ✓ Created $OUT_VSIX"
done

rm -f package-lock.base.json

echo "[wca-package] Completed packaging for targets: ${WCA_TARGETS[*]}"

popd >/dev/null
