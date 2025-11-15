/**
 * Library Adapter System
 * 
 * This module provides functionality for loading, validating, and managing
 * third-party library adapters that map hooks to DFD elements.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  LibraryAdapter,
  LibraryAdapterConfig,
  HookAdapter,
  ReturnValuePattern,
  ReturnValueMapping,
  DFDElementType,
  UserLibraryAdapterConfig
} from './library-adapter-types.js';

/**
 * Validation error for library adapter configurations
 */
export class AdapterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdapterValidationError';
  }
}

/**
 * Validates a DFD element type
 */
function isValidDFDElementType(type: string): type is DFDElementType {
  return ['external-entity-input', 'data-store', 'process'].includes(type);
}

/**
 * Validates a return value mapping
 */
function validateReturnValueMapping(mapping: any, index: number): void {
  if (!mapping || typeof mapping !== 'object') {
    throw new AdapterValidationError(`Mapping at index ${index} must be an object`);
  }

  // Must have either variableName or propertyName
  if (!mapping.variableName && !mapping.propertyName) {
    throw new AdapterValidationError(
      `Mapping at index ${index} must have either variableName or propertyName`
    );
  }

  // Must have dfdElementType
  if (!mapping.dfdElementType) {
    throw new AdapterValidationError(
      `Mapping at index ${index} must have dfdElementType`
    );
  }

  // Validate dfdElementType
  if (!isValidDFDElementType(mapping.dfdElementType)) {
    throw new AdapterValidationError(
      `Mapping at index ${index} has invalid dfdElementType: ${mapping.dfdElementType}. ` +
      `Must be one of: external-entity-input, data-store, process`
    );
  }

  // Validate metadata if present
  if (mapping.metadata !== undefined && typeof mapping.metadata !== 'object') {
    throw new AdapterValidationError(
      `Mapping at index ${index} has invalid metadata: must be an object`
    );
  }
}

/**
 * Validates a return value pattern
 */
function validateReturnValuePattern(pattern: any, hookName: string): void {
  if (!pattern || typeof pattern !== 'object') {
    throw new AdapterValidationError(
      `Hook ${hookName} has invalid returnPattern: must be an object`
    );
  }

  // Validate type
  if (!pattern.type || !['object', 'array', 'single'].includes(pattern.type)) {
    throw new AdapterValidationError(
      `Hook ${hookName} has invalid returnPattern.type: ${pattern.type}. ` +
      `Must be one of: object, array, single`
    );
  }

  // Validate mappings
  if (!Array.isArray(pattern.mappings)) {
    throw new AdapterValidationError(
      `Hook ${hookName} has invalid returnPattern.mappings: must be an array`
    );
  }

  if (pattern.mappings.length === 0) {
    throw new AdapterValidationError(
      `Hook ${hookName} has empty returnPattern.mappings: must have at least one mapping`
    );
  }

  // Validate each mapping
  pattern.mappings.forEach((mapping: any, index: number) => {
    validateReturnValueMapping(mapping, index);
  });

  // Validate consistency between type and mappings
  if (pattern.type === 'object') {
    const hasInvalidMapping = pattern.mappings.some(
      (m: any) => !m.propertyName
    );
    if (hasInvalidMapping) {
      throw new AdapterValidationError(
        `Hook ${hookName} has type 'object' but some mappings don't have propertyName`
      );
    }
  } else if (pattern.type === 'array') {
    const hasInvalidMapping = pattern.mappings.some(
      (m: any) => !m.variableName
    );
    if (hasInvalidMapping) {
      throw new AdapterValidationError(
        `Hook ${hookName} has type 'array' but some mappings don't have variableName`
      );
    }
  }
}

/**
 * Validates a hook adapter
 */
