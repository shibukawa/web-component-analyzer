/**
 * Type definitions for Hook Processor Architecture
 * 
 * This module defines the interfaces and types for the pluggable hook processor system.
 * Processors handle special processing for specific hook types (React hooks, third-party
 * library hooks, custom hooks) in a unified, extensible architecture.
 */

import {
  ComponentAnalysis,
  DFDNode,
  DFDEdge,
  DFDSubgraph,
  HookInfo
} from '../parser/types';

/**
 * Metadata about a hook processor
 * Describes what hooks the processor handles and its priority
 */
export interface ProcessorMetadata {
  /** Unique identifier for this processor */
  id: string;
  
  /** Library name (e.g., 'react', 'swr', 'next/navigation') */
  libraryName: string;
  
  /** Package patterns to match imports (e.g., ['react'], ['swr', 'swr/mutation']) */
  packagePatterns: string[];
  
  /** Hook names or patterns this processor handles (supports both exact strings and RegExp) */
  hookNames: Array<string | RegExp>;
  
  /** Priority (higher = checked first, e.g., 100 for React built-ins, 50 for libraries, 0 for fallback) */
  priority: number;
  
  /** Human-readable description */
  description?: string;
}

/**
 * Context provided to processors during hook processing
 * Contains all information needed to create DFD nodes and edges
 */
export interface ProcessorContext {
  /** Component analysis data */
  analysis: ComponentAnalysis;
  
  /** All existing nodes (for lookups) */
  nodes: DFDNode[];
  
  /** All existing edges */
  edges: DFDEdge[];
  
  /** Utility: Generate unique node ID */
  generateNodeId: (prefix: string) => string;
  
  /** Utility: Find node by variable name */
  findNodeByVariable: (varName: string, nodes: DFDNode[]) => DFDNode | null;
  
  /** Utility: Create server node */
  createServerNode: (endpoint?: string, line?: number, column?: number) => string;
  
  /** Logger with processor-specific prefix */
  logger: ProcessorLogger;
}

/**
 * Custom edge builder function
 * Called during attribute reference processing to create library-specific edges
 */
export type CustomEdgeBuilder = (params: {
  /** The JSX element node */
  elementNode: DFDNode;
  /** The source node (e.g., library hook node) */
  sourceNode: DFDNode;
  /** The attribute reference information */
  attributeRef: {
    attributeName: string;
    referencedVariable: string;
  };
  /** The JSX element structure */
  element: any; // JSXElementStructure
  /** All nodes in the graph */
  nodes: DFDNode[];
}) => DFDEdge[];

/**
 * Result returned by a processor after processing a hook
 */
export interface ProcessorResult {
  /** Nodes created by this processor */
  nodes: DFDNode[];
  
  /** Edges created by this processor */
  edges: DFDEdge[];
  
  /** Optional subgraphs */
  subgraphs?: DFDSubgraph[];
  
  /** Whether this processor fully handled the hook */
  handled: boolean;
  
  /** Optional custom edge builders for attribute references */
  customEdgeBuilders?: Record<string, CustomEdgeBuilder>;
}

/**
 * Hook processor interface
 * All processors must implement this interface
 */
export interface HookProcessor {
  /**
   * Metadata about this processor
   */
  readonly metadata: ProcessorMetadata;
  
  /**
   * Check if this processor should handle the given hook
   * @param hook - Hook information
   * @param context - Processing context
   * @returns true if this processor should handle the hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean;
  
  /**
   * Process the hook and return DFD elements
   * @param hook - Hook information
   * @param context - Processing context
   * @returns Processing result with nodes, edges, and subgraphs
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult;
}

/**
 * Structured logging interface for processors
 * Provides consistent logging with processor-specific prefixes
 */
export interface ProcessorLogger {
  /**
   * Log processor invocation
   * @param hookName - Name of the hook being processed
   * @param hookInfo - Hook information
   */
  start(hookName: string, hookInfo: HookInfo): void;
  
  /**
   * Log node creation or lookup
   * @param action - Action performed ('created' or 'found')
   * @param node - The node
   */
  node(action: 'created' | 'found', node: DFDNode): void;
  
  /**
   * Log edge creation
   * @param action - Action performed ('created')
   * @param edge - The edge
   */
  edge(action: 'created', edge: DFDEdge): void;
  
  /**
   * Log processor completion
   * @param result - Processing result
   */
  complete(result: ProcessorResult): void;
  
  /**
   * Log warnings
   * @param message - Warning message
   * @param data - Optional additional data
   */
  warn(message: string, data?: any): void;
  
  /**
   * Log debug information
   * @param message - Debug message
   * @param data - Optional additional data
   */
  debug(message: string, data?: any): void;
}

/**
 * Error thrown by processors during hook processing
 */
export class ProcessorError extends Error {
  constructor(
    public processorId: string,
    public hookName: string,
    message: string,
    public cause?: Error
  ) {
    super(`[${processorId}] Error processing ${hookName}: ${message}`);
    this.name = 'ProcessorError';
  }
}
