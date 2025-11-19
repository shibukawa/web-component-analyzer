/**
 * Zustand Library Processor
 * 
 * Handles Zustand store hooks with a single data-store pattern.
 * 
 * Zustand stores are detected by:
 * - Hook name matches useXxxStore pattern
 * - Import from 'zustand' package
 * 
 * Processing strategy:
 * - Creates a single data-store node for the entire store
 * - State properties are accessed via data flows (not separate nodes)
 * - Action properties create reverse edges from JSX elements to the store node
 * 
 * Example:
 * ```tsx
 * const { count, increment } = useCountStore();
 * <button onClick={increment}>Count: {count}</button>
 * ```
 * 
 * Results in:
 * - Single "useCountStore" data-store node
 * - Data flow from useCountStore to button for count display
 * - Reverse edge from button to useCountStore for increment action
 */

import {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo,
  DFDNode
} from '../parser/types';
import { looksLikeAction } from './helpers';

/**
 * Zustand library processor
 * Creates single data-store nodes for Zustand stores
 */
export class ZustandLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'zustand',
    libraryName: 'zustand',
    packagePatterns: ['zustand'],
    hookNames: [/^use\w*Store$/], // Matches useXxxStore pattern
    priority: 80, // Higher than custom hooks, lower than specific libraries
    description: 'Zustand state management library processor',
    mergeable: true // Multiple selector calls should be merged into one node
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    const { logger } = context;

    // Check if hook name matches the pattern (useXxxStore)
    const matchesPattern = this.metadata.hookNames.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(hook.hookName);
      }
      return pattern === hook.hookName;
    });

    if (!matchesPattern) {
      logger.debug(`Hook ${hook.hookName} does not match Zustand pattern`);
      return false;
    }

    // Check if this hook has a category - if it does, it's handled by another processor
    if (hook.category) {
      logger.debug(`Hook ${hook.hookName} has category ${hook.category}, skipping Zustand processor`);
      return false;
    }

    logger.debug(`Hook ${hook.hookName} will be handled by Zustand processor`);
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    logger.start(hook.hookName, hook);

    // Separate data properties from action properties
    const dataProperties: string[] = [];
    const actionProperties: string[] = [];

    // For Zustand stores, we always use heuristic-based classification
    // because TypeScript type information is not reliable for destructured properties
    // from Zustand stores (they're all typed as the store interface properties)
    for (const variable of hook.variables) {
      if (looksLikeAction(variable)) {
        actionProperties.push(variable);
      } else {
        dataProperties.push(variable);
      }
    }

    logger.debug(`Data properties: ${dataProperties.join(', ')}`);
    logger.debug(`Action properties: ${actionProperties.join(', ')}`);

    // Create single data-store node for the Zustand store
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
        libraryName: 'zustand',
        isLibraryHook: true,
        properties: [...dataProperties, ...actionProperties],
        dataProperties,
        processProperties: actionProperties, // Use processProperties for DFD Builder compatibility
        line: hook.line,
        column: hook.column
      }
    };

    logger.node('created', node);
    logger.complete({ nodes: [node], edges: [], handled: true });

    return {
      nodes: [node],
      edges: [],
      handled: true
    };
  }
}