function validateHookAdapter(hook: any, libraryName: string): void {
  if (!hook || typeof hook !== 'object') {
    throw new AdapterValidationError(
      `Library ${libraryName} has invalid hook: must be an object`
    );
  }

  // Validate hookName
  if (!hook.hookName || typeof hook.hookName !== 'string') {
    throw new AdapterValidationError(
      `Library ${libraryName} has hook with invalid or missing hookName`
    );
  }

  // Validate returnPattern
  validateReturnValuePattern(hook.returnPattern, hook.hookName);

  // Validate dataFlows if present
  if (hook.dataFlows !== undefined) {
    if (!Array.isArray(hook.dataFlows)) {
      throw new AdapterValidationError(
        `Hook ${hook.hookName} has invalid dataFlows: must be an array`
      );
    }

    hook.dataFlows.forEach((flow: any, index: number) => {
      if (!flow || typeof flow !== 'object') {
        throw new AdapterValidationError(
          `Hook ${hook.hookName} has invalid dataFlow at index ${index}: must be an object`
        );
      }
      if (!flow.from || typeof flow.from !== 'string') {
        throw new AdapterValidationError(
          `Hook ${hook.hookName} dataFlow at index ${index} has invalid or missing 'from'`
        );
      }
      if (!flow.to || typeof flow.to !== 'string') {
        throw new AdapterValidationError(
          `Hook ${hook.hookName} dataFlow at index ${index} has invalid or missing 'to'`
        );
      }
    });
  }
}

/**
 * Validates a library adapter
 */
export function validateLibraryAdapter(adapter: any): void {
  if (!adapter || typeof adapter !== 'object') {
    throw new AdapterValidationError('Adapter must be an object');
  }

  // Validate libraryName
  if (!adapter.libraryName || typeof adapter.libraryName !== 'string') {
    throw new AdapterValidationError('Adapter must have a valid libraryName string');
  }

  // Validate packagePatterns
  if (!Array.isArray(adapter.packagePatterns)) {
    throw new AdapterValidationError(
      `Library ${adapter.libraryName} has invalid packagePatterns: must be an array`
    );
  }

  if (adapter.packagePatterns.length === 0) {
    throw new AdapterValidationError(
      `Library ${adapter.libraryName} has empty packagePatterns: must have at least one pattern`
    );
  }

  adapter.packagePatterns.forEach((pattern: any, index: number) => {
    if (typeof pattern !== 'string') {
      throw new AdapterValidationError(
        `Library ${adapter.libraryName} has invalid packagePattern at index ${index}: must be a string`
      );
    }
  });

  // Validate hooks
  if (!Array.isArray(adapter.hooks)) {
    throw new AdapterValidationError(
      `Library ${adapter.libraryName} has invalid hooks: must be an array`
    );
  }

  if (adapter.hooks.length === 0) {
    throw new AdapterValidationError(
      `Library ${adapter.libraryName} has empty hooks: must have at least one hook`
    );
  }

  // Validate each hook
  adapter.hooks.forEach((hook: any) => {
    validateHookAdapter(hook, adapter.libraryName);
  });
}

/**
 * Validates a library adapter configuration
 */
export function validateLibraryAdapterConfig(config: any): void {
  if (!config || typeof config !== 'object') {
    throw new AdapterValidationError('Configuration must be an object');
  }

  if (!Array.isArray(config.libraries)) {
    throw new AdapterValidationError('Configuration must have a libraries array');
  }

  // Validate each library adapter
  config.libraries.forEach((adapter: any) => {
    validateLibraryAdapter(adapter);
  });

  // Check for duplicate library names
  const libraryNames = new Set<string>();
  config.libraries.forEach((adapter: any) => {
    if (libraryNames.has(adapter.libraryName)) {
      throw new AdapterValidationError(
        `Duplicate library name: ${adapter.libraryName}`
      );
    }
    libraryNames.add(adapter.libraryName);
  });
}

/**
 * Loads library adapters from a JSON file
 */
