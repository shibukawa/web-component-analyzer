/**
 * ProcessorLogger Implementation
 * 
 * Provides structured logging for hook processors with:
 * - Processor-specific prefixes
 * - Emoji visual indicators
 * - Consistent formatting
 * - Debug mode support
 */

import { ProcessorLogger } from './types';
import { HookInfo, DFDNode, DFDEdge } from '../parser/types';
import { ProcessorResult } from './types';

/**
 * Configuration for logger behavior
 */
export interface LoggerConfig {
  /** Processor ID for log prefix */
  processorId: string;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Enable verbose logging (default: false, only shows processor invocation) */
  verbose?: boolean;
  
  /** Custom log function (defaults to console.log) */
  logFn?: (message: string) => void;
}

/**
 * Implementation of ProcessorLogger with structured logging
 */
export class ProcessorLoggerImpl implements ProcessorLogger {
  private readonly processorId: string;
  private readonly debugEnabled: boolean;
  private readonly verboseEnabled: boolean;
  private readonly logFn: (message: string) => void;
  
  constructor(config: LoggerConfig) {
    this.processorId = config.processorId;
    this.debugEnabled = config.debug ?? false;
    this.verboseEnabled = config.verbose ?? false;
    this.logFn = config.logFn ?? console.log;
  }
  
  /**
   * Log processor invocation
   */
  start(hookName: string, hookInfo: HookInfo): void {
    if (!this.verboseEnabled) {return;} // Skip in concise mode (already logged by DFD builder)
    
    const variables = hookInfo.variables?.join(', ') || 'none';
    this.log(`🎯 Processing ${hookName}: ${variables}`);
  }
  
  /**
   * Log node creation or lookup
   */
  node(action: 'created' | 'found', node: DFDNode): void {
    if (!this.verboseEnabled) {return;} // Skip in concise mode
    
    const emoji = action === 'created' ? '✅' : '🔍';
    const actionText = action === 'created' ? 'Created' : 'Found';
    const nodeInfo = `${node.type} node: ${node.label} (${node.id})`;
    this.log(`  ${emoji} ${actionText} ${nodeInfo}`);
  }
  
  /**
   * Log edge creation
   */
  edge(action: 'created', edge: DFDEdge): void {
    if (!this.verboseEnabled) {return;} // Skip in concise mode
    
    const edgeInfo = `${edge.from} → ${edge.to}${edge.label ? ` (${edge.label})` : ''}`;
    this.log(`  ✅ Created edge: ${edgeInfo}`);
  }
  
  /**
   * Log processor completion
   */
  complete(result: ProcessorResult): void {
    if (!this.verboseEnabled) {return;} // Skip in concise mode
    
    const nodeCount = result.nodes.length;
    const edgeCount = result.edges.length;
    const subgraphCount = result.subgraphs?.length || 0;
    
    let summary = `📊 Result: ${nodeCount} node${nodeCount !== 1 ? 's' : ''}, ${edgeCount} edge${edgeCount !== 1 ? 's' : ''}`;
    if (subgraphCount > 0) {
      summary += `, ${subgraphCount} subgraph${subgraphCount !== 1 ? 's' : ''}`;
    }
    
    this.log(`  ${summary}`);
  }
  
  /**
   * Log warnings
   */
  warn(message: string, data?: any): void {
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    this.log(`  ⚠️  Warning: ${message}${dataStr}`);
  }
  
  /**
   * Log debug information (only when debug enabled)
   */
  debug(message: string, data?: any): void {
    if (!this.debugEnabled) {
      return;
    }
    
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    this.log(`  🐛 Debug: ${message}${dataStr}`);
  }
  
  /**
   * Internal log method with processor prefix
   */
  private log(message: string): void {
    this.logFn(`[${this.processorId}] ${message}`);
  }
}

/**
 * Create a ProcessorLogger instance
 * 
 * @param processorId - Unique identifier for the processor
 * @param debug - Enable debug logging (default: false)
 * @param verbose - Enable verbose logging with node/edge details (default: false)
 * @param logFn - Custom log function (default: console.log)
 * @returns ProcessorLogger instance
 */
export function createLogger(
  processorId: string,
  debug: boolean = false,
  verbose: boolean = false,
  logFn?: (message: string) => void
): ProcessorLogger {
  return new ProcessorLoggerImpl({
    processorId,
    debug,
    verbose,
    logFn
  });
}

/**
 * Create a no-op logger that doesn't output anything
 * Useful for testing or when logging is disabled
 * 
 * @returns ProcessorLogger that does nothing
 */
export function createNoOpLogger(): ProcessorLogger {
  return new ProcessorLoggerImpl({
    processorId: 'noop',
    debug: false,
    logFn: () => {} // No-op function
  });
}
