/**
 * React Router Library Processor
 * 
 * Handles React Router hooks:
 * - useNavigate: Navigation function (output)
 * - useParams: Route parameters object (input)
 * - useLocation: Current location object (input)
 * - useSearchParams: Search parameters and setter (input/output)
 * 
 * This processor implements URL node sharing logic where:
 * - Input hooks (useParams, useLocation, useSearchParams) share a single "URL: Input" node
 * - Output hooks (useNavigate, useSearchParams setter) share a single "URL: Output" node
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
 * Return value mapping configuration for React Router hooks
 */
interface ReturnValueMapping {
  propertyName?: string;
  variableName?: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * React Router library processor
 * Handles useNavigate, useParams, useLocation, and useSearchParams hooks
 */
export class ReactRouterLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'react-router',
    libraryName: 'react-router-dom',
    packagePatterns: ['react-router-dom', 'react-router'],
    hookNames: ['useNavigate', 'useParams', 'useLocation', 'useSearchParams'],
    priority: 50, // Medium priority for third-party libraries
    description: 'React Router navigation library processor'
  };

  /**
   * Shared URL node IDs for singleton pattern
   * These are reset when processing a new component
   */
  private urlInputNodeId: string | null = null;
  private urlOutputNodeId: string | null = null;

  /**
   * Return value mappings for each React Router hook
   * Defines how React Router hook return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useNavigate: [
      {
        variableName: '0',
        dfdElementType: 'process',
        metadata: { isNavigation: true }
      }
    ],
    useParams: [
      {
        variableName: '0',
        dfdElementType: 'external-entity-input',
        metadata: { isRouteParams: true }
      }
    ],
    useLocation: [
      {
        variableName: '0',
        dfdElementType: 'external-entity-input',
        metadata: { isLocation: true }
      }
    ],
    useSearchParams: [
      {
        variableName: '0',
        dfdElementType: 'external-entity-input',
        metadata: { isSearchParams: true }
      },
      {
        variableName: '1',
        dfdElementType: 'process',
        metadata: { isSearchParamsSetter: true }
      }
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known React Router hook
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if React Router library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known React Router hook name
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
      case 'useNavigate':
        return this.processUseNavigate(hook, context);
      case 'useParams':
        return this.processUseParams(hook, context);
      case 'useLocation':
        return this.processUseLocation(hook, context);
      case 'useSearchParams':
        return this.processUseSearchParams(hook, context);
      default:
        logger.warn(`Unknown React Router hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useNavigate hook
   * Creates a process node for the navigation function and URL: Output node
   */
  private processUseNavigate(hook: HookInfo, context: ProcessorContext): ProcessorResult {
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
        libraryName: 'react-router-dom',
        isLibraryHook: true,
        properties: processProperties,
        processProperties,
        propertyMetadata,
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
   * Process useParams hook
   * Creates an external entity input node for route parameters
   */
  private processUseParams(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'external-entity-input',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'react-router-dom',
        isLibraryHook: true,
        properties: dataProperties,
        dataProperties,
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
   * Process useLocation hook
   * Creates an external entity input node for the location object
   */
  private processUseLocation(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'external-entity-input',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'react-router-dom',
        isLibraryHook: true,
        properties: dataProperties,
        dataProperties,
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
   * Process useSearchParams hook
   * Creates external entity input node for search params and process node for setter
   */
  private processUseSearchParams(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
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
        libraryName: 'react-router-dom',
        isLibraryHook: true,
        properties: [...dataProperties, ...processProperties],
        dataProperties,
        processProperties,
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

    // For array destructuring patterns like: const [navigate] = useNavigate()
    // or const [searchParams, setSearchParams] = useSearchParams()
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
