/**
 * Next.js Library Integration
 * 
 * Handles DFD node creation for Next.js navigation hooks
 * (useRouter, usePathname, useSearchParams, useParams)
 */

import { DFDNode, DFDEdge } from '../parser/types.js';
import { EnrichedHookInfo } from '../analyzers/hooks-analyzer.js';
import { LibraryHookHandler } from './swr.js';

/**
 * Next.js Hook Handler
 */
export class NextJSHookHandler implements LibraryHookHandler {
  private urlInputNodeId: string | null = null;
  private urlOutputNodeId: string | null = null;

  shouldHandle(hookName: string, libraryName: string): boolean {
    return (
      libraryName === 'next/navigation' &&
      (hookName === 'useRouter' ||
        hookName === 'usePathname' ||
        hookName === 'useSearchParams' ||
        hookName === 'useParams')
    );
  }

  createNodes(
    hook: any,
    enrichedHook: EnrichedHookInfo,
    serverNodeId: string | null,
    generateNodeId: (prefix: string) => string
  ): { nodes: DFDNode[]; edges: DFDEdge[] } {
    console.log(`🚚 [Next.js] Creating node for ${hook.hookName}`);

    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

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
        libraryName: enrichedHook.libraryName,
        isLibraryHook: true,
        isNextJSHook: true,
        line: hook.line,
        column: hook.column,
      },
    };

    nodes.push(node);
    console.log(`🚚 [Next.js] ✅ Created ${hook.hookName} node:`);
    console.log(`🚚 [Next.js]    Node ID: ${nodeId}`);
    console.log(`🚚 [Next.js]    Label: ${node.label}`);
    console.log(`🚚 [Next.js]    Type: ${node.type}`);

    // Determine if this is an input or output hook
    const isOutputHook = hook.hookName === 'useRouter';
    const isInputHook =
      hook.hookName === 'usePathname' ||
      hook.hookName === 'useSearchParams' ||
      hook.hookName === 'useParams';

    // Create URL: Input node for input hooks (shared across all input hooks)
    if (isInputHook && !this.urlInputNodeId) {
      this.urlInputNodeId = generateNodeId('url_input');
      const urlInputNode: DFDNode = {
        id: this.urlInputNodeId,
        label: 'URL: Input',
        type: 'external-entity-input',
        metadata: {
          category: 'external-entity',
          isURLInput: true,
        },
      };
      nodes.push(urlInputNode);
      console.log(`🚚 [Next.js] ✅ Created URL: Input node: ${this.urlInputNodeId}`);
    }

    // Create URL: Output node for output hooks (shared across all output hooks)
    if (isOutputHook && !this.urlOutputNodeId) {
      this.urlOutputNodeId = generateNodeId('url_output');
      const urlOutputNode: DFDNode = {
        id: this.urlOutputNodeId,
        label: 'URL: Output',
        type: 'external-entity-output',
        metadata: {
          category: 'external-entity',
          isURLOutput: true,
        },
      };
      nodes.push(urlOutputNode);
      console.log(`🚚 [Next.js] ✅ Created URL: Output node: ${this.urlOutputNodeId}`);
    }

    // Create edges
    if (isInputHook && this.urlInputNodeId) {
      edges.push({
        from: this.urlInputNodeId,
        to: nodeId,
        label: 'provides',
      });
      console.log(`🚚 [Next.js] ✅ Created edge from URL: Input to ${hook.hookName}`);
    }

    if (isOutputHook && this.urlOutputNodeId) {
      edges.push({
        from: nodeId,
        to: this.urlOutputNodeId,
        label: 'navigates',
      });
      console.log(`🚚 [Next.js] ✅ Created edge from ${hook.hookName} to URL: Output`);
    }

    return { nodes, edges };
  }

  /**
   * Reset the shared URL node IDs (call this when starting a new component analysis)
   */
  reset(): void {
    this.urlInputNodeId = null;
    this.urlOutputNodeId = null;
  }
}
