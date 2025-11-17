/**
 * Processor Registry
 * 
 * Central registry for managing and dispatching to hook processors.
 * Implements efficient two-phase lookup:
 * - Phase 1: O(1) exact match lookup for known hook names
 * - Phase 2: O(n) regex pattern matching for custom hooks
 */

import { HookProcessor, ProcessorContext } from './types';
import { HookInfo } from '../parser/types';

/**
 * Registry for hook processors
 * Manages processor registration, lookup, and dispatching
 */
export class ProcessorRegistry {
  /** All registered processors, sorted by priority (highest first) */
  private processors: HookProcessor[] = [];
  
  /** Index of processors by library name for O(1) library lookup */
  private processorsByLibrary: Map<string, HookProcessor[]> = new Map();
  
  /** Index of processors by exact hook name for O(1) exact match lookup */
  private processorsByHook: Map<string, HookProcessor[]> = new Map();
  
  /**
   * Register a processor
   * Processors are indexed by priority, library name, and exact hook names
   * 
   * @param processor - The processor to register
   */
  register(processor: HookProcessor): void {
    // Add to main list
    this.processors.push(processor);
    
    // Sort by priority (higher first) to ensure correct fallback order
    this.processors.sort((a, b) => b.metadata.priority - a.metadata.priority);
    
    // Index by library name for efficient library-specific lookups
    const libraryProcessors = this.processorsByLibrary.get(processor.metadata.libraryName) || [];
    libraryProcessors.push(processor);
    libraryProcessors.sort((a, b) => b.metadata.priority - a.metadata.priority);
    this.processorsByLibrary.set(processor.metadata.libraryName, libraryProcessors);
    
    // Index by exact hook names (not regex patterns) for O(1) lookup
    for (const hookName of processor.metadata.hookNames) {
      if (typeof hookName === 'string') {
        const hookProcessors = this.processorsByHook.get(hookName) || [];
        hookProcessors.push(processor);
        hookProcessors.sort((a, b) => b.metadata.priority - a.metadata.priority);
        this.processorsByHook.set(hookName, hookProcessors);
      }
    }
  }
  
  /**
   * Find the best processor for a hook
   * Uses two-phase lookup:
   * 1. Try exact match first (O(1) lookup)
   * 2. Fall back to regex patterns (O(n) but only for unmatched hooks)
   * 
   * @param hook - Hook information
   * @param context - Processing context
   * @returns The best matching processor, or null if none found
   */
  findProcessor(hook: HookInfo, context: ProcessorContext): HookProcessor | null {
    // Phase 1: Try exact match first (O(1) lookup)
    const exactMatches = this.processorsByHook.get(hook.hookName);
    if (exactMatches) {
      for (const processor of exactMatches) {
        if (processor.shouldHandle(hook, context)) {
          return processor;
        }
      }
    }
    
    // Phase 2: Try regex patterns (O(n) but only for unmatched hooks)
    // Processors are already sorted by priority
    for (const processor of this.processors) {
      // Skip if already checked in exact match phase
      if (exactMatches?.includes(processor)) {
        continue;
      }
      
      if (processor.shouldHandle(hook, context)) {
        return processor;
      }
    }
    
    return null;
  }
  
  /**
   * Get all processors for a library
   * Useful for debugging and introspection
   * 
   * @param libraryName - Library name (e.g., 'react', 'swr')
   * @returns Array of processors for the library, sorted by priority
   */
  getProcessorsForLibrary(libraryName: string): HookProcessor[] {
    return this.processorsByLibrary.get(libraryName) || [];
  }
  
  /**
   * Get all registered processors
   * Returns processors sorted by priority (highest first)
   * 
   * @returns Array of all registered processors
   */
  getAllProcessors(): HookProcessor[] {
    return [...this.processors];
  }
  
  /**
   * Check if a processor is registered
   * 
   * @param processorId - Processor ID to check
   * @returns true if processor is registered
   */
  hasProcessor(processorId: string): boolean {
    return this.processors.some(p => p.metadata.id === processorId);
  }
  
  /**
   * Get a processor by ID
   * 
   * @param processorId - Processor ID
   * @returns The processor, or undefined if not found
   */
  getProcessor(processorId: string): HookProcessor | undefined {
    return this.processors.find(p => p.metadata.id === processorId);
  }
  
  /**
   * Clear all processors
   * Useful for testing and resetting the registry
   */
  clear(): void {
    this.processors = [];
    this.processorsByLibrary.clear();
    this.processorsByHook.clear();
  }
  
  /**
   * Reset all processors that have a reset method
   * Call this when starting a new component analysis to reset processor state
   */
  reset(): void {
    for (const processor of this.processors) {
      if ('reset' in processor && typeof (processor as any).reset === 'function') {
        (processor as any).reset();
      }
    }
  }
  
  /**
   * Get the number of registered processors
   * 
   * @returns Number of registered processors
   */
  get size(): number {
    return this.processors.length;
  }
}

/**
 * Global processor registry instance
 * Can be used throughout the application
 */
export const globalRegistry = new ProcessorRegistry();
