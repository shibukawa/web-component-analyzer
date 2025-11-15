/**
 * Configuration schema for TypeScript type definitions in Monaco Editor
 */

/**
 * Configuration for a single library's type definitions
 */
export interface LibraryConfig {
  /** Library name (e.g., "react", "swr") */
  name: string;

  /** Package name in node_modules (e.g., "@types/react") */
  packageName: string;

  /** Entry point file (e.g., "index.d.ts") */
  entryPoint: string;

  /** Virtual file path in Monaco (e.g., "file:///node_modules/@types/react/index.d.ts") */
  virtualPath: string;

  /** Whether to include this library (for conditional bundling) */
  enabled: boolean;

  /** Optional: Additional files to include */
  additionalFiles?: string[];

  /** Optional: Dependencies that should be loaded first */
  dependencies?: string[];
}

/**
 * Root configuration object containing all library configurations
 */
export interface TypeConfig {
  /** List of library configurations */
  libraries: LibraryConfig[];
}

/**
 * Validation error for type configuration
 */
export class TypeConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypeConfigValidationError';
  }
}

/**
 * Validates a library configuration object
 */
export function validateLibraryConfig(config: unknown, index: number): LibraryConfig {
  if (!config || typeof config !== 'object') {
    throw new TypeConfigValidationError(`Library config at index ${index} must be an object`);
  }

  const lib = config as Record<string, unknown>;

  // Validate required string fields
  const requiredStringFields = ['name', 'packageName', 'entryPoint', 'virtualPath'];
  for (const field of requiredStringFields) {
    if (typeof lib[field] !== 'string' || !lib[field]) {
      throw new TypeConfigValidationError(
        `Library config at index ${index}: "${field}" must be a non-empty string`
      );
    }
  }

  // Validate enabled field
  if (typeof lib.enabled !== 'boolean') {
    throw new TypeConfigValidationError(
      `Library config at index ${index}: "enabled" must be a boolean`
    );
  }

  // Validate optional additionalFiles
  if (lib.additionalFiles !== undefined) {
    if (!Array.isArray(lib.additionalFiles)) {
      throw new TypeConfigValidationError(
        `Library config at index ${index}: "additionalFiles" must be an array`
      );
    }
    if (!lib.additionalFiles.every((f) => typeof f === 'string')) {
      throw new TypeConfigValidationError(
        `Library config at index ${index}: "additionalFiles" must contain only strings`
      );
    }
  }

  // Validate optional dependencies
  if (lib.dependencies !== undefined) {
    if (!Array.isArray(lib.dependencies)) {
      throw new TypeConfigValidationError(
        `Library config at index ${index}: "dependencies" must be an array`
      );
    }
    if (!lib.dependencies.every((d) => typeof d === 'string')) {
      throw new TypeConfigValidationError(
        `Library config at index ${index}: "dependencies" must contain only strings`
      );
    }
  }

  return {
    name: lib.name as string,
    packageName: lib.packageName as string,
    entryPoint: lib.entryPoint as string,
    virtualPath: lib.virtualPath as string,
    enabled: lib.enabled as boolean,
    additionalFiles: lib.additionalFiles as string[] | undefined,
    dependencies: lib.dependencies as string[] | undefined,
  };
}

/**
 * Validates the entire type configuration object
 */
export function validateTypeConfig(config: unknown): TypeConfig {
  if (!config || typeof config !== 'object') {
    throw new TypeConfigValidationError('Type config must be an object');
  }

  const cfg = config as Record<string, unknown>;

  if (!Array.isArray(cfg.libraries)) {
    throw new TypeConfigValidationError('"libraries" must be an array');
  }

  // Validate each library config
  const libraries = cfg.libraries.map((lib, index) => validateLibraryConfig(lib, index));

  // Check for duplicate library names
  const names = new Set<string>();
  for (const lib of libraries) {
    if (names.has(lib.name)) {
      throw new TypeConfigValidationError(`Duplicate library name: "${lib.name}"`);
    }
    names.add(lib.name);
  }

  // Validate dependencies exist
  for (const lib of libraries) {
    if (lib.dependencies) {
      for (const dep of lib.dependencies) {
        if (!names.has(dep)) {
          throw new TypeConfigValidationError(
            `Library "${lib.name}" depends on "${dep}" which is not configured`
          );
        }
      }
    }
  }

  return { libraries };
}
