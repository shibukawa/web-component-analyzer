/**
 * Transform DFD data to vis.js network format
 */

import { DFDSourceData, DFDNode, DFDEdge, DFDSubgraph } from '@web-component-analyzer/analyzer';

export interface VisNode {
  id: string;
  label: string;
  shape: 'box' | 'ellipse' | 'hexagon';
  color: {
    background: string;
    border: string;
  };
  font: {
    size: number;
    color: string;
  };
  shapeProperties?: {
    borderDashes?: boolean | number[];
  };
  borderWidth?: number;
  borderWidthSelected?: number;
  metadata?: Record<string, any>;
  level?: number; // For hierarchical layout
  group?: string; // For clustering
  margin?: number | { top: number; right: number; bottom: number; left: number }; // Spacing around node
}

export interface VisEdge {
  from: string;
  to: string;
  label?: string;
  arrows: 'to';
  dashes?: boolean;
  color?: string;
  smooth: {
    type: 'cubicBezier';
  };
  physics?: boolean;
  chosen?: boolean;
}

export interface VisNetworkData {
  nodes: VisNode[];
  edges: VisEdge[];
}

/**
 * Node color configuration for light theme
 */
const LIGHT_THEME_COLORS = {
  'external-entity-input': {
    background: '#E3F2FD',
    border: '#2196F3',
    font: '#1565C0'
  },
  'external-entity-output': {
    background: '#FFF3E0',
    border: '#FF9800',
    font: '#E65100'
  },
  'process': {
    background: '#F3E5F5',
    border: '#9C27B0',
    font: '#6A1B9A'
  },
  'data-store': {
    background: '#E8F5E9',
    border: '#4CAF50',
    font: '#2E7D32'
  },
  'subgraph': {
    background: '#FFF9C4',
    border: '#FBC02D',
    font: '#F57F17'
  },
  'exported-handler': {
    background: '#E8F5E9',
    border: '#4CAF50',
    font: '#2E7D32'
  }
};

/**
 * Node color configuration for dark theme
 */
const DARK_THEME_COLORS = {
  'external-entity-input': {
    background: '#1E3A5F',
    border: '#42A5F5',
    font: '#90CAF9'
  },
  'external-entity-output': {
    background: '#4A3A2A',
    border: '#FFB74D',
    font: '#FFD54F'
  },
  'process': {
    background: '#3A2A4A',
    border: '#BA68C8',
    font: '#CE93D8'
  },
  'data-store': {
    background: '#2A4A2A',
    border: '#66BB6A',
    font: '#A5D6A7'
  },
  'subgraph': {
    background: '#4A4A2A',
    border: '#FDD835',
    font: '#FFEB3B'
  },
  'exported-handler': {
    background: '#2A4A2A',
    border: '#66BB6A',
    font: '#A5D6A7'
  }
};

/**
 * Edge color configuration
 */
const EDGE_COLORS = {
  light: '#757575',
  dark: '#CCCCCC'
};

/**
 * Get node colors based on type and theme
 */
function getNodeColors(
  nodeType: DFDNode['type'],
  theme: 'light' | 'dark',
  metadata?: Record<string, any>
): { background: string; border: string; font: string } {
  const colorMap = theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  
  // Check if this is an exported-handler node
  if (metadata?.processType === 'exported-handler') {
    return colorMap['exported-handler'];
  }
  
  return colorMap[nodeType];
}

/**
 * Get node shape based on type
 */
function getNodeShape(nodeType: DFDNode['type'], metadata?: Record<string, any>): 'box' | 'ellipse' | 'hexagon' {
  // JSX elements and subgraphs use hexagon shape
  if (nodeType === 'external-entity-output' || nodeType === 'subgraph') {
    return 'hexagon';
  }
  
  // All other nodes use box shape
  return 'box';
}

/**
 * Transform a DFD node to vis.js node format
 */
