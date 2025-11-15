#!/usr/bin/env node

/**
 * Type Extractor Script
 * 
 * Extracts TypeScript type definitions from npm packages and bundles them
 * into a single file for use in Monaco Editor.
 * 
 * Usage:
 *   tsx scripts/extract-types.ts [options]
 * 
 * Options:
 *   --config <path>   Path to type-config.json (default: src/config/type-config.json)
 *   --output <path>   Output file path (default: src/config/type-definitions.ts)
 *   --verbose         Enable verbose logging
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { TypeConfig, LibraryConfig } from '../src/types/type-config.js';
import { validateTypeConfig } from '../src/types/type-config.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Options for the type extractor script.
 */
interface ExtractorOptions {
  /** Path to the type-config.json configuration file */
  configPath: string;
  
  /** Path where the generated type-definitions.ts file will be written */
  outputPath: string;
  
  /** Whether to enable verbose logging during extraction */
  verbose: boolean;
}

/**
 * Extracted type definition for a single library.
 * 
 * Contains the library metadata and the actual type definition content
 * that will be registered with Monaco Editor.
 */
interface LibraryTypes {
  /** Library name (e.g., "react", "swr") */
  name: string;
  
  /** Virtual file path in Monaco (e.g., "file:///node_modules/@types/react/index.d.ts") */
  virtualPath: string;
  
  /** Combined content of all .d.ts files for this library */
  content: string;
  
  /** List of library names this library depends on */
  dependencies: string[];
}

/**
 * Parse command-line arguments into extractor options.
 * 
 * Supports the following arguments:
 * - --config <path>: Path to type-config.json
 * - --output <path>: Output file path for generated definitions
 * - --verbose: Enable detailed logging
 * - --help, -h: Show help message and exit
 * 
 * @returns Parsed extractor options with defaults applied
 * @throws {Error} If required argument values are missing or unknown arguments are provided
 */
