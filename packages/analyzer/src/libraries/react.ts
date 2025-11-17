/**
 * React Library Processor
 * 
 * Handles React standard hooks:
 * - useState: State management with read-write pairs
 * - useReducer: State management with reducer pattern
 * - useContext: Context consumption with data/function separation
 * - useImperativeHandle: Exported handler creation
 * - useEffect, useLayoutEffect, useCallback, useMemo, useRef: Standard hooks
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
import { processHookWithSubgraphs } from './helpers';

/**
 * React standard hooks processor
 * Handles all React built-in hooks with high priority
 */
export class ReactLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'react',
    libraryName: 'react',
    packagePatterns: ['react'],
    hookNames: [
      'useState',
      'useReducer',
      'useContext',
      'useImperativeHandle',
      'useEffect',
      'useLayoutEffect',
      'useCallback',
      'useMemo',
      'useRef'
    ],
    priority: 100, // High priority for built-in hooks
    description: 'React standard hooks processor'
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    return this.metadata.hookNames.includes(hook.hookName);
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific hook handlers
    switch (hook.hookName) {
      case 'useState':
        return this.processUseState(hook, context);
      case 'useReducer':
        return this.processUseReducer(hook, context);
      case 'useContext':
        return this.processUseContext(hook, context);
      case 'useImperativeHandle':
        return this.processUseImperativeHandle(hook, context);
      case 'useRef':
        // useRef doesn't participate in data flow
        logger.debug('Skipping useRef - does not participate in data flow');
        return { nodes: [], edges: [], handled: true };
      default:
        // Other hooks (useEffect, useCallback, useMemo, etc.) don't create nodes
        logger.debug(`Hook ${hook.hookName} does not create DFD nodes`);
        return { nodes: [], edges: [], handled: true };
    }
  }

  /**
   * Process useState hook
   * Creates a data-store node with read-write pair pattern
   */
  private processUseState(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // For read-write pairs (e.g., [count, setCount]), create a single node
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      
      const node: DFDNode = {
        id: generateNodeId('state'),
        label: readVar,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'state',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: readVar,
          writeVariable: writeVar,
          initialValue: hook.initialValue, // Store initial value for edge creation
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    } else {
      // For other cases, create individual nodes
      for (const variable of hook.variables) {
        const node: DFDNode = {
          id: generateNodeId('state'),
          label: variable,
          type: 'data-store',
          line: hook.line,
          column: hook.column,
          metadata: {
            category: 'state',
            hookName: hook.hookName,
            isReadWritePair: hook.isReadWritePair,
            line: hook.line,
            column: hook.column
          }
        };

        nodes.push(node);
        logger.node('created', node);
      }
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useReducer hook
   * Creates a data-store node with reducer pattern
   */
  private processUseReducer(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // useReducer always has read-write pair pattern
    if (hook.variables.length === 2) {
      const [stateVar, dispatchVar] = hook.variables;
      
      // Use reducer function name as label (e.g., "counterReducer")
      // If not available, fall back to state variable name
      const label = hook.reducerName || stateVar;

      const node: DFDNode = {
        id: generateNodeId('state'),
        label,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'state',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: stateVar,
          writeVariable: dispatchVar,
          stateProperties: hook.stateProperties,
          reducerName: hook.reducerName,
          isReducer: true,
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
   * Process useContext hook
   * Separates data values from function values
   * Creates external-entity-input nodes for data
   * Creates external-entity-output nodes for functions
   */
  private processUseContext(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;

    // If no type classification is available, fall back to legacy behavior
    if (!hook.variableTypes || hook.variableTypes.size === 0) {
      logger.warn('No type classification available, using legacy classification');
      return this.processUseContextLegacy(hook, context);
    }

    // Use the common helper function with useContext-specific configuration
    return processHookWithSubgraphs(hook, context, {
      dataCategory: 'context-data',
      functionCategory: 'context-function',
      dataNodeType: 'external-entity-input',
      functionNodeType: 'external-entity-output'
    });
  }

  /**
   * Legacy useContext processing for contexts without type classification
   * Uses heuristic-based classification (isReadWritePair, isFunctionOnly)
   */
  private processUseContextLegacy(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Classify based on pattern
    let nodeType: 'external-entity-input' | 'data-store' | 'external-entity-output';

    if (hook.isFunctionOnly) {
      // Write-only functions → external-entity-output
      nodeType = 'external-entity-output';
    } else if (hook.isReadWritePair) {
      // Read-write pair → data-store
      nodeType = 'data-store';
    } else {
      // Read-only → external-entity-input
      nodeType = 'external-entity-input';
    }

    // For read-write pairs, create a single node
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      
      const node: DFDNode = {
        id: generateNodeId('context'),
        label: readVar,
        type: nodeType,
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'context',
          hookName: hook.hookName,
          isReadWritePair: true,
          isFunctionOnly: hook.isFunctionOnly,
          readVariable: readVar,
          writeVariable: writeVar,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    } else {
      // For other cases, create individual nodes
      for (const variable of hook.variables) {
        const node: DFDNode = {
          id: generateNodeId('context'),
          label: variable,
          type: nodeType,
          line: hook.line,
          column: hook.column,
          metadata: {
            category: 'context',
            hookName: hook.hookName,
            isReadWritePair: hook.isReadWritePair,
            isFunctionOnly: hook.isFunctionOnly,
            line: hook.line,
            column: hook.column
          }
        };

        nodes.push(node);
        logger.node('created', node);
      }
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useImperativeHandle hook
   * Creates exported handlers subgroup
   * Note: The actual subgroup creation is handled by createImperativeHandlerSubgroups
   * in dfd-builder.ts, which processes all imperative handle calls across all processes.
   * This method just acknowledges that the hook was handled.
   */
  private processUseImperativeHandle(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    
    // useImperativeHandle doesn't create nodes directly
    // The exported handlers are created from process.exportedHandlers
    // and imperative handle calls in createImperativeHandlerSubgroups
    logger.debug('useImperativeHandle processing delegated to createImperativeHandlerSubgroups');
    
    return { nodes: [], edges: [], handled: true };
  }
}
