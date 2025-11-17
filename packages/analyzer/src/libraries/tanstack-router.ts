/**
 * TanStack Router Library Processor
 * 
 * Handles TanStack Router navigation hooks:
 * - useRouter: Router object with navigation methods (output)
 * - useRouterState: Current router state access (input)
 * - useSearch: URL search parameters access (input)
 * - useParams: Dynamic route parameters access (input)
 * - useNavigate: Navigation function (output)
 * - useLocation: Current location object (input)
 * 
 * This processor implements URL node sharing logic where:
 * - Input hooks (useRouterState, useSearch, useParams, useLocation) share a single "URL: Input" node
 * - Output hooks (useRouter, useNavigate) share a single "URL: Output" node
 * - URL nodes are reset when processing a new component
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
 * TanStack Router library processor
 * Handles useRouter, useRouterState, useSearch, useParams, useNavigate, and useLocation hooks
 */
export class TanStackRouterLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'tanstack-router',
    libraryName: '@tanstack/react-router',
    packagePatterns: ['@tanstack/react-router'],
    hookNames: ['useRouter', 'useRouterState', 'useSearch', 'useParams', 'useNavigate', 'useLocation'],
    priority: 50, // Medium priority for third-party libraries
    description: 'TanStack Router navigation hooks processor'
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
    // Check if hook is from TanStack Router library
    const enrichedHook = hook as any;
    return (
      enrichedHook.libraryName === '@tanstack/react-router' &&
      this.metadata.hookNames.includes(hook.hookName)
    );
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific hook handlers
    switch (hook.hookName) {
      case 'useRouter':
        return this.processUseRouter(hook, context);
      case 'useRouterState':
        return this.processUseRouterState(hook, context);
      case 'useSearch':
        return this.processUseSearch(hook, context);
      case 'useParams':
        return this.processUseParams(hook, context);
      case 'useNavigate':
        return this.processUseNavigate(hook, context);
      case 'useLocation':
        return this.processUseLocation(hook, context);
      default:
        logger.warn(`Unknown TanStack Router hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useRouter hook
   * Creates a process node for the router object and connects to URL: Output
   */
  private processUseRouter(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create the hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: '@tanstack/react-router',
        isLibraryHook: true,
        isTanStackRouterHook: true,
        variables: hook.variables,
        processProperties: hook.variables, // useRouter returns an object with methods
        dataProperties: [],
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

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

    // Create edge from URL: Input to hook
    const inputEdge: DFDEdge = {
      from: this.urlInputNodeId,
      to: nodeId,
      label: 'provides'
    };
    edges.push(inputEdge);
    logger.edge('created', inputEdge);

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

    // Create edge from hook to URL: Output
    const outputEdge: DFDEdge = {
      from: nodeId,
      to: this.urlOutputNodeId,
      label: 'navigates'
    };
    edges.push(outputEdge);
    logger.edge('created', outputEdge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useRouterState hook
   * Creates a process node for router state and connects from URL: Input
   */
  private processUseRouterState(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create the hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: '@tanstack/react-router',
        isLibraryHook: true,
        isTanStackRouterHook: true,
        variables: hook.variables,
        dataProperties: hook.variables, // useRouterState returns state data
        processProperties: [],
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

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

    // Create edge from URL: Input to hook
    const edge: DFDEdge = {
      from: this.urlInputNodeId,
      to: nodeId,
      label: 'provides'
    };
    edges.push(edge);
    logger.edge('created', edge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useSearch hook
   * Creates a process node for search parameters and connects from URL: Input
   */
  private processUseSearch(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create the hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: '@tanstack/react-router',
        isLibraryHook: true,
        isTanStackRouterHook: true,
        variables: hook.variables,
        dataProperties: hook.variables, // useSearch returns search parameters
        processProperties: [],
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

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

    // Create edge from URL: Input to hook
    const edge: DFDEdge = {
      from: this.urlInputNodeId,
      to: nodeId,
      label: 'provides'
    };
    edges.push(edge);
    logger.edge('created', edge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useParams hook
   * Creates a process node for route parameters and connects from URL: Input
   */
  private processUseParams(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create the hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: '@tanstack/react-router',
        isLibraryHook: true,
        isTanStackRouterHook: true,
        variables: hook.variables,
        dataProperties: hook.variables, // useParams returns route parameters
        processProperties: [],
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

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

    // Create edge from URL: Input to hook
    const edge: DFDEdge = {
      from: this.urlInputNodeId,
      to: nodeId,
      label: 'provides'
    };
    edges.push(edge);
    logger.edge('created', edge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useNavigate hook
   * Creates a process node for the navigate function and connects to URL: Output
   */
  private processUseNavigate(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create the hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: '@tanstack/react-router',
        isLibraryHook: true,
        isTanStackRouterHook: true,
        variables: hook.variables,
        processProperties: hook.variables, // useNavigate returns a navigate function
        dataProperties: [],
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

    // Create edge from hook to URL: Output
    const edge: DFDEdge = {
      from: nodeId,
      to: this.urlOutputNodeId,
      label: 'navigates'
    };
    edges.push(edge);
    logger.edge('created', edge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useLocation hook
   * Creates a process node for location object and connects from URL: Input
   */
  private processUseLocation(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create the hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: '@tanstack/react-router',
        isLibraryHook: true,
        isTanStackRouterHook: true,
        variables: hook.variables,
        dataProperties: hook.variables, // useLocation returns location data
        processProperties: [],
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

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

    // Create edge from URL: Input to hook
    const edge: DFDEdge = {
      from: this.urlInputNodeId,
      to: nodeId,
      label: 'provides'
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
