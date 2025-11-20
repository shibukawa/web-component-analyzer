/**
 * Pinia Library Processor
 * 
 * Handles Pinia store composables for Vue 3:
 * - useXxxStore: Access Pinia store (state, getters, actions)
 * - storeToRefs: Convert store state to reactive refs
 * 
 * This processor creates:
 * - External Entity Input nodes for store state properties
 * - External Entity Input nodes for store getters (with type "computed")
 * - Process nodes for store action calls
 * - Data flows for storeToRefs conversions
 * 
 * Example:
 * ```vue
 * const store = useCounterStore();
 * const { count, doubleCount } = storeToRefs(store);
 * store.increment();
 * ```
 * 
 * Results in:
 * - External Entity Input node for useCounterStore
 * - Data flows from store to local refs (count, doubleCount)
 * - Process node for increment action
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
import { looksLikeAction } from './helpers';

/**
 * Pinia library processor
 * Handles Pinia store composables for Vue 3
 */
export class PiniaLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'pinia',
    libraryName: 'pinia',
    packagePatterns: ['pinia'],
    hookNames: [/^use\w+Store$/, 'storeToRefs'],
    priority: 95, // Higher than Vue core processor to handle Pinia stores specifically
    description: 'Pinia state management library processor for Vue 3',
    mergeable: false // Each store instance should be separate
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    const { logger } = context;

    // Check if hook name matches the pattern (useXxxStore or storeToRefs)
    const matchesPattern = this.metadata.hookNames.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(hook.hookName);
      }
      return pattern === hook.hookName;
    });

    if (!matchesPattern) {
      logger.debug(`Hook ${hook.hookName} does not match Pinia pattern`);
      return false;
    }

    // Accept hooks with state-management category or no category
    // This allows Pinia stores to be detected even when categorized by the composables analyzer
    if (hook.category && hook.category !== 'state-management' && hook.category !== 'state') {
      logger.debug(`Hook ${hook.hookName} has incompatible category ${hook.category}, skipping Pinia processor`);
      return false;
    }

    logger.debug(`Hook ${hook.hookName} will be handled by Pinia processor`);
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific handler based on hook name
    if (hook.hookName === 'storeToRefs') {
      return this.processStoreToRefs(hook, context);
    } else if (/^use\w+Store$/.test(hook.hookName)) {
      return this.processUseStore(hook, context);
    }

    logger.warn(`Unknown Pinia composable: ${hook.hookName}`);
    return { nodes: [], edges: [], handled: false };
  }

  /**
   * Process useXxxStore composable
   * Creates an external entity input node for store access
   */
  private processUseStore(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Separate data properties (state/getters) from action properties
    const dataProperties: string[] = [];
    const actionProperties: string[] = [];
    const propertyMetadata: Record<string, any> = {};

    // Classify variables using heuristic-based approach
    // State and getters are data, actions are processes
    for (const variable of hook.variables) {
      if (looksLikeAction(variable)) {
        actionProperties.push(variable);
        propertyMetadata[variable] = {
          dfdElementType: 'process',
          isAction: true
        };
      } else {
        dataProperties.push(variable);
        propertyMetadata[variable] = {
          dfdElementType: 'external-entity-input',
          isStateOrGetter: true
        };
      }
    }

    logger.debug(`Data properties (state/getters): ${dataProperties.join(', ')}`);
    logger.debug(`Action properties: ${actionProperties.join(', ')}`);

    // Create consolidated library-hook node for the store (data-store for Pinia stores)
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'pinia',
        isLibraryHook: true,
        isPiniaStore: true,
        properties: [...dataProperties, ...actionProperties],
        dataProperties,
        processProperties: actionProperties,
        propertyMetadata,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process storeToRefs composable
   * storeToRefs is a utility that extracts refs from a store, but we don't need to visualize it
   * as a separate node. The store properties will be displayed directly from the store node.
   */
  private processStoreToRefs(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // storeToRefs is a utility function that doesn't need visualization
    // The properties extracted from storeToRefs will be displayed directly from the store node
    logger.debug('storeToRefs detected but not creating nodes (properties will be displayed from store)');

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }
}
