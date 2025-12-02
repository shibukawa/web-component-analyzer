#!/usr/bin/env node

/**
 * Simple unit test runner using Mocha
 * Runs all unit tests in the out/test directory
 */

const path = require('path');
const { spawn } = require('child_process');

// Run mocha with the test files
const mocha = spawn('npx', [
  'mocha',
  'out/test/**/*.test.js',
  '--timeout', '10000',
  '--exit'
], {
  cwd: __dirname,
  stdio: 'inherit'
});

mocha.on('close', (code) => {
  process.exit(code);
});
