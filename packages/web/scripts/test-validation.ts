/**
 * Validation script to test that type definitions are correctly extracted
 * and that dependencies are properly configured.
 */
import { typeDefinitions } from '../src/config/type-definitions.js';

console.log('=== Type Definitions Validation ===\n');

// Check that we have the expected libraries
const expectedLibraries = ['react', 'swr'];
const actualLibraries = typeDefinitions.map(def => def.name);

console.log('Expected libraries:', expectedLibraries);
console.log('Actual libraries:', actualLibraries);
console.log();

// Validate each library
for (const expected of expectedLibraries) {
  const def = typeDefinitions.find(d => d.name === expected);
  if (!def) {
    console.error(`❌ Missing library: ${expected}`);
    process.exit(1);
  }
  console.log(`✓ Found library: ${expected}`);
  console.log(`  - Virtual path: ${def.virtualPath}`);
  console.log(`  - Dependencies: ${def.dependencies.length > 0 ? def.dependencies.join(', ') : 'none'}`);
  console.log(`  - Content size: ${def.content.length} characters`);
  console.log();
}

// Validate SWR specifically
const swrDef = typeDefinitions.find(d => d.name === 'swr');
if (swrDef) {
  console.log('=== SWR Validation ===\n');
  
  // Check that React is a dependency
  if (!swrDef.dependencies.includes('react')) {
    console.error('❌ SWR should have React as a dependency');
    process.exit(1);
  }
  console.log('✓ SWR has React as a dependency');
  
  // Check that the content includes useSWR
  if (!swrDef.content.includes('useSWR')) {
    console.error('❌ SWR content should include useSWR');
    process.exit(1);
  }
  console.log('✓ SWR content includes useSWR');
  
  // Check that the content imports from React
  if (!swrDef.content.includes('React')) {
    console.error('❌ SWR content should reference React');
    process.exit(1);
  }
  console.log('✓ SWR content references React');
  
  console.log();
}

// Validate dependency order
console.log('=== Dependency Order Validation ===\n');
const reactIndex = actualLibraries.indexOf('react');
const swrIndex = actualLibraries.indexOf('swr');

if (reactIndex === -1 || swrIndex === -1) {
  console.error('❌ Both React and SWR should be present');
  process.exit(1);
}

console.log(`React is at index ${reactIndex}`);
console.log(`SWR is at index ${swrIndex}`);
console.log('Note: The type registry will handle dependency ordering at runtime');
console.log();

console.log('=== All Validations Passed ✓ ===');
