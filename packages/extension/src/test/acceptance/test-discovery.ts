/**
 * Test discovery for acceptance tests
 * Scans components directory for test pairs (component + reference Mermaid file)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestCase {
  componentPath: string;      // Path to .tsx file
  referencePath: string;      // Path to .mmd file
  testName: string;           // e.g., "001-ConditionalRendering"
  framework: string;          // e.g., "react"
  number: number;             // Numeric prefix for ordering
}

export interface TestDiscoveryResult {
  testCases: TestCase[];
  totalTests: number;
  frameworks: Set<string>;
}

/**
 * Extract test number from filename
 */
function extractTestNumber(filename: string): number | null {
  const match = filename.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Discover test cases in a directory
 */
export function discoverTests(baseDir: string): TestDiscoveryResult {
  const testCases: TestCase[] = [];
  const frameworks = new Set<string>();
  
  if (!fs.existsSync(baseDir)) {
    return {
      testCases: [],
      totalTests: 0,
      frameworks,
    };
  }
  
  // Scan directory for component files
  const files = fs.readdirSync(baseDir);
  const componentFiles = files.filter(f => /^\d+-.*\.(tsx|jsx|vue|svelte)$/.test(f));
  
  // For each component file, check if there's a corresponding .mmd file
  for (const componentFile of componentFiles) {
    const componentPath = path.join(baseDir, componentFile);
    const mmdFile = componentFile.replace(/\.(tsx|jsx|vue|svelte)$/, '.mmd');
    const referencePath = path.join(baseDir, mmdFile);
    
    // Only include if .mmd file exists
    if (fs.existsSync(referencePath)) {
      const testName = componentFile.replace(/\.(tsx|jsx|vue|svelte)$/, '');
      const number = extractTestNumber(componentFile) || 0;
      
      // Determine framework from file extension
      const ext = componentFile.split('.').pop() || '';
      let framework = 'unknown';
      if (ext === 'tsx' || ext === 'jsx') {
        framework = 'react';
      } else if (ext === 'vue') {
        framework = 'vue';
      } else if (ext === 'svelte') {
        framework = 'svelte';
      }
      
      frameworks.add(framework);
      
      testCases.push({
        componentPath,
        referencePath,
        testName,
        framework,
        number,
      });
    }
  }
  
  // Sort by test number
  testCases.sort((a, b) => a.number - b.number);
  
  return {
    testCases,
    totalTests: testCases.length,
    frameworks,
  };
}

/**
 * Get test cases for a specific framework
 */
export function getTestCasesForFramework(
  testCases: TestCase[],
  framework: string
): TestCase[] {
  return testCases.filter(tc => tc.framework === framework);
}

/**
 * Discover tests in multiple framework directories
 */
export function discoverTestsMultiFramework(examplesDir: string): TestDiscoveryResult {
  const allTestCases: TestCase[] = [];
  const frameworks = new Set<string>();
  
  // Common framework directories
  const frameworkDirs = [
    { dir: 'react-vite', framework: 'react' },
    { dir: 'vue-vite', framework: 'vue' },
    { dir: 'svelte-vite', framework: 'svelte' },
    { dir: 'lit-vite', framework: 'lit' },
    { dir: 'vanilla-vite', framework: 'vanilla' },
  ];
  
  for (const { dir, framework } of frameworkDirs) {
    const componentsDir = path.join(examplesDir, dir, 'src', 'components');
    
    if (fs.existsSync(componentsDir)) {
      const result = discoverTests(componentsDir);
      
      // Update framework in test cases
      for (const testCase of result.testCases) {
        testCase.framework = framework;
        frameworks.add(framework);
        allTestCases.push(testCase);
      }
    }
  }
  
  // Sort by framework then by test number
  allTestCases.sort((a, b) => {
    if (a.framework !== b.framework) {
      return a.framework.localeCompare(b.framework);
    }
    return a.number - b.number;
  });
  
  return {
    testCases: allTestCases,
    totalTests: allTestCases.length,
    frameworks,
  };
}
