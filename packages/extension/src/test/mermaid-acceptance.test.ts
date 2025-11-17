/**
 * Mermaid Acceptance Tests
 * Integrates with Mocha test framework
 */

import * as assert from 'assert';
import * as path from 'path';
import {
  runAcceptanceTestsMultiFramework,
  runAcceptanceTests,
  type TestSuiteResult,
} from './acceptance/mermaid-acceptance-test';

suite('Mermaid Acceptance Tests', () => {
  // Get examples directory
  const examplesDir = path.resolve(__dirname, '../../examples');
  
  test('Discover acceptance tests', async () => {
    // This test verifies that test discovery works
    // It doesn't run the actual tests, just checks that they can be found
    const result = await runAcceptanceTestsMultiFramework(examplesDir);
    
    // We expect to find at least some tests (or zero if no .mmd files exist yet)
    assert.ok(typeof result.totalTests === 'number', 'Should return total test count');
    assert.ok(Array.isArray(result.results), 'Should return results array');
  });
  
  test('Run acceptance tests', async function() {
    // Increase timeout for acceptance tests
    this.timeout(60000);
    
    const result = await runAcceptanceTestsMultiFramework(examplesDir);
    
    // Report results
    console.log(`\nAcceptance Tests: ${result.passedTests}/${result.totalTests} passed`);
    
    if (result.failedTests > 0) {
      console.log('\nFailed tests:');
      for (const testResult of result.results) {
        if (!testResult.passed) {
          console.log(`  - ${testResult.testName}`);
          if (testResult.error) {
            console.log(`    Error: ${testResult.error}`);
          }
        }
      }
    }
    
    // Assert all tests passed
    assert.strictEqual(
      result.failedTests,
      0,
      `Expected 0 failed tests, but got ${result.failedTests}`
    );
  });
  
  test('Run acceptance tests with filter', async function() {
    // Increase timeout for acceptance tests
    this.timeout(60000);
    
    // Try to run tests matching a pattern
    const result = await runAcceptanceTestsMultiFramework(examplesDir, '001');
    
    // If tests were found, verify they match the filter
    if (result.totalTests > 0) {
      for (const testResult of result.results) {
        assert.ok(
          testResult.testName.includes('001'),
          `Test name should include filter: ${testResult.testName}`
        );
      }
    }
  });
});
