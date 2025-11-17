/**
 * Helper functions for library processors
 * 
 * Provides common utilities for creating DFD nodes with consistent patterns
 * across different library processors.
 */

import {
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo,
  DFDNode,
  DFDEdge
} from '../parser/types';

/**
 * Process a hook with data/function separation into input/output subgraphs
 * 
 * This is the common pattern used by:
 * - Custom hooks
 * - useContext
 * - Zustand stores
 * - Other library hooks that return mixed data/function values
 * 
 * @param hook - Hook information
 * @param context - Processor context
 * @param options - Configuration options
 * @returns Processing result with nodes and edges
 */
export function processHookWithSubgraphs(
  hook: HookInfo,
  context: ProcessorContext,
  options: {
    /** Category for data nodes (e.g., 'custom-hook-data', 'context-data', 'library-hook') */
    dataCategory: string;
    /** Category for function nodes (e.g., 'custom-hook-function', 'context-function', 'library-hook') */
    functionCategory: string;
    /** Type for data nodes (default: 'external-entity-input') */
    dataNodeType?: 'external-entity-input' | 'data-store';
    /** Type for function nodes (default: 'external-entity-output') */
    functionNodeType?: 'external-entity-output' | 'process';
    /** Library name (e.g., 'zustand', 'react') */
    libraryName?: string;
    /** Additional metadata to include in nodes */
    additionalMetadata?: Record<string, any>;
    /** Custom function to classify variables (if not using hook.variableTypes) */
    classifyVariable?: (varName: string) => 'function' | 'data';
  }
): ProcessorResult {
  const { generateNodeId, logger } = context;
  const nodes: DFDNode[] = [];
  const edges: DFDEdge[] = [];

  const {
    dataCategory,
    functionCategory,
    dataNodeType = 'external-entity-input',
    functionNodeType = 'external-entity-output',
    libraryName,
    additionalMetadata = {},
    classifyVariable
  } = options;

  // Separate data values from function values
  const dataValues: string[] = [];
  const functionValues: string[] = [];

  // Use provided classification or hook.variableTypes
  if (classifyVariable) {
    for (const variable of hook.variables) {
      const varType = classifyVariable(variable);
      if (varType === 'function') {
        functionValues.push(variable);
      } else {
        dataValues.push(variable);
      }
    }
  } else if (hook.variableTypes && hook.variableTypes.size > 0) {
    for (const variable of hook.variables) {
      const varType = hook.variableTypes.get(variable);
      if (varType === 'function') {
        functionValues.push(variable);
      } else {
        dataValues.push(variable);
      }
    }
  } else {
    // No classification available - treat all as data
    logger.warn(`No type classification for ${hook.hookName}, treating all as data`);
    dataValues.push(...hook.variables);
  }

  logger.debug(`Data values: ${dataValues.join(', ')}`);
  logger.debug(`Function values: ${functionValues.join(', ')}`);

  // Create individual nodes for each data value (input subgraph)
  for (const dataValue of dataValues) {
    const node: DFDNode = {
      id: generateNodeId(dataCategory.replace(/-/g, '_')),
      label: dataValue,
      type: dataNodeType,
      line: hook.line,
      column: hook.column,
      metadata: {
        category: dataCategory,
        hookName: hook.hookName,
        variableName: dataValue,
        subgraph: `${hook.hookName}-input`,
        line: hook.line,
        column: hook.column,
        ...(libraryName && { libraryName, isLibraryHook: true }),
        ...additionalMetadata
      }
    };

    nodes.push(node);
    logger.node('created', node);
  }

  // Create individual nodes for each function value (output subgraph)
  for (const functionValue of functionValues) {
    const node: DFDNode = {
      id: generateNodeId(functionCategory.replace(/-/g, '_')),
      label: functionValue,
      type: functionNodeType,
      line: hook.line,
      column: hook.column,
      metadata: {
        category: functionCategory,
        hookName: hook.hookName,
        variableName: functionValue,
        subgraph: `${hook.hookName}-output`,
        line: hook.line,
        column: hook.column,
        ...(libraryName && { libraryName, isLibraryHook: true }),
        ...additionalMetadata
      }
    };

    nodes.push(node);
    logger.node('created', node);
  }

  logger.complete({ nodes, edges, handled: true });
  return { nodes, edges, handled: true };
}

/**
 * Heuristic to determine if a variable name looks like an action/function
 * 
 * Actions/functions typically:
 * - Start with verbs (set, update, add, remove, delete, create, etc.)
 * - Contain action-related words
 * 
 * @param name - Variable name to check
 * @returns true if the name looks like an action/function
 */
export function looksLikeAction(name: string): boolean {
  const actionPrefixes = [
    'set', 'update', 'add', 'remove', 'delete', 'create',
    'fetch', 'load', 'save', 'clear', 'reset', 'toggle',
    'increment', 'decrement', 'push', 'pop', 'shift', 'unshift',
    'handle', 'on', 'dispatch'
  ];

  const lowerName = name.toLowerCase();
  return actionPrefixes.some(prefix => lowerName.startsWith(prefix));
}
