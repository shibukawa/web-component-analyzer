/**
 * Type definitions for DFD data structures
 * Simplified version for web use
 */

export interface DFDNode {
  id: string;
  label: string;
  type: 'external-entity-input' | 'external-entity-output' | 'process' | 'data-store' | 'subgraph';
  metadata?: {
    category?: string;
    [key: string]: any;
  };
}

export interface DFDEdge {
  from: string;
  to: string;
  label?: string;
  isCleanup?: boolean;
  isLongArrow?: boolean;
}

export interface DFDSubgraph {
  id: string;
  label: string;
  type: 'jsx-output' | 'conditional' | 'exported-handlers';
  elements: Array<DFDNode | DFDSubgraph>;
  condition?: {
    expression: string;
  };
}

export interface DFDSourceData {
  nodes: DFDNode[];
  edges: DFDEdge[];
  rootSubgraph?: DFDSubgraph;
  subgraphs?: DFDSubgraph[];
  errors?: Array<{
    message: string;
    [key: string]: any;
  }>;
}
