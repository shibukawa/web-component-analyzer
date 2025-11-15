/**
 * Third-Party Library Integration Registry
 * 
 * Central registry for all third-party library handlers
 */

import { LibraryHookHandler } from './swr.js';
import { SWRHookHandler } from './swr.js';
import { NextJSHookHandler } from './next.js';

/**
 * Registry of all library hook handlers
 */
export class LibraryHandlerRegistry {
  private handlers: LibraryHookHandler[] = [];
  private nextJSHandler: NextJSHookHandler | null = null;

  constructor() {
    // Register all handlers
    this.registerHandler(new SWRHookHandler());
    
    // Keep reference to Next.js handler for reset
    this.nextJSHandler = new NextJSHookHandler();
    this.registerHandler(this.nextJSHandler);
  }

  /**
   * Register a new library hook handler
   */
  registerHandler(handler: LibraryHookHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Find a handler for the given hook
   */
  findHandler(hookName: string, libraryName: string): LibraryHookHandler | null {
    for (const handler of this.handlers) {
      if (handler.shouldHandle(hookName, libraryName)) {
        return handler;
      }
    }
    return null;
  }

  /**
   * Reset stateful handlers (e.g., Next.js handler that shares URL nodes)
   */
  reset(): void {
    if (this.nextJSHandler) {
      this.nextJSHandler.reset();
    }
  }
}

/**
 * Global registry instance
 */
let globalRegistry: LibraryHandlerRegistry | null = null;

/**
 * Get the global library handler registry
 */
export function getLibraryHandlerRegistry(): LibraryHandlerRegistry {
  if (!globalRegistry) {
    globalRegistry = new LibraryHandlerRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry
 */
export function resetLibraryHandlerRegistry(): void {
  if (globalRegistry) {
    globalRegistry.reset();
  }
}
