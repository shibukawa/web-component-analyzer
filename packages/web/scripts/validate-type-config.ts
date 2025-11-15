/**
 * Validate type configuration file
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../src/config/type-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('=== Type Configuration Validation ===\n');

// Validate structure
if (!config.libraries || !Array.isArray(config.libraries)) {
  console.error('❌ Configuration must have a "libraries" array');
  process.exit(1);
}

console.log(`Found ${config.libraries.length} library configurations\n`);

// Validate each library
for (const lib of config.libraries) {
  console.log(`Validating: ${lib.name}`);
  
  // Check required fields
  const requiredFields = ['name', 'packageName', 'entryPoint', 'virtualPath', 'enabled'];
  for (const field of requiredFields) {
    if (!(field in lib)) {
      console.error(`  ❌ Missing required field: ${field}`);
      process.exit(1);
    }
  }
  
  // Check that package exists
  const packagePath = path.join(__dirname, '../node_modules', lib.packageName);
  if (!fs.existsSync(packagePath)) {
    console.error(`  ❌ Package not found: ${lib.packageName}`);
    console.error(`     Expected at: ${packagePath}`);
    process.exit(1);
  }
  console.log(`  ✓ Package found: ${lib.packageName}`);
  
  // Check that entry point exists
  const entryPath = path.join(packagePath, lib.entryPoint);
  if (!fs.existsSync(entryPath)) {
    console.error(`  ❌ Entry point not found: ${lib.entryPoint}`);
    console.error(`     Expected at: ${entryPath}`);
    process.exit(1);
  }
  console.log(`  ✓ Entry point found: ${lib.entryPoint}`);
  
  // Check dependencies
  if (lib.dependencies && lib.dependencies.length > 0) {
    console.log(`  ✓ Dependencies: ${lib.dependencies.join(', ')}`);
    
    // Validate that dependencies exist in config
    for (const dep of lib.dependencies) {
      const depLib = config.libraries.find((l: any) => l.name === dep);
      if (!depLib) {
        console.error(`  ❌ Dependency not found in config: ${dep}`);
        process.exit(1);
      }
    }
  } else {
    console.log(`  ✓ No dependencies`);
  }
  
  console.log(`  ✓ Status: ${lib.enabled ? 'enabled' : 'disabled'}`);
  console.log();
}

console.log('=== All Validations Passed ✓ ===');