function parseArgs(): ExtractorOptions {
  const args = process.argv.slice(2);
  const options: ExtractorOptions = {
    configPath: path.join(__dirname, '../src/config/type-config.json'),
    outputPath: path.join(__dirname, '../src/config/type-definitions.ts'),
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--config':
        if (i + 1 >= args.length) {
          throw new Error('--config requires a path argument');
        }
        options.configPath = path.resolve(args[++i]);
        break;
      
      case '--output':
        if (i + 1 >= args.length) {
          throw new Error('--output requires a path argument');
        }
        options.outputPath = path.resolve(args[++i]);
        break;
      
      case '--verbose':
        options.verbose = true;
        break;
      
      case '--help':
      case '-h':
        console.log(`
Type Extractor Script

Usage:
  tsx scripts/extract-types.ts [options]

Options:
  --config <path>   Path to type-config.json (default: src/config/type-config.json)
  --output <path>   Output file path (default: src/config/type-definitions.ts)
  --verbose         Enable verbose logging
  --help, -h        Show this help message
        `);
        process.exit(0);
        break;
      
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Load and validate configuration from JSON file.
 * 
 * Reads the configuration file, parses JSON, and validates the structure
 * using the validateTypeConfig function. Logs the number of enabled libraries
 * when verbose mode is enabled.
 * 
 * @param configPath - Absolute path to the type-config.json file
 * @param verbose - Whether to enable detailed logging
 * @returns Validated type configuration object
 * @throws {Error} If file doesn't exist, JSON is invalid, or validation fails
 */
function loadConfig(configPath: string, verbose: boolean): TypeConfig {
  if (verbose) {
    console.log(`Loading configuration from: ${configPath}`);
  }

  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  let configJson: unknown;
  
  try {
    configJson = JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to parse configuration JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate configuration using the validation function
  const config = validateTypeConfig(configJson);

  if (verbose) {
    const enabledLibs = config.libraries.filter(lib => lib.enabled);
    console.log(`Loaded ${enabledLibs.length} enabled libraries out of ${config.libraries.length} total`);
  }

  return config;
}

/**
 * Locate a package in node_modules directory.
 * 
 * Searches for the package in two locations:
 * 1. packages/web/node_modules (local to web package)
 * 2. node_modules at workspace root (hoisted by pnpm)
 * 
 * @param packageName - Name of the npm package (e.g., "@types/react", "swr")
 * @param verbose - Whether to log the found package path
 * @returns Absolute path to the package directory
 * @throws {Error} If package is not found in either location
 */
function locatePackage(packageName: string, verbose: boolean): string {
  // Start from the web package directory
  const webPackageDir = path.join(__dirname, '..');
  
  // Try to find the package in node_modules
  const packagePath = path.join(webPackageDir, 'node_modules', packageName);
  
  if (fs.existsSync(packagePath)) {
    if (verbose) {
      console.log(`  Found package at: ${packagePath}`);
    }
    return packagePath;
  }

  // Try workspace root node_modules
  const workspaceRoot = path.join(webPackageDir, '../..');
  const workspacePackagePath = path.join(workspaceRoot, 'node_modules', packageName);
  
  if (fs.existsSync(workspacePackagePath)) {
    if (verbose) {
      console.log(`  Found package at: ${workspacePackagePath}`);
    }
    return workspacePackagePath;
  }

  throw new Error(`Package not found: ${packageName}`);
}

/**
 * Read a .d.ts file and resolve relative imports.
 * 
 * Reads the type definition file content. Currently preserves relative imports
 * as-is since Monaco Editor handles module resolution. Future enhancement could
 * inline referenced files to create a fully self-contained bundle.
 * 
 * @param filePath - Absolute path to the .d.ts file
 * @param packageDir - Absolute path to the package root directory
 * @param verbose - Whether to log the file being read
 * @returns Content of the type definition file
 * @throws {Error} If file doesn't exist or cannot be read
 */
function readTypeDefinitionFile(filePath: string, packageDir: string, verbose: boolean): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Type definition file not found: ${filePath}`);
  }

  if (verbose) {
    console.log(`    Reading: ${path.relative(packageDir, filePath)}`);
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Resolve relative imports within the same package
  // Match patterns like: /// <reference path="./global.d.ts" />
  // or: import { Something } from './types';
  const referenceRegex = /\/\/\/\s*<reference\s+path=["']([^"']+)["']\s*\/>/g;
  const importRegex = /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+["'](\.[^"']+)["']/g;
  
  // For now, we'll keep the imports as-is since Monaco will handle module resolution
  // In the future, we might want to inline referenced files
  
  return content;
}

/**
 * Generate the output TypeScript file with bundled type definitions.
 * 
 * Creates a TypeScript file containing:
 * - File header with generation timestamp and warning
 * - TypeDefinition interface definition
 * - Array of type definitions with escaped content
 * 
 * The generated file exports a `typeDefinitions` array that can be imported
 * by the type registry at runtime.
 * 
 * @param libraries - Array of extracted library type definitions
 * @param outputPath - Absolute path where the output file should be written
 * @param verbose - Whether to log generation details (file size, library count)
 */
function generateOutputFile(libraries: LibraryTypes[], outputPath: string, verbose: boolean): void {
  if (verbose) {
    console.log(`\nGenerating output file: ${outputPath}`);
  }

  const timestamp = new Date().toISOString();
  
  // Escape string content for TypeScript string literals
  function escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
  }

  // Generate the file header
  const header = `/**
 * Auto-generated TypeScript Type Definitions
 * 
 * This file is automatically generated by the type extractor script.
 * DO NOT EDIT THIS FILE MANUALLY!
 * 
 * Generated: ${timestamp}
 * Libraries: ${libraries.map(lib => lib.name).join(', ')}
 * 
 * To regenerate this file, run:
 *   pnpm exec tsx scripts/extract-types.ts
 */

export interface TypeDefinition {
  /** Library name (e.g., "react", "swr") */
  name: string;
  
  /** Virtual file path in Monaco (e.g., "file:///node_modules/@types/react/index.d.ts") */
  virtualPath: string;
  
  /** The actual TypeScript type definition content */
  content: string;
  
  /** List of library names this definition depends on */
  dependencies: string[];
}

export const typeDefinitions: TypeDefinition[] = [
`;

  // Generate each library definition
  const libraryDefinitions = libraries.map(lib => {
    const escapedContent = escapeString(lib.content);
    const deps = JSON.stringify(lib.dependencies);
    
    return `  {
    name: '${lib.name}',
    virtualPath: '${lib.virtualPath}',
    content: \`${escapedContent}\`,
    dependencies: ${deps},
  }`;
  }).join(',\n');

  // Generate the file footer
  const footer = `
];
`;

  // Combine all parts
  const outputContent = header + libraryDefinitions + footer;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(outputPath, outputContent, 'utf-8');

  if (verbose) {
    const sizeKB = (outputContent.length / 1024).toFixed(2);
    console.log(`  File size: ${sizeKB} KB`);
    console.log(`  Libraries: ${libraries.length}`);
  }
}

/**
 * Topological sort for dependency ordering.
 * 
 * Performs a depth-first search to order libraries such that dependencies
 * are always loaded before their dependents. Detects circular dependencies
 * and throws an error if found.
 * 
 * Algorithm:
 * 1. Create a map of library names to library objects
 * 2. For each library, recursively visit dependencies first
 * 3. Track visiting state to detect cycles
 * 4. Add libraries to sorted list after all dependencies are visited
 * 
 * @param libraries - Array of library type definitions to sort
 * @param verbose - Whether to log the dependency order
 * @returns Sorted array with dependencies before dependents
 * @throws {Error} If circular dependencies are detected or dependencies are missing
 */
function topologicalSort(libraries: LibraryTypes[], verbose: boolean): LibraryTypes[] {
  const sorted: LibraryTypes[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  // Create a map for quick lookup
  const libraryMap = new Map<string, LibraryTypes>();
  for (const lib of libraries) {
    libraryMap.set(lib.name, lib);
  }

  function visit(libName: string, path: string[] = []): void {
    // Check for circular dependencies
    if (visiting.has(libName)) {
      const cycle = [...path, libName].join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    // Already processed
    if (visited.has(libName)) {
      return;
    }

    const lib = libraryMap.get(libName);
    if (!lib) {
      throw new Error(`Dependency "${libName}" is not configured or not enabled`);
    }

    visiting.add(libName);

    // Visit dependencies first
    for (const dep of lib.dependencies) {
      visit(dep, [...path, libName]);
    }

    visiting.delete(libName);
    visited.add(libName);
    sorted.push(lib);
  }

  // Visit all libraries
  for (const lib of libraries) {
    if (!visited.has(lib.name)) {
      visit(lib.name);
    }
  }

  if (verbose && sorted.length > 1) {
    console.log('\nDependency order:');
    sorted.forEach((lib, index) => {
      const deps = lib.dependencies.length > 0 ? ` (depends on: ${lib.dependencies.join(', ')})` : '';
      console.log(`  ${index + 1}. ${lib.name}${deps}`);
    });
  }

  return sorted;
}

/**
 * Extract type definitions for a single library.
 * 
 * Process:
 * 1. Locate the package in node_modules
 * 2. Read the entry point .d.ts file
 * 3. Read and concatenate any additional files
 * 4. Return the combined content with metadata
 * 
 * Additional files are separated by comment headers for clarity. If an
 * additional file cannot be read, a warning is logged but extraction continues.
 * 
 * @param config - Library configuration from type-config.json
 * @param verbose - Whether to log extraction details
 * @returns Library type definition with content and metadata
 * @throws {Error} If package or entry point file cannot be found
 */
function extractLibrary(config: LibraryConfig, verbose: boolean): LibraryTypes {
  if (verbose) {
    console.log(`\nExtracting types for: ${config.name}`);
  }

  // Locate the package
  const packageDir = locatePackage(config.packageName, verbose);

  // Read the entry point file
  const entryPointPath = path.join(packageDir, config.entryPoint);
  let content = readTypeDefinitionFile(entryPointPath, packageDir, verbose);

  // Read additional files if specified
  if (config.additionalFiles && config.additionalFiles.length > 0) {
    if (verbose) {
      console.log(`  Reading ${config.additionalFiles.length} additional files:`);
    }

    for (const additionalFile of config.additionalFiles) {
      const additionalFilePath = path.join(packageDir, additionalFile);
      
      try {
        const additionalContent = readTypeDefinitionFile(additionalFilePath, packageDir, verbose);
        
        // Append additional content with a separator comment
        content += `\n\n// ===== ${additionalFile} =====\n\n`;
        content += additionalContent;
      } catch (error) {
        console.warn(`  Warning: Could not read additional file ${additionalFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return {
    name: config.name,
    virtualPath: config.virtualPath,
    content: content,
    dependencies: config.dependencies || [],
  };
}

/**
 * Main execution function.
 * 
 * Orchestrates the entire type extraction process:
 * 1. Parse command-line arguments
 * 2. Load and validate configuration
 * 3. Extract type definitions for each enabled library
 * 4. Resolve dependencies and sort libraries
 * 5. Generate the output TypeScript file
 * 
 * Errors during individual library extraction are logged but don't stop
 * the process. The script exits with code 1 if no libraries are successfully
 * extracted or if a fatal error occurs.
 */
async function main() {
  try {
    // Parse command-line arguments
    const options = parseArgs();

    if (options.verbose) {
      console.log('Type Extractor Script');
      console.log('====================\n');
    }

    // Load configuration
    const config = loadConfig(options.configPath, options.verbose);

    // Filter to only enabled libraries
    const enabledLibraries = config.libraries.filter(lib => lib.enabled);

    if (enabledLibraries.length === 0) {
      console.warn('Warning: No enabled libraries found in configuration');
      return;
    }

    if (options.verbose) {
      console.log('\nEnabled libraries:');
      enabledLibraries.forEach(lib => {
        console.log(`  - ${lib.name} (${lib.packageName})`);
      });
      console.log('');
    }

    // Extract type definitions for each library
    const extractedLibraries: LibraryTypes[] = [];
    
    for (const libConfig of enabledLibraries) {
      try {
        const libraryTypes = extractLibrary(libConfig, options.verbose);
        extractedLibraries.push(libraryTypes);
      } catch (error) {
        console.error(`Failed to extract types for ${libConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with other libraries
      }
    }

    if (extractedLibraries.length === 0) {
      throw new Error('No type definitions were successfully extracted');
    }

    // Resolve dependencies and sort libraries
    let sortedLibraries: LibraryTypes[];
    try {
      sortedLibraries = topologicalSort(extractedLibraries, options.verbose);
    } catch (error) {
      console.error(`Dependency resolution failed: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('Falling back to alphabetical order');
      sortedLibraries = [...extractedLibraries].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Generate output file
    generateOutputFile(sortedLibraries, options.outputPath, options.verbose);

    console.log(`\n✓ Type extraction completed successfully`);
    console.log(`  Extracted ${sortedLibraries.length} libraries`);
    console.log(`  Output: ${path.relative(process.cwd(), options.outputPath)}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
