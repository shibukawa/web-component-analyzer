/**
 * TanStack Query Library Processor
 * 
 * Handles TanStack Query (React Query) data fetching hooks:
 * - useQuery: Data fetching with caching and synchronization
 * - useMutation: Mutation operations
 * - useInfiniteQuery: Infinite scrolling queries
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
 * Return value mapping configuration for TanStack Query hooks
 */
interface ReturnValueMapping {
  propertyName: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * TanStack Query library processor
 * Handles useQuery, useMutation, and useInfiniteQuery hooks
 */
export class TanStackQueryLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'tanstack-query',
    libraryName: '@tanstack/react-query',
    packagePatterns: ['@tanstack/react-query', 'react-query'],
    hookNames: ['useQuery', 'useMutation', 'useInfiniteQuery'],
    priority: 50, // Medium priority for third-party libraries
    description: 'TanStack Query data fetching library processor'
  };

  /**
   * Return value mappings for each TanStack Query hook
   * Defines how TanStack Query hook return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useQuery: [
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
        propertyName: 'refetch',
        dfdElementType: 'process',
        metadata: { isRefetch: true }
      },
      {
        propertyName: 'status',
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
        propertyName: 'mutateAsync',
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
        propertyName: 'status',
        dfdElementType: 'data-store'
      }
    ],
    useInfiniteQuery: [
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
        propertyName: 'fetchNextPage',
        dfdElementType: 'process',
        metadata: { isFetch: true }
      },
      {
        propertyName: 'fetchPreviousPage',
        dfdElementType: 'process',
        metadata: { isFetch: true }
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
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known TanStack Query hook
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if TanStack Query library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known TanStack Query hook name
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
      case 'useInfiniteQuery':
        return this.processUseInfiniteQuery(hook, context);
      default:
        logger.warn(`Unknown TanStack Query hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useQuery hook
   * Creates consolidated library-hook node and Server node for data fetching
   */
  private processUseQuery(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract query key from hook arguments
    const queryKey = this.extractQueryKey(hook);
    
    // Create Server node for data fetching
    let serverNodeId: string | null = null;
    if (queryKey) {
      serverNodeId = createServerNode(queryKey, hook.line, hook.column);
      logger.debug(`Created Server node with query key: ${queryKey}`);
    } else {
      logger.warn('No query key found - may be dynamic');
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
        libraryName: '@tanstack/react-query',
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
   * Process useMutation hook
   * Creates consolidated library-hook node with mutation-specific properties
   */
  private processUseMutation(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract mutation key from hook arguments
    const mutationKey = this.extractMutationKey(hook);
    
    // Create Server node for mutation
    let serverNodeId: string | null = null;
    if (mutationKey) {
      serverNodeId = createServerNode(mutationKey, hook.line, hook.column);
      logger.debug(`Created Server node with mutation key: ${mutationKey}`);
    } else {
      logger.warn('No mutation key found - may be dynamic');
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
        libraryName: '@tanstack/react-query',
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
   * Process useInfiniteQuery hook
   * Creates consolidated library-hook node with infinite query-specific properties
   */
  private processUseInfiniteQuery(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract query key from hook arguments
    const queryKey = this.extractQueryKey(hook);
    
    // Create Server node for data fetching
    let serverNodeId: string | null = null;
    if (queryKey) {
      serverNodeId = createServerNode(queryKey, hook.line, hook.column);
      logger.debug(`Created Server node with query key: ${queryKey}`);
    } else {
      logger.warn('No query key found - may be dynamic');
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
        libraryName: '@tanstack/react-query',
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
   * Extract query key from hook arguments
   * Handles both array literals and variable references
   */
  private extractQueryKey(hook: HookInfo): string | undefined {
    const hookAny = hook as any;
    
    // Check if query key is available in hook arguments
    if (hookAny.arguments && hookAny.arguments.length > 0) {
      const firstArg = hookAny.arguments[0];
      
      // Handle array literals
      if (Array.isArray(firstArg)) {
        return JSON.stringify(firstArg);
      }
      
      // Handle string literals
      if (typeof firstArg === 'string') {
        return firstArg;
      }
      
      // Handle objects with value property (from AST)
      if (firstArg && typeof firstArg === 'object' && 'value' in firstArg) {
        return String(firstArg.value);
      }
      
      // Handle ObjectExpression type (useQuery({ queryKey: [...], queryFn: ... }))
      if (firstArg && typeof firstArg === 'object' && firstArg.type === 'ObjectExpression') {
        // For now, return a generic label since we can't easily extract the queryKey value
        // In a real scenario, we'd need to parse the object properties
        return 'query';
      }
    }
    
    return undefined;
  }

  /**
   * Extract mutation key from hook arguments
   * Handles both string literals and object configurations
   */
  private extractMutationKey(hook: HookInfo): string | undefined {
    const hookAny = hook as any;
    
    // Check if mutation key is available in hook arguments
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
      
      // Handle ObjectExpression type (useMutation({ mutationFn: ... }))
      if (firstArg && typeof firstArg === 'object' && firstArg.type === 'ObjectExpression') {
        // For now, return a generic label since we can't easily extract the mutation key value
        return 'mutation';
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
      // This handles cases like: const { data, error, isLoading } = useQuery(...)
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