export function loadLibraryAdaptersFromFile(filePath: string): LibraryAdapterConfig {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(fileContent);
    
    // Validate the configuration
    validateLibraryAdapterConfig(config);
    
    return config as LibraryAdapterConfig;
  } catch (error) {
    if (error instanceof AdapterValidationError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new AdapterValidationError(
        `Invalid JSON in ${filePath}: ${error.message}`
      );
    }
    throw new AdapterValidationError(
      `Failed to load adapters from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Import the default configuration directly
import defaultAdaptersConfig from '../config/library-adapters.json' with { type: 'json' };

/**
 * Loads default library adapters from the built-in configuration
 */
export function loadDefaultLibraryAdapters(): LibraryAdapterConfig {
  // Validate the imported configuration
  validateLibraryAdapterConfig(defaultAdaptersConfig);
  return defaultAdaptersConfig as LibraryAdapterConfig;
}

/**
 * Merges user configuration with default configuration
 */
export function mergeLibraryAdapterConfigs(
  defaultConfig: LibraryAdapterConfig,
  userConfig: UserLibraryAdapterConfig
): LibraryAdapterConfig {
  const result: LibraryAdapterConfig = {
    libraries: [...defaultConfig.libraries]
  };

  // Apply disabled libraries
  if (userConfig.disabled && userConfig.disabled.length > 0) {
    const disabledSet = new Set(userConfig.disabled);
    result.libraries = result.libraries.filter(
      adapter => !disabledSet.has(adapter.libraryName)
    );
  }

  // Apply overrides
  if (userConfig.overrides) {
    Object.entries(userConfig.overrides).forEach(([libraryName, override]) => {
      const index = result.libraries.findIndex(
        adapter => adapter.libraryName === libraryName
      );
      
      if (index !== -1) {
        // Merge the override with the existing adapter
        result.libraries[index] = {
          ...result.libraries[index],
          ...override,
          // Ensure required fields are present
          libraryName: result.libraries[index].libraryName,
          packagePatterns: override.packagePatterns || result.libraries[index].packagePatterns,
          hooks: override.hooks || result.libraries[index].hooks
        };
      }
    });
  }

  // Add custom libraries
  if (userConfig.custom && userConfig.custom.length > 0) {
    // Validate custom adapters
    userConfig.custom.forEach(adapter => {
      validateLibraryAdapter(adapter);
    });
    
    result.libraries.push(...userConfig.custom);
  }

  return result;
}

/**
 * Loads library adapters with optional user configuration
 */
export function loadLibraryAdapters(
  userConfigPath?: string
): LibraryAdapterConfig {
  const defaultConfig = loadDefaultLibraryAdapters();

  if (!userConfigPath) {
    return defaultConfig;
  }

  try {
    if (!fs.existsSync(userConfigPath)) {
      return defaultConfig;
    }

    const userConfigContent = fs.readFileSync(userConfigPath, 'utf-8');
    const userConfig = JSON.parse(userConfigContent) as UserLibraryAdapterConfig;

    return mergeLibraryAdapterConfigs(defaultConfig, userConfig);
  } catch (error) {
    // Log warning but return default config
    console.warn(
      `Failed to load user configuration from ${userConfigPath}: ${error instanceof Error ? error.message : String(error)}`
    );
    return defaultConfig;
  }
}

/**
 * Adapter Registry
 * 
 * Manages registration and lookup of library adapters
 */
export class AdapterRegistry {
  private adapters: Map<string, LibraryAdapter> = new Map();
  private packageToLibrary: Map<string, string> = new Map();
  private hookLookup: Map<string, Map<string, HookAdapter>> = new Map();

  /**
   * Registers a library adapter
   */
  registerAdapter(adapter: LibraryAdapter): void {
    console.log(`📚 AdapterRegistry: Registering adapter for ${adapter.libraryName}`);
    console.log(`📚   Package patterns:`, adapter.packagePatterns);
    console.log(`📚   Hooks:`, adapter.hooks.map(h => h.hookName));
    
    // Validate the adapter
    validateLibraryAdapter(adapter);

    // Store the adapter
    this.adapters.set(adapter.libraryName, adapter);

    // Map package patterns to library name
    adapter.packagePatterns.forEach(pattern => {
      this.packageToLibrary.set(pattern, adapter.libraryName);
      console.log(`📚   Mapped package ${pattern} -> ${adapter.libraryName}`);
    });

    // Build hook lookup map for fast access
    const hookMap = new Map<string, HookAdapter>();
    adapter.hooks.forEach(hook => {
      hookMap.set(hook.hookName, hook);
      console.log(`📚   Registered hook: ${hook.hookName}`);
    });
    this.hookLookup.set(adapter.libraryName, hookMap);
    console.log(`📚 ✅ Adapter registered for ${adapter.libraryName}`);
  }

  /**
   * Registers multiple library adapters
   */
  registerAdapters(adapters: LibraryAdapter[]): void {
    console.log(`📚 AdapterRegistry: Registering ${adapters.length} adapters`);
    adapters.forEach(adapter => this.registerAdapter(adapter));
    console.log(`📚 ✅ All adapters registered`);
  }

  /**
   * Gets a library adapter by library name
   */
  getAdapter(libraryName: string): LibraryAdapter | null {
    return this.adapters.get(libraryName) || null;
  }

  /**
   * Gets a library name from a package name/pattern
   */
  getLibraryNameFromPackage(packageName: string): string | null {
    return this.packageToLibrary.get(packageName) || null;
  }

  /**
   * Gets a hook adapter by library name and hook name
   */
  getHookAdapter(libraryName: string, hookName: string): HookAdapter | null {
    const hookMap = this.hookLookup.get(libraryName);
    if (!hookMap) {
      return null;
    }
    return hookMap.get(hookName) || null;
  }

  /**
   * Gets a hook adapter by package name and hook name
   */
  getHookAdapterByPackage(packageName: string, hookName: string): HookAdapter | null {
    const libraryName = this.getLibraryNameFromPackage(packageName);
    if (!libraryName) {
      return null;
    }
    return this.getHookAdapter(libraryName, hookName);
  }

  /**
   * Checks if a library is registered
   */
  hasLibrary(libraryName: string): boolean {
    return this.adapters.has(libraryName);
  }

  /**
   * Checks if a package is registered
   */
  hasPackage(packageName: string): boolean {
    return this.packageToLibrary.has(packageName);
  }

  /**
   * Gets all registered library names
   */
  getLibraryNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Gets all registered package patterns
   */
  getPackagePatterns(): string[] {
    return Array.from(this.packageToLibrary.keys());
  }

  /**
   * Gets all hook names for a library
   */
  getHookNames(libraryName: string): string[] {
    const hookMap = this.hookLookup.get(libraryName);
    if (!hookMap) {
      return [];
    }
    return Array.from(hookMap.keys());
  }

  /**
   * Clears all registered adapters
   */
  clear(): void {
    this.adapters.clear();
    this.packageToLibrary.clear();
    this.hookLookup.clear();
  }

  /**
   * Gets the number of registered adapters
   */
  get size(): number {
    return this.adapters.size;
  }

  /**
   * Loads adapters from a configuration
   */
  loadFromConfig(config: LibraryAdapterConfig): void {
    this.registerAdapters(config.libraries);
  }

  /**
   * Loads adapters from a file
   */
  loadFromFile(filePath: string): void {
    const config = loadLibraryAdaptersFromFile(filePath);
    this.loadFromConfig(config);
  }

  /**
   * Loads default adapters
   */
  loadDefaults(): void {
    const config = loadDefaultLibraryAdapters();
    this.loadFromConfig(config);
  }

  /**
   * Loads adapters with optional user configuration
   */
  load(userConfigPath?: string): void {
    const config = loadLibraryAdapters(userConfigPath);
    this.loadFromConfig(config);
  }
}

/**
 * Creates a new adapter registry
 */
export function createAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry();
}

/**
 * Global adapter registry instance (singleton)
 */
let globalRegistry: AdapterRegistry | null = null;

/**
 * Gets the global adapter registry instance
 */
export function getGlobalAdapterRegistry(): AdapterRegistry {
  if (!globalRegistry) {
    globalRegistry = new AdapterRegistry();
  }
  return globalRegistry;
}

/**
 * Resets the global adapter registry
 */
export function resetGlobalAdapterRegistry(): void {
  globalRegistry = null;
}
