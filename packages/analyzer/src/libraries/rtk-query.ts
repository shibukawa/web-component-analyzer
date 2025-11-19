/**
 * RTK Query Library Processor
 * 
 * Handles Redux Toolkit Query data fetching hooks:
 * - Generated query hooks (use*Query pattern)
 * - Generated mutation hooks (use*Mutation pattern)
 * 
 * RTK Query generates hooks from API endpoint definitions, following patterns like:
 * - useGetUserQuery, useGetPostsQuery (queries)
 * - useUpdateUserMutation, useCreatePostMutation (mutations)
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
 * Return value mapping configuration for RTK Query hooks
 */
interface ReturnValueMapping {
  propertyName: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * RTK Query library processor
 * Handles generated query and mutation hooks
 */
export class RTKQueryLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'rtk-query',
    libraryName: '@reduxjs/toolkit/query',
    packagePatterns: ['@reduxjs/toolkit/query', '@reduxjs/toolkit/query/react', '@reduxjs/toolkit'],
    hookNames: [
      /^use\w+Query$/,      // Matches useGetUserQuery, useGetPostsQuery, etc.
      /^use\w+Mutation$/    // Matches useUpdateUserMutation, useCreatePostMutation, etc.
    ],
    priority: 50, // Medium priority for third-party libraries
    description: 'RTK Query data fetching library processor'
  };

  /**
   * Return value mappings for RTK Query hooks
   * Defines how RTK Query hook return values map to DFD element types
   */
  private readonly queryMappings: ReturnValueMapping[] = [
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
      propertyName: 'isFetching',
      dfdElementType: 'data-store',
      metadata: { isFetching: true }
    },
    {
      propertyName: 'isError',
      dfdElementType: 'data-store',
      metadata: { isError: true }
    },
    {
      propertyName: 'isSuccess',
      dfdElementType: 'data-store'
    },
    {
      propertyName: 'refetch',
      dfdElementType: 'process',
      metadata: { isRefetch: true }
    },
    {
      propertyName: 'status',
      dfdElementType: 'data-store'
    }
  ];

  private readonly mutationMappings: ReturnValueMapping[] = [
    {
      propertyName: 'trigger',
      dfdElementType: 'process',
      metadata: { isMutation: true }
    },
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
      propertyName: 'isError',
      dfdElementType: 'data-store',
      metadata: { isError: true }
    },
    {
      propertyName: 'isSuccess',
      dfdElementType: 'data-store'
    },
    {
      propertyName: 'reset',
      dfdElementType: 'process'
    },
    {
      propertyName: 'status',
      dfdElementType: 'data-store'
    }
  ];

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a RTK Query hook pattern
    const isQueryHook = /^use\w+Query$/.test(hook.hookName);
    const isMutationHook = /^use\w+Mutation$/.test(hook.hookName);
    
    if (!isQueryHook && !isMutationHook) {
      return false;
    }
    
    // Check if RTK Query library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.some(pattern => 
        enrichedHook.libraryName.includes(pattern)
      );
    }
    
    // If no library name is set, accept the hook if it matches the pattern
    // This is a fallback for when library detection isn't working
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Determine if this is a query or mutation hook
    const isQueryHook = /^use\w+Query$/.test(hook.hookName);
    
    if (isQueryHook) {
      return this.processQueryHook(hook, context);
    } else {
      return this.processMutationHook(hook, context);
    }
  }

  /**
   * Process query hook (use*Query pattern)
   * Creates consolidated library-hook node and Server node for data fetching
   */
  private processQueryHook(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract endpoint name from hook name (e.g., "useGetUserQuery" -> "getUser")
    const endpointName = this.extractEndpointName(hook.hookName);
    
    // Create Server node for data fetching
    let serverNodeId: string | null = null;
    if (endpointName) {
      serverNodeId = createServerNode(endpointName, hook.line, hook.column);
      logger.debug(`Created Server node with endpoint: ${endpointName}`);
    }

    // Map hook variables to their types using the return value mappings
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, this.queryMappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
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
        libraryName: '@reduxjs/toolkit/query',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        endpointName,
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
   * Process mutation hook (use*Mutation pattern)
   * Creates consolidated library-hook node with mutation-specific properties
   */
  private processMutationHook(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract endpoint name from hook name (e.g., "useUpdateUserMutation" -> "updateUser")
    const endpointName = this.extractEndpointName(hook.hookName);
    
    // Create Server node for mutation
    let serverNodeId: string | null = null;
    if (endpointName) {
      serverNodeId = createServerNode(endpointName, hook.line, hook.column);
      logger.debug(`Created Server node with endpoint: ${endpointName}`);
    }

    // Map hook variables to their types using the return value mappings
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, this.mutationMappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
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
        libraryName: '@reduxjs/toolkit/query',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        endpointName,
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
   * Extract endpoint name from hook name
   * Examples:
   * - useGetUserQuery -> getUser
   * - useUpdateUserMutation -> updateUser
   */
  private extractEndpointName(hookName: string): string | undefined {
    // Remove "use" prefix and "Query" or "Mutation" suffix
    const match = hookName.match(/^use(\w+)(Query|Mutation)$/);
    if (match) {
      return match[1];
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
