/**
 * Svelte Store Library Processor
 * 
 * Handles Svelte store imports and usage:
 * - writable: Create writable stores (input/output)
 * - readable: Create readable stores (input only)
 * - derived: Create derived stores (computed from other stores)
 * - get: Get store value synchronously
 * 
 * This processor creates:
 * - Data Store nodes for store creation
 * - External Entity Input nodes for store subscriptions
 * - Appropriate data flows for store updates
 * 
 * Example:
 * ```svelte
 * import { writable, derived } from 'svelte/store';
 * 
 * const count = writable(0);
 * const doubled = derived(count, $count => $count * 2);
 * 
 * // Auto-subscription
 * $count; // Subscribes to count store
 * ```
 * 
 * Results in:
 * - Data Store node for count (writable)
 * - Data Store node for doubled (derived)
 * - Edge from count to doubled (dependency)
 */

import {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo,
  DFDNode,
  DFDEdge
} from '../parser/types';

/**
 * Svelte store library processor
 * Handles writable, readable, derived, and get from svelte/store
 */
export class SvelteStoreLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'svelte-store',
    libraryName: 'svelte/store',
    packagePatterns: ['svelte'],
    hookNames: ['writable', 'readable', 'derived', 'get'],
    priority: 50, // Same as other library processors
    description: 'Svelte store library processor for writable, readable, derived, and get'
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    const { logger } = context;

    // Check if hook name matches
    const matchesPattern = this.metadata.hookNames.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(hook.hookName);
      }
      return pattern === hook.hookName;
    });

    if (!matchesPattern) {
      logger.debug(`Hook ${hook.hookName} does not match Svelte store pattern`);
      return false;
    }

    // Note: In the current implementation, Svelte stores are detected by the
    // SvelteStoreAnalyzer, not the hooks analyzer. This processor is here for
    // completeness and future extensibility, but may not be actively used.
    logger.debug(`Hook ${hook.hookName} will be handled by Svelte store processor`);
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific handler based on hook name
    if (hook.hookName === 'writable') {
      return this.processWritable(hook, context);
    } else if (hook.hookName === 'readable') {
      return this.processReadable(hook, context);
    } else if (hook.hookName === 'derived') {
      return this.processDerived(hook, context);
    } else if (hook.hookName === 'get') {
      return this.processGet(hook, context);
    }

    logger.warn(`Unknown Svelte store function: ${hook.hookName}`);
    return { nodes: [], edges: [], handled: false };
  }

  /**
   * Process writable() store creation
   * Creates a data store node for the writable store
   */
  private processWritable(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create data store node for each writable store
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('svelte_store');
      
      const node: DFDNode = {
        id: nodeId,
        label: variable,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'svelte-store-writable',
          hookName: hook.hookName,
          libraryName: 'svelte/store',
          svelteStoreType: 'writable',
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process readable() store creation
   * Creates a data store node for the readable store
   */
  private processReadable(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create data store node for each readable store
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('svelte_store');
      
      const node: DFDNode = {
        id: nodeId,
        label: variable,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'svelte-store-readable',
          hookName: hook.hookName,
          libraryName: 'svelte/store',
          svelteStoreType: 'readable',
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process derived() store creation
   * Creates a data store node for the derived store
   * Note: Dependencies are handled by the store analyzer
   */
  private processDerived(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create data store node for each derived store
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('svelte_store');
      
      const node: DFDNode = {
        id: nodeId,
        label: variable,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'svelte-store-derived',
          hookName: hook.hookName,
          libraryName: 'svelte/store',
          svelteStoreType: 'derived',
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process get() function
   * Creates an external entity input node for synchronous store access
   */
  private processGet(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // get() is typically used to read a store value synchronously
    // We create an input node for the value being read
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('store_get');
      
      const node: DFDNode = {
        id: nodeId,
        label: variable,
        type: 'external-entity-input',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'svelte-store-get',
          hookName: hook.hookName,
          libraryName: 'svelte/store',
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }
}
