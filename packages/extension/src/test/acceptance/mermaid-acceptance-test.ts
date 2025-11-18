/**
 * Mermaid-based acceptance test runner
 * Orchestrates test discovery, execution, and reporting
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReactParser, type DFDSourceData } from '@web-component-analyzer/analyzer';
import { parseComponent } from '../../utils/node-parser';
import { transformToMermaid } from '../../visualization/mermaid-transformer';
import {
  normalizeMermaid,
  compareDiagrams,
  generateDiffReport,
  type ComparisonResult,
} from './mermaid-normalizer';
import {
  discoverTests,
  discoverTestsMultiFramework,
  type TestCase,
  type TestDiscoveryResult,
} from './test-discovery';

export interface TestResult {
  testName: string;
  componentPath: string;
  passed: boolean;
  error?: string;
  comparison?: ComparisonResult;
  duration: number;
}

export interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  duration: number;
}

/**
 * Create a React parser for Node.js environment
 */
function createNodeReactParser() {
  return createReactParser(parseComponent);
}

/**
 * Run a single acceptance test
 */
export async function runSingleTest(testCase: TestCase, updateRefs?: boolean): Promise<TestResult> {
  const startTime = Date.now();
  
  // Check if this is a negative test case (expects error)
  const isNegativeTest = testCase.componentPath.includes('_ng.tsx') || testCase.componentPath.includes('_ng.jsx');
  
  try {
    // Read component source code
    if (!fs.existsSync(testCase.componentPath)) {
      return {
        testName: testCase.testName,
        componentPath: testCase.componentPath,
        passed: false,
        error: `Component file not found: ${testCase.componentPath}`,
        duration: Date.now() - startTime,
      };
    }
    
    const sourceCode = fs.readFileSync(testCase.componentPath, 'utf-8');
    
    // Read reference Mermaid file
    if (!fs.existsSync(testCase.referencePath)) {
      return {
        testName: testCase.testName,
        componentPath: testCase.componentPath,
        passed: false,
        error: `Reference Mermaid file not found: ${testCase.referencePath}`,
        duration: Date.now() - startTime,
      };
    }
    
    const referenceMermaid = fs.readFileSync(testCase.referencePath, 'utf-8');
    
    // Parse component and generate DFD data
    const parser = createNodeReactParser();
    const dfdData = await parser.parse(sourceCode, testCase.componentPath);
    
    if (!dfdData || dfdData.nodes.length === 0) {
      // For negative tests, this is expected behavior (test passes)
      if (isNegativeTest) {
        return {
          testName: testCase.testName,
          componentPath: testCase.componentPath,
          passed: true,
          duration: Date.now() - startTime,
        };
      }
      
      return {
        testName: testCase.testName,
        componentPath: testCase.componentPath,
        passed: false,
        error: 'Failed to parse component or no data flow detected',
        duration: Date.now() - startTime,
      };
    }
    
    // For negative tests, if we got here without error, the test fails
    if (isNegativeTest) {
      return {
        testName: testCase.testName,
        componentPath: testCase.componentPath,
        passed: false,
        error: 'Expected parsing to fail, but it succeeded',
        duration: Date.now() - startTime,
      };
    }
    
    // Generate Mermaid output from DFD data
    const generatedMermaid = transformToMermaid(dfdData);
    
    // If update-refs mode is enabled, write the generated output to the reference file
    if (updateRefs) {
      fs.writeFileSync(testCase.referencePath, generatedMermaid);
      return {
        testName: testCase.testName,
        componentPath: testCase.componentPath,
        passed: true,
        duration: Date.now() - startTime,
      };
    }
    
    // Normalize both diagrams
    const generatedNormalized = normalizeMermaid(generatedMermaid);
    const referenceNormalized = normalizeMermaid(referenceMermaid);
    
    // Compare diagrams
    const comparison = compareDiagrams(generatedNormalized, referenceNormalized);
    
    return {
      testName: testCase.testName,
      componentPath: testCase.componentPath,
      passed: comparison.passed,
      comparison,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    // For negative tests, catching an error means the test passed
    if (isNegativeTest) {
      return {
        testName: testCase.testName,
        componentPath: testCase.componentPath,
        passed: true,
        duration: Date.now() - startTime,
      };
    }
    
    return {
      testName: testCase.testName,
      componentPath: testCase.componentPath,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run all acceptance tests in a directory
 */
export async function runAcceptanceTests(
  baseDir: string,
  filter?: string,
  updateRefs?: boolean
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  
  // Discover tests
  const discovery = discoverTests(baseDir);
  let testCases = discovery.testCases;
  
  // Apply filter if provided
  if (filter) {
    testCases = testCases.filter(tc =>
      tc.testName.includes(filter) || tc.testName.match(new RegExp(filter))
    );
  }
  
  // Run tests
  const results: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await runSingleTest(testCase, updateRefs);
    results.push(result);
  }
  
  // Calculate statistics
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  
  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    duration: Date.now() - startTime,
  };
}

/**
 * Run acceptance tests across multiple frameworks
 */
export async function runAcceptanceTestsMultiFramework(
  examplesDir: string,
  filter?: string,
  updateRefs?: boolean
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  
  // Discover tests across all frameworks
  const discovery = discoverTestsMultiFramework(examplesDir);
  let testCases = discovery.testCases;
  
  // Apply filter if provided
  if (filter) {
    testCases = testCases.filter(tc =>
      tc.testName.includes(filter) || tc.testName.match(new RegExp(filter))
    );
  }
  
  // Run tests
  const results: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await runSingleTest(testCase, updateRefs);
    results.push(result);
  }
  
  // Calculate statistics
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  
  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    duration: Date.now() - startTime,
  };
}

/**
 * Format test results for console output
 */
export function formatTestReport(result: TestSuiteResult): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  Mermaid Acceptance Test Results');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  // Summary
  lines.push(`Total Tests:  ${result.totalTests}`);
  lines.push(`Passed:       ${result.passedTests} ✓`);
  lines.push(`Failed:       ${result.failedTests} ✗`);
  lines.push(`Duration:     ${result.duration}ms`);
  lines.push('');
  
  // Detailed results
  if (result.results.length > 0) {
    lines.push('Test Results:');
    lines.push('───────────────────────────────────────────────────────────');
    
    for (const testResult of result.results) {
      const status = testResult.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`${status} ${testResult.testName} (${testResult.duration}ms)`);
      
      if (!testResult.passed) {
        if (testResult.error) {
          lines.push(`  Error: ${testResult.error}`);
        } else if (testResult.comparison) {
          const diffReport = generateDiffReport(testResult.comparison);
          const diffLines = diffReport.split('\n');
          for (const diffLine of diffLines) {
            lines.push(`  ${diffLine}`);
          }
        }
      }
    }
  }
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  
  if (result.failedTests === 0) {
    lines.push('✓ All tests passed!');
  } else {
    lines.push(`✗ ${result.failedTests} test(s) failed`);
  }
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  return lines.join('\n');
}
