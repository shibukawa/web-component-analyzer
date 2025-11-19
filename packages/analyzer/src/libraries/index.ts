/**
 * Library Processors Module
 * 
 * Central registry and exports for all library hook processors.
 * This module provides a unified interface for registering and accessing
 * hook processors for React, third-party libraries, and custom hooks.
 */

import { ProcessorRegistry } from './registry.js';
import { ReactLibraryProcessor } from './react.js';
import { SWRLibraryProcessor } from './swr.js';
import { NextJSLibraryProcessor } from './next.js';
import { TanStackQueryLibraryProcessor } from './tanstack-query.js';
import { ReactRouterLibraryProcessor } from './react-router.js';
import { TanStackRouterLibraryProcessor } from './tanstack-router.js';
import { ReactHookFormLibraryProcessor } from './react-hook-form.js';
import { JotaiLibraryProcessor } from './jotai.js';
import { MobXLibraryProcessor } from './mobx.js';
import { ApolloClientLibraryProcessor } from './apollo.js';
import { ZustandLibraryProcessor } from './zustand.js';
import { CustomHookProcessor } from './custom-hook.js';

/**
 * Global processor registry instance
 */
let globalRegistry: ProcessorRegistry | null = null;

/**
 * Get the global processor registry
 * Creates a new registry if one doesn't exist
 */
export function getProcessorRegistry(): ProcessorRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProcessorRegistry();
    // Register default processors
    registerDefaultProcessors(globalRegistry);
  }
  return globalRegistry;
}

/**
 * Reset the global processor registry
 * Useful for testing and when starting fresh component analysis
 */
export function resetProcessorRegistry(): void {
  if (globalRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}

/**
 * Register default processors
 * Registers React and third-party library processors
 */
function registerDefaultProcessors(registry: ProcessorRegistry): void {
  // Register React processors
  registry.register(new ReactLibraryProcessor());
  
  // Register third-party library processors
  registry.register(new SWRLibraryProcessor());
  registry.register(new NextJSLibraryProcessor());
  registry.register(new TanStackQueryLibraryProcessor());
  registry.register(new ReactRouterLibraryProcessor());
  registry.register(new TanStackRouterLibraryProcessor());
  registry.register(new ReactHookFormLibraryProcessor());
  registry.register(new JotaiLibraryProcessor());
  registry.register(new MobXLibraryProcessor());
  registry.register(new ApolloClientLibraryProcessor());
  registry.register(new ZustandLibraryProcessor());
  
  // Register custom hook processor (lowest priority - fallback)
  // This handles all user-defined hooks
  registry.register(new CustomHookProcessor());
}

// Re-export types, registry, and processors
export { ProcessorRegistry } from './registry.js';
export { ReactLibraryProcessor } from './react.js';
export { SWRLibraryProcessor } from './swr.js';
export { NextJSLibraryProcessor } from './next.js';
export { TanStackQueryLibraryProcessor } from './tanstack-query.js';
export { ReactRouterLibraryProcessor } from './react-router.js';
export { TanStackRouterLibraryProcessor } from './tanstack-router.js';
export { ReactHookFormLibraryProcessor } from './react-hook-form.js';
export { JotaiLibraryProcessor } from './jotai.js';
export { MobXLibraryProcessor } from './mobx.js';
export { ApolloClientLibraryProcessor } from './apollo.js';
export { ZustandLibraryProcessor } from './zustand.js';
export { CustomHookProcessor } from './custom-hook.js';
export type {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult,
  ProcessorLogger,
} from './types.js';
export { processHookWithSubgraphs, looksLikeAction } from './helpers.js';
