#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function detectTarget() {
  const platformMap = {
    win32: 'win32',
    darwin: 'darwin',
    linux: 'linux'
  };
  const archMap = {
    x64: 'x64',
    arm64: 'arm64'
  };

  const platform = platformMap[process.platform];
  const arch = archMap[process.arch];

  if (!platform) {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
  if (!arch) {
    throw new Error(`Unsupported architecture: ${process.arch}`);
  }

  return `${platform}-${arch}`;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const pkgPath = path.join(repoRoot, 'packages', 'extension', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Extension package.json not found at ${pkgPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const target = detectTarget();
  const vsixName = `${pkg.name}-${pkg.version}-${target}.vsix`;
  const vsixPath = path.join(repoRoot, vsixName);

  if (!fs.existsSync(vsixPath)) {
    throw new Error(`VSIX artifact ${vsixName} not found. Run scripts/package-extension.sh first.`);
  }

  const codeBin = process.env.CODE_BIN || (process.platform === 'win32' ? 'code.cmd' : 'code');
  console.log(`[wca-install] Installing ${vsixName} using ${codeBin} ...`);

  const result = spawnSync(codeBin, ['--install-extension', vsixPath], {
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }

  console.log('[wca-install] Installation complete');
}

main();
