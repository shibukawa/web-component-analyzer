/**
 * Apollo Client Library Processor
 * 
 * Handles Apollo Client GraphQL data fetching hooks:
 * - useQuery: GraphQL query execution with caching
 * - useMutation: GraphQL mutation operations
 * - useSubscription: GraphQL subscription for real-time data
 * - useLazyQuery: Manually triggered query execution
 * 
 * This processor consolidates all return values into a single library-hook node
 * and creates Server nodes for GraphQL operations.
 */

import {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo,
  DFDEdge
} from '../parser/types';
import {
  ReturnValueMapping,
  mapVariablesToTypes,
  createConsolidatedLibraryHookNode,
  createDataFetchingEdges
} from './helpers';

/**
 * Apollo Client library processor
 * Handles useQuery, useMutation, useSubscription, and useLazyQuery hooks
 */
export class ApolloClientLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'apollo-client',
    libraryName: '@apollo/client',
    packagePatterns: ['@apollo/client', 'apollo-client'],
    hookNames: ['useQuery', 'useMutation', 'useSubscription', 'useLazyQuery'],
    priority: 50, // Medium priority for third-party libraries
    description: 'Apollo Client GraphQL library processor'
  };

  /**
   * Return value mappings for each Apollo Client hook
   * Defines how Apollo Client hook return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useQuery: [
      {
        propertyName: 'data',
        dfdElementType: 'external-entity-input'
      },
      {
        propertyName: 'loading',
        dfdElementType: 'data-store',
        metadata: { isLoading: true }
      },
      {
        propertyName: 'error',
        dfdElementType: 'data-store',
        metadata: { isError: true }
      },
      {
        propertyName: 'refetch',
        dfdElementType: 'process',
        metadata: { isRefetch: true }
      },
      {
        propertyName: 'fetchMore',
        dfdElementType: 'process',
        metadata: { isFetch: true }
      },
      {
        propertyName: 'networkStatus',
        dfdElementType: 'data-store'
      },
      {
        propertyName: 'called',
        dfdElementType: 'data-store'
      }
    ],
    useMutation: [
      {
        propertyName: 'mutate',
        dfdElementType: 'process',
        metadata: { isMutation: true }
      },
      {
        propertyName: 'data',
        dfdElementType: 'external-entity-input'
      },
      {
        propertyName: 'loading',
        dfdElementType: 'data-store',
        metadata: { isLoading: true }
      },
      {
        propertyName: 'error',
        dfdElementType: 'data-store',
        metadata: { isError: true }
      },
      {
        propertyName: 'called',
        dfdElementType: 'data-store'
      },
      {
        propertyName: 'reset',
        dfdElementType: 'process'
      }
    ],
    useSubscription: [
      {
        propertyName: 'data',
        dfdElementType: 'external-entity-input'
      },
      {
        propertyName: 'loading',
        dfdElementType: 'data-store',
        metadata: { isLoading: true }
      },
      {
        propertyName: 'error',
        dfdElementType: 'data-store',
        metadata: { isError: true }
      }
    ],
    useLazyQuery: [
      {
        propertyName: 'execute',
        dfdElementType: 'process',
        metadata: { isQuery: true }
      },
      {
        propertyName: 'data',
        dfdElementType: 'external-entity-input'
      },
      {
        propertyName: 'loading',
        dfdElementType: 'data-store',
        metadata: { isLoading: true }
      },
      {
        propertyName: 'error',
        dfdElementType: 'data-store',
        metadata: { isError: true }
      },
      {
        propertyName: 'called',
        dfdElementType: 'data-store'
      },
      {
        propertyName: 'refetch',
        dfdElementType: 'process',
        metadata: { isRefetch: true }
      },
      {
        propertyName: 'fetchMore',
        dfdElementType: 'process',
        metadata: { isFetch: true }
      }
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known Apollo Client hook
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if Apollo Client library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known Apollo Client hook name
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
      case 'useQuery':
        return this.processUseQuery(hook, context);
      case 'useMutation':
        return this.processUseMutation(hook, context);
      case 'useSubscription':
        return this.processUseSubscription(hook, context);
      case 'useLazyQuery':
        return this.processUseLazyQuery(hook, context);
      default:
        logger.warn(`Unknown Apollo Client hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useQuery hook
   * Creates consolidated library-hook node and Server node for GraphQL query
   */
  private processUseQuery(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { createServerNode, logger } = context;
    const nodes = [];
    const edges: DFDEdge[] = [];

    // Extract GraphQL operation name from hook arguments
    const operationName = this.extractOperationName(hook);
    
    // Create Server node for GraphQL query
    let serverNodeId: string | null = null;
    if (operationName) {
      serverNodeId = createServerNode(operationName, hook.line, hook.column);
      logger.debug(`Created Server node with operation: ${operationName}`);
    } else {
      serverNodeId = createServerNode('GraphQL', hook.line, hook.column);
      logger.warn('No operation name found - using generic GraphQL label');
    }

    // Create consolidated library-hook node using helper
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const node = createConsolidatedLibraryHookNode(hook, context, {
      libraryName: '@apollo/client',
      mappings,
      serverNodeId
    });

    nodes.push(node);

    // Create edge from Server to hook node using helper
    const dataEdges = createDataFetchingEdges(serverNodeId, node.id, 'query', context);
    edges.push(...dataEdges);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useMutation hook
   * Creates consolidated library-hook node with mutation-specific properties
   */
  private processUseMutation(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { createServerNode, logger } = context;
    const nodes = [];
    const edges: DFDEdge[] = [];

    // Extract GraphQL operation name from hook arguments
    const operationName = this.extractOperationName(hook);
    
    // Create Server node for GraphQL mutation
    let serverNodeId: string | null = null;
    if (operationName) {
      serverNodeId = createServerNode(operationName, hook.line, hook.column);
      logger.debug(`Created Server node with operation: ${operationName}`);
    } else {
      serverNodeId = createServerNode('GraphQL', hook.line, hook.column);
      logger.warn('No operation name found - using generic GraphQL label');
    }

    // Create consolidated library-hook node using helper
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const node = createConsolidatedLibraryHookNode(hook, context, {
      libraryName: '@apollo/client',
      mappings,
      serverNodeId
    });

    nodes.push(node);

    // Create edge from hook to Server node (mutates) using helper
    const dataEdges = createDataFetchingEdges(serverNodeId, node.id, 'mutate', context);
    edges.push(...dataEdges);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useSubscription hook
   * Creates consolidated library-hook node for GraphQL subscription
   */
  private processUseSubscription(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { createServerNode, logger } = context;
    const nodes = [];
    const edges: DFDEdge[] = [];

    // Extract GraphQL operation name from hook arguments
    const operationName = this.extractOperationName(hook);
    
    // Create Server node for GraphQL subscription
    let serverNodeId: string | null = null;
    if (operationName) {
      serverNodeId = createServerNode(operationName, hook.line, hook.column);
      logger.debug(`Created Server node with operation: ${operationName}`);
    } else {
      serverNodeId = createServerNode('GraphQL', hook.line, hook.column);
      logger.warn('No operation name found - using generic GraphQL label');
    }

    // Create consolidated library-hook node using helper
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const node = createConsolidatedLibraryHookNode(hook, context, {
      libraryName: '@apollo/client',
      mappings,
      serverNodeId
    });

    nodes.push(node);

    // Create edge from Server to hook node (subscription) using helper
    const dataEdges = createDataFetchingEdges(serverNodeId, node.id, 'subscribe', context);
    edges.push(...dataEdges);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useLazyQuery hook
   * Creates consolidated library-hook node with lazy query-specific properties
   */
  private processUseLazyQuery(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { createServerNode, logger } = context;
    const nodes = [];
    const edges: DFDEdge[] = [];

    // Extract GraphQL operation name from hook arguments
    const operationName = this.extractOperationName(hook);
    
    // Create Server node for GraphQL query
    let serverNodeId: string | null = null;
    if (operationName) {
      serverNodeId = createServerNode(operationName, hook.line, hook.column);
      logger.debug(`Created Server node with operation: ${operationName}`);
    } else {
      serverNodeId = createServerNode('GraphQL', hook.line, hook.column);
      logger.warn('No operation name found - using generic GraphQL label');
    }

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    
    // useLazyQuery returns [execute, { data, loading, error, ... }]
    // We need to handle both the array destructuring and object destructuring
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypesForLazyQuery(hook.variables, mappings);

    // Create consolidated library-hook node with custom property metadata
    const node = createConsolidatedLibraryHookNode(hook, context, {
      libraryName: '@apollo/client',
      mappings,
      serverNodeId,
      additionalMetadata: {
        // Override the property metadata with our custom lazy query mapping
        propertyMetadata
      }
    });

    // Update the node's metadata to use our custom property mappings
    if (node.metadata) {
      node.metadata.dataProperties = dataProperties;
      node.metadata.processProperties = processProperties;
      node.metadata.propertyMetadata = propertyMetadata;
      node.metadata.properties = [...dataProperties, ...processProperties];
    }

    nodes.push(node);

    // Create edge from Server to hook node using helper
    const dataEdges = createDataFetchingEdges(serverNodeId, node.id, 'query', context);
    edges.push(...dataEdges);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Extract GraphQL operation name from hook arguments
   * Attempts to extract the operation name from the GraphQL document
   */
  private extractOperationName(hook: HookInfo): string | undefined {
    const hookAny = hook as any;
    
    // Check if operation name is available in hook arguments
    if (hookAny.arguments && hookAny.arguments.length > 0) {
      const firstArg = hookAny.arguments[0];
      
      // Handle string literals (operation name)
      if (typeof firstArg === 'string') {
        return firstArg;
      }
      
      // Handle objects with value property (from AST)
      if (firstArg && typeof firstArg === 'object' && 'value' in firstArg) {
        return String(firstArg.value);
      }
      
      // For GraphQL documents, we might need to parse the document
      // For now, return undefined and let the caller use a generic label
    }
    
    return undefined;
  }

  /**
   * Map hook variables to their types for useLazyQuery
   * useLazyQuery returns [execute, { data, loading, error, ... }]
   * The first element is the execute function, the rest are from the result object
   */
  private mapVariablesToTypesForLazyQuery(
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

    // For useLazyQuery, the first variable is typically the execute function
    // The rest are from the result object
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      
      // First variable is typically the execute function
      if (i === 0) {
        const executeMapping = mappings.find(m => m.propertyName === 'execute');
        if (executeMapping) {
          propertyMetadata[variable] = {
            dfdElementType: executeMapping.dfdElementType,
            ...executeMapping.metadata
          };
          processProperties.push(variable);
        } else {
          // Fallback: treat as process
          propertyMetadata[variable] = {
            dfdElementType: 'process',
            isQuery: true
          };
          processProperties.push(variable);
        }
      } else {
        // Rest are from the result object
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
    }

    return { dataProperties, processProperties, propertyMetadata };
  }
}
