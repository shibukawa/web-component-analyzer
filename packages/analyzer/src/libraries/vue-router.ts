/**
 * Vue Router Library Processor
 * 
 * Handles Vue Router composables:
 * - useRoute: Access current route information (input)
 * - useRouter: Access router instance for navigation (output)
 * - onBeforeRouteUpdate: Navigation guard hook
 * - onBeforeRouteLeave: Navigation guard hook
 * 
 * This processor creates:
 * - External Entity Input nodes for route.params and route.query
 * - Library hook nodes for router access
 * - Process nodes for navigation guards
 * - Data flows for router navigation calls
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
 * Return value mapping configuration for Vue Router composables
 */
interface ReturnValueMapping {
  propertyName?: string;
  variableName?: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * Vue Router library processor
 * Handles useRoute, useRouter, and navigation guard composables
 */
export class VueRouterLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'vue-router',
    libraryName: 'vue-router',
    packagePatterns: ['vue-router'],
    hookNames: ['useRoute', 'useRouter', 'onBeforeRouteUpdate', 'onBeforeRouteLeave'],
    priority: 50, // Medium priority for third-party libraries
    description: 'Vue Router navigation library processor'
  };

  /**
   * Return value mappings for each Vue Router composable
   * Defines how Vue Router composable return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useRoute: [
      {
        variableName: '0',
        dfdElementType: 'external-entity-input',
        metadata: { isRoute: true }
      }
    ],
    useRouter: [
      {
        variableName: '0',
        dfdElementType: 'process',
        metadata: { isRouter: true }
      }
    ],
    onBeforeRouteUpdate: [
      {
        variableName: '0',
        dfdElementType: 'process',
        metadata: { isNavigationGuard: true }
      }
    ],
    onBeforeRouteLeave: [
      {
        variableName: '0',
        dfdElementType: 'process',
        metadata: { isNavigationGuard: true }
      }
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known Vue Router composable
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if Vue Router library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known Vue Router composable name
    // This is a fallback for when library detection isn't working
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific composable handlers
    switch (hook.hookName) {
      case 'useRoute':
        return this.processUseRoute(hook, context);
      case 'useRouter':
        return this.processUseRouter(hook, context);
      case 'onBeforeRouteUpdate':
      case 'onBeforeRouteLeave':
        return this.processNavigationGuard(hook, context);
      default:
        logger.warn(`Unknown Vue Router composable: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useRoute composable
   * Creates an external entity input node for route information
   */
  private processUseRoute(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create URL: Input node (external entity input representing the browser URL)
    const urlInputNodeId = generateNodeId('url_input');
    const urlInputNode: DFDNode = {
      id: urlInputNodeId,
      label: 'URL: Input',
      type: 'external-entity-input',
      metadata: {
        category: 'url-input',
        description: 'Browser URL input'
      }
    };
    nodes.push(urlInputNode);
    logger.node('created', urlInputNode);

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node (data-store for useRoute)
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
        libraryName: 'vue-router',
        isLibraryHook: true,
        properties: dataProperties,
        dataProperties,
        propertyMetadata,
        line: hook.line,
        column: hook.column,
        // Add common route properties that can be accessed
        routeProperties: ['params', 'query', 'path', 'name', 'hash', 'fullPath', 'matched', 'meta']
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create edge from URL: Input to useRoute
    const urlToRouteEdge: DFDEdge = {
      from: urlInputNodeId,
      to: nodeId,
      label: 'provides'
    };
    edges.push(urlToRouteEdge);
    logger.edge('created', urlToRouteEdge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useRouter composable
   * Creates a process node for router navigation
   */
  private processUseRouter(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
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
        libraryName: 'vue-router',
        isLibraryHook: true,
        properties: processProperties,
        processProperties,
        propertyMetadata,
        line: hook.line,
        column: hook.column,
        // Add common router methods that can be called
        routerMethods: ['push', 'replace', 'go', 'back', 'forward']
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create URL: Output node for navigation
    const urlOutputNodeId = generateNodeId('url_output');
    const urlOutputNode: DFDNode = {
      id: urlOutputNodeId,
      label: 'URL: Output',
      type: 'external-entity-output',
      metadata: {
        category: 'external-entity',
        isURLOutput: true
      }
    };
    nodes.push(urlOutputNode);
    logger.node('created', urlOutputNode);

    // Create edge from router to URL: Output
    const edge: DFDEdge = {
      from: nodeId,
      to: urlOutputNodeId,
      label: 'navigates'
    };
    edges.push(edge);
    logger.edge('created', edge);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process navigation guard composables (onBeforeRouteUpdate, onBeforeRouteLeave)
   * These are handled as lifecycle hooks by the DFD builder, so we just mark them as handled
   * and let the builder create the appropriate nodes and edges
   */
  private processNavigationGuard(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    
    // Navigation guards are lifecycle hooks that will be handled by the DFD builder
    // We just mark them as handled so they're recognized as vue-router hooks
    logger.complete({ nodes: [], edges: [], handled: true });
    return { nodes: [], edges: [], handled: true };
  }

  /**
   * Map hook variables to their types using return value mappings
   * Matches variables from the hook destructuring to the known property mappings
   */
  private mapVariablesToTypes(
    variables: string[],
    mappings: ReturnValueMapping[]
  ): {
    dataProperties: string[];
    processProperties: string[];
    propertyMetadata: Record<string, any>;
  } {
    const dataProperties: string[] = [];
    const processProperties: string[] = [];
    const propertyMetadata: Record<string, any> = {};

    // For simple variable assignment like: const route = useRoute()
    // or const router = useRouter()
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      const mapping = mappings.find(m => m.variableName === String(i));
      
      if (mapping) {
        propertyMetadata[variable] = {
          dfdElementType: mapping.dfdElementType,
          ...mapping.metadata
        };

        if (mapping.dfdElementType === 'process') {
          processProperties.push(variable);
        } else {
          dataProperties.push(variable);
        }
      } else {
        // Unknown property - treat as data by default
        propertyMetadata[variable] = {
          dfdElementType: 'external-entity-input'
        };
        dataProperties.push(variable);
      }
    }

    return { dataProperties, processProperties, propertyMetadata };
  }
}
