/**
 * Transform DFD data to Mermaid diagram format
 */

import { DFDSourceData, DFDNode, DFDEdge } from '../parser/types';

/**
 * Get Mermaid shape for node type
 */
function getMermaidShape(node: DFDNode): { prefix: string; suffix: string } {
  // JSX elements - hexagon
  if (node.metadata?.category === 'jsx-element' || node.metadata?.category === 'jsx-parent') {
    return { prefix: '{{', suffix: '}}' };
  }
  
  // Processes (event handlers, computations) - subprocess (rounded rectangle with vertical lines)
  if (node.type === 'process') {
    return { prefix: '[[', suffix: ']]' };
  }
  
  // Props - rounded rectangle
  if (node.type === 'external-entity-input' && node.metadata?.category === 'prop') {
    return { prefix: '(', suffix: ')' };
  }
  
  // State/Data stores - cylindrical
  if (node.type === 'data-store') {
    return { prefix: '[(', suffix: ')]' };
  }
  
  // Default - rectangle
  return { prefix: '[', suffix: ']' };
}

/**
 * Sanitize node ID for Mermaid (alphanumeric and underscores only)
 */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Sanitize label for Mermaid (escape special characters)
 */
function sanitizeLabel(label: string): string {
  return label
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '#quot;')
    .replace(/\n/g, '<br/>');
}

/**
 * Transform DFD data to Mermaid flowchart format
 */
export function transformToMermaid(dfdData: DFDSourceData): string {
  const lines: string[] = [];
  
  // Start with flowchart LR (left to right)
  lines.push('flowchart LR');
  
  // Group nodes by category
  const inputProps: DFDNode[] = [];
  const outputProps: DFDNode[] = [];
  const jsxElements: DFDNode[] = [];
  const jsxParent: DFDNode | null = dfdData.nodes.find(n => n.metadata?.category === 'jsx-parent') || null;
  const otherNodes: DFDNode[] = [];
  
  for (const node of dfdData.nodes) {
    if (node.type === 'external-entity-input' && node.metadata?.category === 'prop') {
      if (node.metadata?.isFunction) {
        outputProps.push(node);
      } else {
        inputProps.push(node);
      }
    } else if (node.metadata?.category === 'jsx-element') {
      jsxElements.push(node);
    } else if (node.metadata?.category === 'jsx-parent') {
      // Skip JSX parent node - we only show elements in the subgraph
      continue;
    } else {
      otherNodes.push(node);
    }
  }
  
  // Create Input Props subgraph (TB - top to bottom)
  if (inputProps.length > 0) {
    lines.push('  subgraph InputProps["Input Props"]');
    lines.push('    direction TB');
    for (const node of inputProps) {
      const shape = getMermaidShape(node);
      const id = sanitizeId(node.id);
      const label = sanitizeLabel(node.label);
      lines.push(`    ${id}${shape.prefix}"${label}"${shape.suffix}`);
    }
    lines.push('  end');
  }
  
  // Create other nodes (not in subgraphs)
  for (const node of otherNodes) {
    const shape = getMermaidShape(node);
    const id = sanitizeId(node.id);
    const label = sanitizeLabel(node.label);
    lines.push(`  ${id}${shape.prefix}"${label}"${shape.suffix}`);
  }
  
  // Create JSX Output subgraph (TB - top to bottom)
  if (jsxElements.length > 0) {
    lines.push('  subgraph JSXOutput["JSX Output"]');
    lines.push('    direction TB');
    
    // Add JSX elements only (not the parent node)
    for (const node of jsxElements) {
      const shape = getMermaidShape(node);
      const id = sanitizeId(node.id);
      const label = sanitizeLabel(node.label);
      lines.push(`    ${id}${shape.prefix}"${label}"${shape.suffix}`);
    }
    lines.push('  end');
  }
  
  // Create Output Props subgraph (TB - top to bottom)
  if (outputProps.length > 0) {
    lines.push('  subgraph OutputProps["Output Props"]');
    lines.push('    direction TB');
    for (const node of outputProps) {
      const shape = getMermaidShape(node);
      const id = sanitizeId(node.id);
      const label = sanitizeLabel(node.label);
      lines.push(`    ${id}${shape.prefix}"${label}"${shape.suffix}`);
    }
    lines.push('  end');
  }
  
  // Add edges
  for (const edge of dfdData.edges) {
    const fromId = sanitizeId(edge.from);
    const toId = sanitizeId(edge.to);
    const label = edge.label ? sanitizeLabel(edge.label) : '';
    
    // Use dashed line for cleanup/containment edges
    const lineStyle = edge.isCleanup ? '-.->' : '-->';
    
    if (label) {
      lines.push(`  ${fromId} ${lineStyle}|"${label}"| ${toId}`);
    } else {
      lines.push(`  ${fromId} ${lineStyle} ${toId}`);
    }
  }
  
  // Add styling
  lines.push('');
  lines.push('  %% Styling');
  lines.push('  classDef inputProp fill:#E3F2FD,stroke:#2196F3,stroke-width:2px');
  lines.push('  classDef outputProp fill:#FFF3E0,stroke:#FF9800,stroke-width:2px');
  lines.push('  classDef process fill:#F3E5F5,stroke:#9C27B0,stroke-width:3px');
  lines.push('  classDef dataStore fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px');
  lines.push('  classDef jsxElement fill:#FFF3E0,stroke:#FF9800,stroke-width:2px');
  
  // Apply classes to nodes
  for (const node of inputProps) {
    lines.push(`  class ${sanitizeId(node.id)} inputProp`);
  }
  for (const node of outputProps) {
    lines.push(`  class ${sanitizeId(node.id)} outputProp`);
  }
  for (const node of otherNodes) {
    if (node.type === 'process') {
      lines.push(`  class ${sanitizeId(node.id)} process`);
    } else if (node.type === 'data-store') {
      lines.push(`  class ${sanitizeId(node.id)} dataStore`);
    }
  }
  for (const node of jsxElements) {
    lines.push(`  class ${sanitizeId(node.id)} jsxElement`);
  }
  
  return lines.join('\n');
}
