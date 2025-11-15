/**
 * Type Registry for Monaco Editor
 * 
 * Manages TypeScript type definitions for Monaco Editor, handling
 * dependency resolution and registration with Monaco's TypeScript service.
 */
import * as monaco from 'monaco-editor';
import type { TypeDefinition } from '../config/type-definitions';

/**
 * Registry for managing and loading TypeScript type definitions in Monaco Editor.
 * 
 * Handles:
 * - Loading type definitions from bundled sources
 * - Resolving and ordering dependencies using topological sort
 * - Registering types with Monaco's TypeScript language service
 * - Preventing duplicate registrations
 * 
 * @example
 * ```typescript
 * const registry = new MonacoTypeRegistry(typeDefinitions);
 * registry.initialize();
 * console.log('Registered:', registry.getRegisteredLibraries());
 * ```
 */
export class MonacoTypeRegistry {
  /** Set of library names that have been successfully registered */
  private registered: Set<string> = new Set();
  
  /** Array of type definitions to manage */
  private definitions: TypeDefinition[];
  
  /**
   * Creates a new type registry instance.
   * 
   * @param definitions - Array of type definitions to manage
   */
  constructor(definitions: TypeDefinition[]) {
    this.definitions = definitions;
  }
  
  /**
   * Initialize the registry and register all type definitions with Monaco.
   * 
   * Performs topological sort to ensure dependencies are loaded in the correct order,
   * then registers each definition with Monaco's TypeScript service.
   * 
   * @throws {Error} If circular dependencies are detected
   */
  initialize(): void {
    const startTime = performance.now();
    
    try {
      // Sort definitions by dependencies (topological sort)
      const sorted = this.topologicalSort(this.definitions);
      
      console.log(`[Type Registry] Registering ${sorted.length} type definitions...`);
      
      // Register each definition in dependency order
      for (const def of sorted) {
        this.registerType(def);
      }
      
      const endTime = performance.now();
      console.log(`[Type Registry] Registration completed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('[Type Registry] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Register a single type definition with Monaco.
   * 
   * Ensures dependencies are registered first, then adds the type definition
   * to Monaco's TypeScript language service. Prevents duplicate registrations.
   * 
   * @param definition - The type definition to register
   */
  registerType(definition: TypeDefinition): void {
    // Skip if already registered
    if (this.registered.has(definition.name)) {
      return;
    }
    
    // Register dependencies first
    for (const depName of definition.dependencies) {
      const depDef = this.definitions.find(d => d.name === depName);
      if (depDef && !this.registered.has(depName)) {
        this.registerType(depDef);
      }
    }
    
    try {
      const startTime = performance.now();
      
      // Register with Monaco's TypeScript service
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        definition.content,
        definition.virtualPath
      );
      
      // Mark as registered
      this.registered.add(definition.name);
      
      const endTime = performance.now();
      console.log(`[Type Registry] Registered ${definition.name} (${(endTime - startTime).toFixed(2)}ms)`);
    } catch (error) {
      console.error(`[Type Registry] Failed to register ${definition.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Register all type definitions with Monaco.
   * 
   * Convenience method that calls initialize(). Useful for explicit registration
   * after construction.
   */
  registerAll(): void {
    this.initialize();
  }
  
  /**
   * Check if a library has been registered.
   * 
   * @param libraryName - The name of the library to check
   * @returns True if the library is registered, false otherwise
   */
  isRegistered(libraryName: string): boolean {
    return this.registered.has(libraryName);
  }
  
  /**
   * Get a list of all registered library names.
   * 
   * @returns Array of registered library names
   */
  getRegisteredLibraries(): string[] {
    return Array.from(this.registered);
  }
  
  /**
   * Get the type definitions managed by this registry.
   * 
   * @returns Array of type definitions
   */
  getDefinitions(): TypeDefinition[] {
    return this.definitions;
  }
  
  /**
   * Perform topological sort on type definitions based on dependencies.
   * 
   * Ensures that dependencies are ordered before their dependents, allowing
   * for correct registration order with Monaco.
   * 
   * @param definitions - Array of type definitions to sort
   * @returns Sorted array of type definitions
   * @throws {Error} If circular dependencies are detected
   * 
   * @private
   */
  private topologicalSort(definitions: TypeDefinition[]): TypeDefinition[] {
    const sorted: TypeDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (def: TypeDefinition): void => {
      // Check for circular dependencies
      if (visiting.has(def.name)) {
        throw new Error(`Circular dependency detected involving ${def.name}`);
      }
      
      // Skip if already visited
      if (visited.has(def.name)) {
        return;
      }
      
      // Mark as currently visiting
      visiting.add(def.name);
      
      // Visit dependencies first
      for (const depName of def.dependencies) {
        const depDef = definitions.find(d => d.name === depName);
        if (depDef) {
          visit(depDef);
        } else {
          console.warn(`Dependency ${depName} not found for ${def.name}`);
        }
      }
      
      // Mark as visited and remove from visiting
      visiting.delete(def.name);
      visited.add(def.name);
      
      // Add to sorted list
      sorted.push(def);
    };
    
    // Visit all definitions
    for (const def of definitions) {
      if (!visited.has(def.name)) {
        visit(def);
      }
    }
    
    return sorted;
  }
}
