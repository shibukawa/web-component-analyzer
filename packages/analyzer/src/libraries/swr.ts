/**
 * SWR Library Processor
 * 
 * Handles SWR data fetching hooks:
 * - useSWR: Data fetching with caching
 * - useSWRMutation: Mutation operations
 * - useSWRConfig: Global configuration and cache access
 * 
 * This processor consolidates all return values into a single library-hook node
 * and creates Server nodes for data fetching operations.
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
 * Return value mapping configuration for SWR hooks
 */
interface ReturnValueMapping {
  propertyName: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * SWR library processor
 * Handles useSWR, useSWRMutation, and useSWRConfig hooks
 */
export class SWRLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'swr',
    libraryName: 'swr',
    packagePatterns: ['swr', 'swr/mutation'],
    hookNames: ['useSWR', 'useSWRMutation', 'useSWRConfig'],
    priority: 50, // Medium priority for third-party libraries
    description: 'SWR data fetching library processor'
  };

  /**
   * Return value mappings for each SWR hook
   * Defines how SWR hook return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useSWR: [
      {
        propertyName: 'data',
        dfdElementType: 'external-entity-input'
      },
      {
        propertyName: 'error',
        dfdElementType: 'data-store',
        metadata: { isError: true }
      },
      {
        propertyName: 'isLoading',
        dfdElementType: 'data-store',
        metadata: { isLoading: true }
      },
      {
        propertyName: 'isValidating',
        dfdElementType: 'data-store'
      },
      {
        propertyName: 'mutate',
        dfdElementType: 'process',
        metadata: { isMutation: true }
      }
    ],
    useSWRMutation: [
      {
        propertyName: 'data',
        dfdElementType: 'external-entity-input'
      },
      {
        propertyName: 'error',
        dfdElementType: 'data-store',
        metadata: { isError: true }
      },
      {
        propertyName: 'trigger',
        dfdElementType: 'process',
        metadata: { isMutation: true }
      },
      {
        propertyName: 'isMutating',
        dfdElementType: 'data-store',
        metadata: { isLoading: true }
      }
    ],
    useSWRConfig: [
      {
        propertyName: 'mutate',
        dfdElementType: 'process',
        metadata: { isMutation: true, isGlobal: true }
      },
      {
        propertyName: 'cache',
        dfdElementType: 'data-store',
        metadata: { isCache: true }
      }
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known SWR hook
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if SWR library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known SWR hook name
    // This is a fallback for when library detection isn't working
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific hook handlers
    switch (hook.hookName) {
      case 'useSWR':
        return this.processUseSWR(hook, context);
      case 'useSWRMutation':
        return this.processUseSWRMutation(hook, context);
      case 'useSWRConfig':
        return this.processUseSWRConfig(hook, context);
      default:
        logger.warn(`Unknown SWR hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useSWR hook
   * Creates consolidated library-hook node and Server node for data fetching
   */
  private processUseSWR(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract API endpoint from hook arguments
    const endpoint = this.extractEndpoint(hook);
    
    // Create Server node for data fetching
    let serverNodeId: string | null = null;
    if (endpoint) {
      serverNodeId = createServerNode(endpoint, hook.line, hook.column);
      logger.debug(`Created Server node with endpoint: ${endpoint}`);
    } else {
      logger.warn('No endpoint found - may be dynamic');
    }

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
    // Create label without type parameter (keep it simple)
    const label = hook.hookName;

    const node: DFDNode = {
      id: nodeId,
      label,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'swr',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create edge from Server to hook node
    if (serverNodeId) {
      const edge: DFDEdge = {
        from: serverNodeId,
        to: nodeId,
        label: 'fetch'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useSWRMutation hook
   * Creates consolidated library-hook node with mutation-specific properties
   */
  private processUseSWRMutation(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract API endpoint from hook arguments
    const endpoint = this.extractEndpoint(hook);
    
    // Create Server node for mutation
    let serverNodeId: string | null = null;
    if (endpoint) {
      serverNodeId = createServerNode(endpoint, hook.line, hook.column);
      logger.debug(`Created Server node with endpoint: ${endpoint}`);
    } else {
      logger.warn('No endpoint found - may be dynamic');
    }

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
    // Create label without type parameter (keep it simple)
    const label = hook.hookName;

    const node: DFDNode = {
      id: nodeId,
      label,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'swr',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create edge from hook to Server node (mutates)
    if (serverNodeId) {
      const edge: DFDEdge = {
        from: nodeId,
        to: serverNodeId,
        label: 'mutate'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useSWRConfig hook
   * Creates consolidated library-hook node with global configuration access
   */
  private processUseSWRConfig(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);
    
    // useSWRConfig may need a generic Server node for global operations
    // Only create if there are mutation operations
    let serverNodeId: string | null = null;
    const hasMutate = processProperties.includes('mutate');
    
    if (hasMutate) {
      serverNodeId = createServerNode(undefined, hook.line, hook.column);
      logger.debug('Created generic Server node for global mutate');
    }

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
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
        libraryName: 'swr',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create edge from hook to Server node if needed (only one edge)
    if (serverNodeId) {
      const edge: DFDEdge = {
        from: nodeId,
        to: serverNodeId,
        label: 'mutate'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Extract API endpoint from hook arguments
   * Handles both string literals and template literals
   */
  private extractEndpoint(hook: HookInfo): string | undefined {
    const hookAny = hook as any;
    
    // Check if endpoint is available in hook arguments
    if (hookAny.arguments && hookAny.arguments.length > 0) {
      const firstArg = hookAny.arguments[0];
      
      // Handle string literals
      if (typeof firstArg === 'string') {
        return firstArg;
      }
      
      // Handle objects with value property (from AST)
      if (firstArg && typeof firstArg === 'object' && 'value' in firstArg) {
        return String(firstArg.value);
      }
    }
    
    return undefined;
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

    // For each variable extracted from the hook, find its mapping
    for (const variable of variables) {
      // Try to find a mapping for this variable
      // This handles cases like: const { data, error, mutate } = useSWR(...)
      const mapping = mappings.find(m => m.propertyName === variable);
      
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
          dfdElementType: 'data-store'
        };
        dataProperties.push(variable);
      }
    }

    return { dataProperties, processProperties, propertyMetadata };
  }
}