function transformNode(node: DFDNode, theme: 'light' | 'dark'): VisNode {
  const colors = getNodeColors(node.type, theme, node.metadata);
  const shape = getNodeShape(node.type, node.metadata);

  const visNode: VisNode = {
    id: node.id,
    label: node.label,
    shape,
    color: {
      background: colors.background,
      border: colors.border
    },
    font: {
      size: 14,
      color: colors.font
    },
    metadata: node.metadata
  };
  
  // Set tighter margins for JSX elements and subgraphs
  if (shape === 'hexagon') {
    visNode.margin = 5;
  }

  // Set level and group for hierarchical layout
  // Level 0 = leftmost (input props), Level 4 = rightmost (output props/JSX)
  
  // Input props (data props) - leftmost
  if (node.type === 'external-entity-input' && node.metadata?.category === 'prop' && !node.metadata?.isFunction) {
    visNode.level = 0;
    visNode.group = 'input-props';
  }
  // Output props (function props) - rightmost
  else if (node.type === 'external-entity-input' && node.metadata?.category === 'prop' && node.metadata?.isFunction) {
    visNode.level = 5;
    visNode.group = 'output-props';
  }
  // Other inputs (context, etc.)
  else if (node.type === 'external-entity-input') {
    visNode.level = 0;
  }
  // Data stores (state, refs)
  else if (node.type === 'data-store') {
    visNode.level = 1;
  }
  // Exported handler nodes
  else if (node.metadata?.processType === 'exported-handler') {
    visNode.level = 2;
    visNode.group = 'exported-handler';
    visNode.shapeProperties = {
      borderDashes: [2, 0, 2, 0] // Creates vertical lines on left and right
    };
    visNode.borderWidth = 2;
    visNode.borderWidthSelected = 3;
    // Include parentId for grouping
    if (node.metadata?.parentProcessId) {
      visNode.metadata = {
        ...visNode.metadata,
        parentId: node.metadata.parentProcessId
      };
    }
  }
  // Processes
  else if (node.type === 'process') {
    visNode.level = 2;
    visNode.shapeProperties = {
      borderDashes: [2, 0, 2, 0] // Creates vertical lines on left and right
    };
    visNode.borderWidth = 3;
    visNode.borderWidthSelected = 4;
  }
  // JSX elements - grouped
  else if (node.metadata?.category === 'jsx-element') {
    visNode.level = 3;
    visNode.group = 'jsx-output';
    visNode.borderWidth = 2;
  }
  // JSX Output parent - to the right of JSX elements
  else if (node.metadata?.category === 'jsx-parent') {
    visNode.level = 4;
    visNode.shapeProperties = {
      borderDashes: [5, 5]
    };
    visNode.borderWidth = 2;
  }
  // Other outputs
  else if (node.type === 'external-entity-output') {
    visNode.level = 3;
  }

  return visNode;
}

/**
 * Transform a DFD edge to vis.js edge format
 */
function transformEdge(edge: DFDEdge, theme: 'light' | 'dark'): VisEdge {
  const edgeColor = theme === 'dark' ? EDGE_COLORS.dark : EDGE_COLORS.light;

  return {
    from: edge.from,
    to: edge.to,
    label: edge.label,
    arrows: 'to',
    dashes: edge.isCleanup || false,
    color: edgeColor,
    smooth: {
      type: 'cubicBezier'
    }
  };
}

/**
 * Transform DFD data to vis.js format
 */
/**
 * Recursively collect all nodes from a subgraph tree
 */
function collectNodesFromSubgraph(subgraph: DFDSubgraph): DFDNode[] {
  const nodes: DFDNode[] = [];
  
  for (const element of subgraph.elements) {
    if ('type' in element && (element.type === 'jsx-output' || element.type === 'conditional')) {
      // It's a subgraph, recurse
      nodes.push(...collectNodesFromSubgraph(element as DFDSubgraph));
    } else {
      // It's a node
      nodes.push(element as DFDNode);
    }
  }
  
  return nodes;
}

/**
 * Transform subgraph nodes with special handling for conditional subgraphs
 */
function transformSubgraphNodes(
  subgraph: DFDSubgraph,
  theme: 'light' | 'dark',
  parentLevel: number = 3
): VisNode[] {
  const visNodes: VisNode[] = [];
  
  for (const element of subgraph.elements) {
    if ('type' in element && (element.type === 'jsx-output' || element.type === 'conditional')) {
      // It's a nested subgraph, recurse
      const nestedSubgraph = element as DFDSubgraph;
      visNodes.push(...transformSubgraphNodes(nestedSubgraph, theme, parentLevel));
    } else {
      // It's a node
      const node = element as DFDNode;
      const visNode = transformNode(node, theme);
      
      // Override level for nodes within subgraphs
      visNode.level = parentLevel;
      visNode.group = `subgraph-${subgraph.id}`;
      
      visNodes.push(visNode);
    }
  }
  
  return visNodes;
}

export function transformDFDData(
  dfdData: DFDSourceData,
  theme: 'light' | 'dark'
): VisNetworkData {
  let nodes: VisNode[];
  
  // If we have a root subgraph, collect nodes from it
  if (dfdData.rootSubgraph) {
    // Transform nodes from subgraph structure
    const subgraphNodes = transformSubgraphNodes(dfdData.rootSubgraph, theme);
    
    // Transform regular nodes (non-JSX nodes)
    const regularNodes = dfdData.nodes
      .filter(node => node.metadata?.category !== 'jsx-element' && node.metadata?.category !== 'jsx-parent')
      .map(node => transformNode(node, theme));
    
    nodes = [...regularNodes, ...subgraphNodes];
  } else {
    // Fallback to original behavior
    nodes = dfdData.nodes.map(node => transformNode(node, theme));
  }
  
  // Add nodes from additional subgraphs (e.g., exported handlers)
  if (dfdData.subgraphs && dfdData.subgraphs.length > 0) {
    for (const subgraph of dfdData.subgraphs) {
      const subgraphNodes = transformSubgraphNodes(subgraph, theme);
      nodes = [...nodes, ...subgraphNodes];
    }
  }
  
  const edges = dfdData.edges.map(edge => transformEdge(edge, theme));

  return {
    nodes,
    edges
  };
}
