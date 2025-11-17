/**
 * Next.js Library Processor
 * 
 * Handles Next.js navigation hooks:
 * - useRouter: Navigation and routing control (output)
 * - usePathname: Current pathname access (input)
 * - useSearchParams: URL search parameters access (input)
 * - useParams: Dynamic route parameters access (input)
 * 
 * This processor implements URL node sharing logic where:
 * - Input hooks (usePathname, useSearchParams, useParams) share a single "URL: Input" node
 * - Output hooks (useRouter) share a single "URL: Output" node
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
 * Next.js library processor
 * Handles useRouter, usePathname, useSearchParams, and useParams hooks
 */
export class NextJSLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'next',
    libraryName: 'next/navigation',
    packagePatterns: ['next/navigation'],
    hookNames: ['useRouter', 'usePathname', 'useSearchParams', 'useParams'],
    priority: 50, // Medium priority for third-party libraries
    description: 'Next.js navigation hooks processor'
  };

  /**
   * Shared URL node IDs for singleton pattern
   * These are reset when processing a new component
   */
  private urlInputNodeId: string | null = null;
  private urlOutputNodeId: string | null = null;

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if hook is from Next.js navigation library
    const enrichedHook = hook as any;
    return (
      enrichedHook.libraryName === 'next/navigation' &&
      this.metadata.hookNames.includes(hook.hookName)
    );
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger, generateNodeId } = context;
    logger.start(hook.hookName, hook);

    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Determine if this is an input or output hook
    const isOutputHook = hook.hookName === 'useRouter';
    const isInputHook = 
      hook.hookName === 'usePathname' ||
      hook.hookName === 'useSearchParams' ||
      hook.hookName === 'useParams';

    // Create the hook node itself (as a process)
    const nodeId = generateNodeId('library_hook');
    const label = `${hook.hookName}\n<Next.js>`;

    const node: DFDNode = {
      id: nodeId,
      label,
      type: 'process',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'next/navigation',
        isLibraryHook: true,
        isNextJSHook: true,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    // Create or reuse URL: Input node for input hooks
    if (isInputHook) {
      if (!this.urlInputNodeId) {
        this.urlInputNodeId = generateNodeId('url_input');
        const urlInputNode: DFDNode = {
          id: this.urlInputNodeId,
          label: 'URL: Input',
          type: 'external-entity-input',
          metadata: {
            category: 'external-entity',
            isURLInput: true
          }
        };
        nodes.push(urlInputNode);
        logger.node('created', urlInputNode);
      } else {
        logger.debug(`Reusing existing URL: Input node: ${this.urlInputNodeId}`);
      }

      // Create edge from URL: Input to hook
      const edge: DFDEdge = {
        from: this.urlInputNodeId,
        to: nodeId,
        label: 'provides'
      };
      edges.push(edge);
      logger.edge('created', edge);
    }

    // Create or reuse URL: Output node for output hooks
    if (isOutputHook) {
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
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Reset the shared URL node IDs
   * Call this when starting a new component analysis
   */
  reset(): void {
    this.urlInputNodeId = null;
    this.urlOutputNodeId = null;
  }
}
