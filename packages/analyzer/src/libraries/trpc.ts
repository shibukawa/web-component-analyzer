/**
 * tRPC Library Processor
 * 
 * Handles tRPC type-safe API client hooks:
 * - trpc.*.useQuery: Type-safe query execution
 * - trpc.*.useMutation: Type-safe mutation operations
 * 
 * tRPC hooks follow a nested property access pattern:
 * - trpc.user.getById.useQuery
 * - trpc.post.create.useMutation
 * - trpc.admin.users.list.useQuery (deeply nested)
 * 
 * This processor consolidates all return values into a single library-hook node
 * and creates Server nodes for tRPC procedures.
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
 * Return value mapping configuration for tRPC hooks
 */
interface ReturnValueMapping {
  propertyName: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * tRPC library processor
 * Handles trpc.*.useQuery and trpc.*.useMutation hooks
 */
export class TRPCLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'trpc',
    libraryName: '@trpc/client',
    packagePatterns: ['@trpc/client', '@trpc/react', '@trpc/react-query'],
    hookNames: [
      /^trpc\..+\.useQuery$/,      // Matches trpc.user.getById.useQuery, etc.
      /^trpc\..+\.useMutation$/    // Matches trpc.post.create.useMutation, etc.
    ],
    priority: 50, // Medium priority for third-party libraries
    description: 'tRPC type-safe API client processor'
  };

  /**
   * Return value mappings for tRPC query hooks
   * Defines how tRPC query hook return values map to DFD element types
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

  /**
   * Return value mappings for tRPC mutation hooks
   * Defines how tRPC mutation hook return values map to DFD element types
   */
  private readonly mutationMappings: ReturnValueMapping[] = [
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
    // Check if this is a tRPC hook pattern
    const isQueryHook = /^trpc\..+\.useQuery$/.test(hook.hookName);
    const isMutationHook = /^trpc\..+\.useMutation$/.test(hook.hookName);
    
    if (!isQueryHook && !isMutationHook) {
      return false;
    }
    
    // Check if tRPC library is active (imported in the file)
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
    const isQueryHook = /^trpc\..+\.useQuery$/.test(hook.hookName);
    
    if (isQueryHook) {
      return this.processQueryHook(hook, context);
    } else {
      return this.processMutationHook(hook, context);
    }
  }

  /**
   * Process query hook (trpc.*.useQuery pattern)
   * Creates consolidated library-hook node and Server node for data fetching
   */
  private processQueryHook(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract procedure path from hook name (e.g., "trpc.user.getById.useQuery" -> "user.getById")
    const procedurePath = this.extractProcedurePath(hook.hookName);
    
    // Create Server node for tRPC procedure
    let serverNodeId: string | null = null;
    if (procedurePath) {
      serverNodeId = createServerNode(procedurePath, hook.line, hook.column);
      logger.debug(`Created Server node with procedure: ${procedurePath}`);
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
        libraryName: '@trpc/client',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        procedurePath,
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
        label: 'query'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process mutation hook (trpc.*.useMutation pattern)
   * Creates consolidated library-hook node with mutation-specific properties
   */
  private processMutationHook(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, createServerNode, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract procedure path from hook name (e.g., "trpc.post.create.useMutation" -> "post.create")
    const procedurePath = this.extractProcedurePath(hook.hookName);
    
    // Create Server node for tRPC procedure
    let serverNodeId: string | null = null;
    if (procedurePath) {
      serverNodeId = createServerNode(procedurePath, hook.line, hook.column);
      logger.debug(`Created Server node with procedure: ${procedurePath}`);
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
        libraryName: '@trpc/client',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
        propertyMetadata,
        serverNodeId,
        procedurePath,
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
   * Extract procedure path from hook name
   * Examples:
   * - trpc.user.getById.useQuery -> user.getById
   * - trpc.post.create.useMutation -> post.create
   * - trpc.admin.users.list.useQuery -> admin.users.list
   */
  private extractProcedurePath(hookName: string): string | undefined {
    // Remove "trpc." prefix and ".useQuery" or ".useMutation" suffix
    const match = hookName.match(/^trpc\.(.+)\.(useQuery|useMutation)$/);
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
