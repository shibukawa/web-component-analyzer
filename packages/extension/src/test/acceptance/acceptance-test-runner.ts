/**
 * Acceptance test runner entry point
 * Runs Mermaid-based acceptance tests and reports results
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
    const updateRefs = args.includes('--update-refs');
    
    if (filter) {
      console.log(`Filtering tests: ${filter}`);
    }
    
    if (updateRefs) {
      console.log('⚠️  Reference update mode enabled - .mmd files will be overwritten');
    }
    
    // Run tests
    const result = await runAcceptanceTestsMultiFramework(examplesDir, filter, updateRefs);
    
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
