#!/usr/bin/env node

/**
 * Integration Test Runner
 * Runs integration tests for theme detection and rendering
 */

const path = require('path');
const Mocha = require('mocha');

// Create a Mocha instance - use BDD interface which supports both describe and suite
const mocha = new Mocha({
  timeout: 60000,
  reporter: 'spec',
  ui: 'bdd'  // Use BDD interface (describe, it, etc.)
});

// Add test files
const testDir = path.join(__dirname, 'out', 'test');
mocha.addFile(path.join(testDir, 'integration-theme-testing.test.js'));
mocha.addFile(path.join(testDir, 'theme-format-consistency.test.js'));
mocha.addFile(path.join(testDir, 'diagram-structure-preservation.test.js'));
mocha.addFile(path.join(testDir, 'accessibility.test.js'));

// Run the tests
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});
