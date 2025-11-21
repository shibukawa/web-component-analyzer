/**
 * SvelteKit Library Processor
 * 
 * Handles SvelteKit-specific imports and patterns:
 * - $app/stores: page, navigating, updated stores
 * - $app/navigation: goto, beforeNavigate, afterNavigate
 * 
 * This processor creates:
 * - External Entity Input nodes for $page, $navigating, $updated stores
 * - Process nodes for goto() navigation function
 * - Process nodes for beforeNavigate and afterNavigate lifecycle hooks
 * - Appropriate data flows for navigation and routing
 * 
 * Example:
 * ```svelte
 * <script>
 *   import { page } from '$app/stores';
 *   import { goto } from '$app/navigation';
 *   
 *   // Access page data
 *   $page.params.id;
 *   $page.url.searchParams;
 *   
 *   // Navigate
 *   function handleClick() {
 *     goto('/dashboard');
 *   }
 * </script>
 * ```
 * 
 * Results in:
 * - External Entity Input node for $page store
 * - Process node for goto function
 * - Data flows from $page to consuming code
 * - Data flows from goto to URL: Output
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
 * SvelteKit library processor
 * Handles $app/stores and $app/navigation imports
 */
export class SvelteKitLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'sveltekit',
    libraryName: 'sveltekit',
    packagePatterns: ['$app/stores', '$app/navigation'],
    hookNames: ['page', 'navigating', 'updated', 'goto', 'beforeNavigate', 'afterNavigate'],
    priority: 50, // Same as other library processors
    description: 'SvelteKit routing and navigation processor'
  };

  /**
   * Shared URL node IDs for singleton pattern
   * These are reset when processing a new component
   */
  private urlInputNodeId: string | null = null;
  private urlOutputNodeId: string | null = null;

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
      logger.debug(`Hook ${hook.hookName} does not match SvelteKit pattern`);
      return false;
    }

    // Check if this is from a SvelteKit import
    const enrichedHook = hook as any;
    const isSvelteKitImport = 
      enrichedHook.source === '$app/stores' ||
      enrichedHook.source === '$app/navigation' ||
      enrichedHook.libraryName === 'sveltekit';

    if (!isSvelteKitImport) {
      logger.debug(`Hook ${hook.hookName} is not from SvelteKit`);
      return false;
    }

    logger.debug(`Hook ${hook.hookName} will be handled by SvelteKit processor`);
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific handler based on hook name
    if (hook.hookName === 'page') {
      return this.processPageStore(hook, context);
    } else if (hook.hookName === 'navigating') {
      return this.processNavigatingStore(hook, context);
    } else if (hook.hookName === 'updated') {
      return this.processUpdatedStore(hook, context);
    } else if (hook.hookName === 'goto') {
      return this.processGoto(hook, context);
    } else if (hook.hookName === 'beforeNavigate' || hook.hookName === 'afterNavigate') {
      return this.processNavigationHook(hook, context);
    }

    logger.warn(`Unknown SvelteKit function: ${hook.hookName}`);
    return { nodes: [], edges: [], handled: false };
  }

  /**
   * Process $page store
   * Creates a data store node for page data
   */
  private processPageStore(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create or reuse URL: Input node
    if (!this.urlInputNodeId) {
      this.urlInputNodeId = generateNodeId('url_input');
      const urlInputNode: DFDNode = {
        id: this.urlInputNodeId,
        label: 'URL: Input',
        type: 'external-entity-input',
        metadata: {
          category: 'external-entity',
          isURLInput: true
        }
      };
      nodes.push(urlInputNode);
      logger.node('created', urlInputNode);
    } else {
      logger.debug(`Reusing existing URL: Input node: ${this.urlInputNodeId}`);
    }

    // Create data store node for $page store
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('svelte_store');
      
      const node: DFDNode = {
        id: nodeId,
        label: 'page',
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'svelte-store',
          hookName: hook.hookName,
          libraryName: 'sveltekit',
          storeName: 'page',
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);

      // Create edge from URL: Input to page store
      const edge: DFDEdge = {
        from: this.urlInputNodeId,
        to: nodeId,
        label: 'provides'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process $navigating store
   * Creates an external entity input node for navigation state
   */
  private processNavigatingStore(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create external entity input node for $navigating store
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('sveltekit_navigating');
      
      const node: DFDNode = {
        id: nodeId,
        label: '$navigating',
        type: 'external-entity-input',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'sveltekit-store',
          hookName: hook.hookName,
          libraryName: 'sveltekit',
          storeName: 'navigating',
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
   * Process $updated store
   * Creates an external entity input node for update state
   */
  private processUpdatedStore(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create external entity input node for $updated store
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('sveltekit_updated');
      
      const node: DFDNode = {
        id: nodeId,
        label: '$updated',
        type: 'external-entity-input',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'sveltekit-store',
          hookName: hook.hookName,
          libraryName: 'sveltekit',
          storeName: 'updated',
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
   * Process goto() function
   * Creates a process node for navigation and URL: Output node
   */
  private processGoto(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create process node for goto function
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('process');
      
      const node: DFDNode = {
        id: nodeId,
        label: 'goto',
        type: 'process',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'sveltekit-navigation',
          hookName: hook.hookName,
          libraryName: 'sveltekit',
          functionName: 'goto',
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);

      // Create or reuse URL: Output node
      if (!this.urlOutputNodeId) {
        this.urlOutputNodeId = generateNodeId('url_output');
        const urlOutputNode: DFDNode = {
          id: this.urlOutputNodeId,
          label: 'URL: Output',
          type: 'external-entity-output',
          metadata: {
            category: 'external-entity',
            isURLOutput: true
          }
        };
        nodes.push(urlOutputNode);
        logger.node('created', urlOutputNode);
      } else {
        logger.debug(`Reusing existing URL: Output node: ${this.urlOutputNodeId}`);
      }

      // Create edge from goto to URL: Output
      const edge: DFDEdge = {
        from: nodeId,
        to: this.urlOutputNodeId,
        label: 'navigates'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process beforeNavigate and afterNavigate hooks
   * Creates process nodes for navigation lifecycle hooks
   */
  private processNavigationHook(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create process node for navigation hook
    const nodeId = generateNodeId('process');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'lifecycle',
        hookName: hook.hookName,
        libraryName: 'sveltekit',
        isNavigationHook: true,
        isSvelteKitLifecycle: true,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create or reuse URL: Input node (navigation hooks receive navigation info)
    if (!this.urlInputNodeId) {
      this.urlInputNodeId = generateNodeId('url_input');
      const urlInputNode: DFDNode = {
        id: this.urlInputNodeId,
        label: 'URL: Input',
        type: 'external-entity-input',
        metadata: {
          category: 'external-entity',
          isURLInput: true
        }
      };
      nodes.push(urlInputNode);
      logger.node('created', urlInputNode);
    } else {
      logger.debug(`Reusing existing URL: Input node: ${this.urlInputNodeId}`);
    }

    // Create edge from URL: Input to navigation hook
    const edge: DFDEdge = {
      from: this.urlInputNodeId,
      to: nodeId,
      label: 'triggers'
    };
    edges.push(edge);
    logger.edge('created', edge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Reset the shared URL node IDs
   * Call this when starting a new component analysis
   */
  reset(): void {
    this.urlInputNodeId = null;
    this.urlOutputNodeId = null;
  }
}
