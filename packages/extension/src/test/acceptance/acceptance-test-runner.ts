/**
 * Acceptance test runner entry point
 * Runs Mermaid-based acceptance tests and reports results
 * 
 * Command line options:
 * - --filter=<pattern>: Filter tests by name pattern
 * - --framework=<framework>: Filter tests by framework (react, vue, svelte, etc.)
 * - --update-refs: Update reference .mmd files with generated output
 * - --list: List discovered tests without running them
 * 
 * Examples:
 * - Run all tests: node acceptance-test-runner.js
 * - Run Vue tests only: node acceptance-test-runner.js --framework=vue
 * - Run React tests matching "001": node acceptance-test-runner.js --framework=react --filter=001
 * - Update Vue reference files: node acceptance-test-runner.js --framework=vue --update-refs
 * - List all Vue tests: node acceptance-test-runner.js --framework=vue --list
 */

import * as path from 'path';
import {
  runAcceptanceTestsMultiFramework,
  formatTestReport,
  type TestSuiteResult,
} from './mermaid-acceptance-test';

/**
 * Main entry point for acceptance tests
 */
export async function runAcceptanceTestSuite(): Promise<number> {
  try {
    // Determine examples directory
    // When running from the extension package, examples is at the workspace root
    // __dirname is packages/extension/out/test/acceptance
    // So we need to go up 4 levels to get to the workspace root, then into examples
    const examplesDir = path.resolve(__dirname, '../../../../../examples');
    
    console.log(`Running acceptance tests from: ${examplesDir}`);
    
    // Parse command line arguments for filtering and options
    const args = process.argv.slice(2);
    const filterArg = args.find(arg => arg.startsWith('--filter='));
    const filter = filterArg ? filterArg.substring('--filter='.length) : undefined;
    const frameworkArg = args.find(arg => arg.startsWith('--framework='));
    const frameworkFilter = frameworkArg ? frameworkArg.substring('--framework='.length) : undefined;
    const updateRefs = args.includes('--update-refs');
    const listOnly = args.includes('--list');
    
    if (filter) {
      console.log(`Filtering tests: ${filter}`);
    }
    
    if (frameworkFilter) {
      console.log(`Framework filter: ${frameworkFilter}`);
    }
    
    if (updateRefs) {
      console.log('⚠️  Reference update mode enabled - .mmd files will be overwritten');
    }
    
    if (listOnly) {
      console.log('📋 List mode - showing discovered tests without running them');
    }
    
    // If list mode, just show discovered tests
    if (listOnly) {
      const { discoverTestsMultiFramework } = await import('./test-discovery');
      const discovery = discoverTestsMultiFramework(examplesDir);
      let testCases = discovery.testCases;
      
      // Apply filters
      if (frameworkFilter) {
        testCases = testCases.filter(tc => tc.framework === frameworkFilter);
      }
      if (filter) {
        testCases = testCases.filter(tc =>
          tc.testName.includes(filter) || tc.testName.match(new RegExp(filter))
        );
      }
      
      console.log(`\nDiscovered ${testCases.length} test(s):\n`);
      for (const testCase of testCases) {
        console.log(`  [${testCase.framework}] ${testCase.testName}`);
      }
      console.log('');
      
      return 0;
    }
    
    // Run tests
    const result = await runAcceptanceTestsMultiFramework(examplesDir, filter, updateRefs, frameworkFilter);
    
    // Print report
    console.log(formatTestReport(result));
    
    // Return exit code
    return result.failedTests === 0 ? 0 : 1;
  } catch (error) {
    console.error('Fatal error running acceptance tests:');
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// Run if this is the main module
if (require.main === module) {
  runAcceptanceTestSuite().then(exitCode => {
    process.exit(exitCode);
  });
}
