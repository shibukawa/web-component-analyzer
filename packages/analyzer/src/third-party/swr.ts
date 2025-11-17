/**
 * SWR Library Integration
 * 
 * Handles DFD node creation for SWR hooks (useSWR, useSWRMutation, useSWRConfig)
 */

import { DFDNode, DFDEdge } from '../parser/types.js';

export interface LibraryHookHandler {
  /**
   * Check if this handler should process the given hook
   */
  shouldHandle(hookName: string, libraryName: string): boolean;

  /**
   * Create DFD nodes and edges for the library hook
   */
  createNodes(
    hook: any,
    enrichedHook: any,
    serverNodeId: string | null,
    generateNodeId: (prefix: string) => string
  ): {
    nodes: DFDNode[];
    edges: DFDEdge[];
  };
}

/**
 * SWR Hook Handler
 */
export class SWRHookHandler implements LibraryHookHandler {
  shouldHandle(hookName: string, libraryName: string): boolean {
    return (
      libraryName === 'swr' &&
      (hookName === 'useSWR' || hookName === 'useSWRMutation' || hookName === 'useSWRConfig')
    );
  }

  createNodes(
    hook: any,
    enrichedHook: any,
    serverNodeId: string | null,
    generateNodeId: (prefix: string) => string
  ): { nodes: DFDNode[]; edges: DFDEdge[] } {
    console.log(`🚚 [SWR] Consolidating ${hook.hookName} into single node`);

    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Separate properties by type
    const dataProperties: string[] = [];
    const processProperties: string[] = [];
    const propertyMetadata = new Map<string, any>();

    for (const [variableName, mapping] of (enrichedHook.returnValueMappings || new Map()).entries()) {
      propertyMetadata.set(variableName, {
        dfdElementType: mapping.dfdElementType,
        ...mapping.metadata,
      });

      if (mapping.dfdElementType === 'process') {
        processProperties.push(variableName);
      } else {
        dataProperties.push(variableName);
      }
    }

    // Create a single consolidated node for data properties
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');

    // Create label with type parameter if available
    let label = hook.hookName;
    if (hook.typeParameter) {
      label = `${hook.hookName}<${hook.typeParameter}>`;
    }

    const node: DFDNode = {
      id: nodeId,
      label,
      type: 'data-store', // Use data-store as the primary type
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: enrichedHook.libraryName,
        isLibraryHook: true,
        properties: allProperties, // All property names
        dataProperties, // Data/state properties (data, error, isLoading)
        processProperties, // Process properties (mutate, trigger)
        propertyMetadata: Object.fromEntries(propertyMetadata), // Metadata for each property
        serverNodeId, // Reference to the Server node if created
        typeParameter: hook.typeParameter, // Type parameter (e.g., "User")
        line: hook.line,
        column: hook.column,
      },
    };

    nodes.push(node);
    console.log(`🚚 [SWR] ✅ Created consolidated ${hook.hookName} node:`);
    console.log(`🚚 [SWR]    Node ID: ${nodeId}`);
    console.log(`🚚 [SWR]    Label: ${node.label}`);
    console.log(`🚚 [SWR]    Type: ${node.type}`);
    console.log(`🚚 [SWR]    All properties:`, allProperties);
    console.log(`🚚 [SWR]    Data properties:`, dataProperties);
    console.log(`🚚 [SWR]    Process properties:`, processProperties);
    console.log(`🚚 [SWR]    Server node ID:`, serverNodeId || 'none');

    // Create edge from Server node to library hook node
    if (serverNodeId) {
      edges.push({
        from: serverNodeId,
        to: nodeId,
        label: 'fetches',
      });
      console.log(`🚚 [SWR] ✅ Created edge from Server (${serverNodeId}) to ${hook.hookName} (${nodeId})`);
    } else {
      console.log(`🚚 [SWR] ⚠️ No Server node created (endpoint may be dynamic)`);
    }

    return { nodes, edges };
  }
}
