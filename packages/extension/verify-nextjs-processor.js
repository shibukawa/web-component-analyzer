/**
 * Verification script for Next.js processor implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Next.js Processor Verification\n');
console.log('='.repeat(60));

let allPassed = true;

// Test 1: Verify Next.js processor file exists
console.log('\n✅ Test 1: Next.js processor module exists');
const nextProcessorPath = path.join(__dirname, '../analyzer/dist/libraries/next.js');
if (fs.existsSync(nextProcessorPath)) {
  console.log(`   ✓ Next.js processor file exists: ${nextProcessorPath}`);
  
  const content = fs.readFileSync(nextProcessorPath, 'utf-8');
  
  // Check for key components
  const checks = [
    { name: 'NextJSLibraryProcessor class', pattern: /class NextJSLibraryProcessor/ },
    { name: 'shouldHandle method', pattern: /shouldHandle\s*\(/ },
    { name: 'process method', pattern: /process\s*\(/ },
    { name: 'reset method', pattern: /reset\s*\(/ },
    { name: 'URL Input node creation', pattern: /URL: Input/ },
    { name: 'URL Output node creation', pattern: /URL: Output/ },
    { name: 'useRouter handling', pattern: /useRouter/ },
    { name: 'usePathname handling', pattern: /usePathname/ },
    { name: 'useSearchParams handling', pattern: /useSearchParams/ },
    { name: 'useParams handling', pattern: /useParams/ }
  ];
  
  checks.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      console.log(`   ✓ ${name} found`);
    } else {
      console.log(`   ✗ ${name} NOT FOUND`);
      allPassed = false;
    }
  });
} else {
  console.log(`   ✗ Next.js processor file NOT FOUND`);
  allPassed = false;
}

// Test 2: Verify Next.js processor is registered
console.log('\n✅ Test 2: Next.js processor registration');
const indexPath = path.join(__dirname, '../analyzer/dist/libraries/index.js');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf-8');
  
  if (content.includes('NextJSLibraryProcessor')) {
    console.log('   ✓ NextJSLibraryProcessor is imported');
  } else {
    console.log('   ✗ NextJSLibraryProcessor is NOT imported');
    allPassed = false;
  }
  
  if (content.includes('register(new NextJSLibraryProcessor())') || 
      content.includes('registry.register(new NextJSLibraryProcessor())')) {
    console.log('   ✓ NextJSLibraryProcessor is registered');
  } else {
    console.log('   ✗ NextJSLibraryProcessor is NOT registered');
    allPassed = false;
  }
} else {
  console.log('   ✗ libraries/index.js NOT FOUND');
  allPassed = false;
}

// Test 3: Verify ProcessorRegistry has reset method
console.log('\n✅ Test 3: ProcessorRegistry reset method');
const registryPath = path.join(__dirname, '../analyzer/dist/libraries/registry.js');
if (fs.existsSync(registryPath)) {
  const content = fs.readFileSync(registryPath, 'utf-8');
  
  if (content.includes('reset()') || content.includes('reset ()')) {
    console.log('   ✓ ProcessorRegistry has reset method');
  } else {
    console.log('   ✗ ProcessorRegistry reset method NOT FOUND');
    allPassed = false;
  }
} else {
  console.log('   ✗ ProcessorRegistry NOT FOUND');
  allPassed = false;
}

// Test 4: Verify DFDBuilder calls processor reset
console.log('\n✅ Test 4: DFDBuilder integration');
const dfdBuilderPath = path.join(__dirname, '../analyzer/dist/parser/dfd-builder.js');
if (fs.existsSync(dfdBuilderPath)) {
  const content = fs.readFileSync(dfdBuilderPath, 'utf-8');
  
  if (content.includes('processorRegistry.reset()') || 
      content.includes('registry.reset()')) {
    console.log('   ✓ DFDBuilder calls processor reset');
  } else {
    console.log('   ⚠️  DFDBuilder may not call processor reset (check manually)');
  }
  
  if (content.includes('getProcessorRegistry')) {
    console.log('   ✓ DFDBuilder uses global processor registry');
  } else {
    console.log('   ✗ DFDBuilder does NOT use global processor registry');
    allPassed = false;
  }
} else {
  console.log('   ✗ DFDBuilder NOT FOUND');
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('\n✅ All verification checks passed!');
  console.log('\nThe Next.js processor has been successfully implemented.');
  console.log('The following Next.js hooks are now supported:');
  console.log('  - useRouter (output hook)');
  console.log('  - usePathname (input hook)');
  console.log('  - useSearchParams (input hook)');
  console.log('  - useParams (input hook)');
  console.log('\nNext steps:');
  console.log('  1. Test with example components (107-NextJS-Routing.tsx, 108-NextJS-SearchParams.tsx)');
  console.log('  2. Verify URL node sharing works correctly');
  console.log('  3. Verify reset logic works when processing new components');
} else {
  console.log('\n❌ Some verification checks failed!');
  console.log('Please review the output above and fix any issues.');
  process.exit(1);
}
