/**
 * Transform DFD data to Mermaid diagram format
 */

import { DFDSourceData, DFDNode, DFDEdge, DFDSubgraph } from '@web-component-analyzer/analyzer';

/**
 * Get Mermaid shape for node type
 */
function getMermaidShape(node: DFDNode): { prefix: string; suffix: string } {
  // Vue emit and Svelte event nodes - rounded (rounded rectangle)
  if (node.metadata?.category === 'vue-emit' || node.metadata?.category === 'svelte-event') {
    return { prefix: '(', suffix: ')' };
  }
  
  // JSX elements and subgraphs - hexagon
  if (node.metadata?.category === 'jsx-element' || 
      node.metadata?.category === 'jsx-parent' ||
      node.type === 'subgraph') {
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
/**
 * Recursively render a subgraph and its nested subgraphs
 */
function renderSubgraph(
  subgraph: DFDSubgraph,
  lines: string[],
  indent: string = '  '
): void {
  // Generate subgraph label
  let subgraphLabel = subgraph.label;
  if (subgraph.type === 'conditional' && subgraph.condition) {
    // Use condition expression for conditional subgraphs
    subgraphLabel = `{${subgraph.condition.expression}}`;
  } else if (subgraph.type === 'loop' || subgraph.type === 'loop-conditional') {
    // Loop subgraphs already have the correct label format from buildVueLoopSubgraphs
    // e.g., "{v-for: items}" or "{v-for: items, v-if: item.active}"
    subgraphLabel = subgraph.label;
  } else if (subgraph.type === 'await') {
    // Await subgraphs already have the correct label format from buildSvelteAwaitEdges
    // e.g., "{#await dataPromise}"
    subgraphLabel = subgraph.label;
  } else if (subgraph.type === 'exported-handlers') {
    // Use "exported handlers" label for imperative handle subgraphs
    subgraphLabel = 'exported handlers';
  }
  
  const subgraphId = sanitizeId(subgraph.id);
  lines.push(`${indent}subgraph ${subgraphId}["${sanitizeLabel(subgraphLabel)}"]`);
  lines.push(`${indent}  direction TB`);
  
  // Render elements within the subgraph
  for (const element of subgraph.elements) {
    if ('type' in element && (element.type === 'jsx-output' || element.type === 'conditional' || element.type === 'loop' || element.type === 'loop-conditional' || element.type === 'await' || element.type === 'exported-handlers')) {
      // It's a nested subgraph, recurse
      renderSubgraph(element as DFDSubgraph, lines, indent + '  ');
    } else {
      // It's a node
      const node = element as DFDNode;
      const id = sanitizeId(node.id);
      let label = sanitizeLabel(node.label);
      
      // Vue emit and Svelte event nodes should be rounded shape (rounded rectangle) without angle brackets
      const isVueEmit = node.metadata?.category === 'vue-emit';
      const isSvelteEvent = node.metadata?.category === 'svelte-event';
      const isEventNode = isVueEmit || isSvelteEvent;
      
      // Add angle brackets for JSX elements (but not for text nodes or event nodes)
      if (node.type === 'external-entity-output' && !isEventNode && !label.startsWith('&lt;') && !label.startsWith('#quot;')) {
        label = `&lt;${label}&gt;`;
      }
      
      // Use new syntax for JSX elements (hex shape), but rounded for event nodes
      if (isEventNode) {
        lines.push(`${indent}    ${id}@{ shape: rounded, label: "${label}" }`);
      } else if (node.type === 'external-entity-output' || node.type === 'subgraph') {
        lines.push(`${indent}    ${id}@{ shape: hex, label: "${label}" }`);
      } else {
        const shape = getMermaidShape(node);
        lines.push(`${indent}    ${id}${shape.prefix}"${label}"${shape.suffix}`);
      }
    }
  }
  
  lines.push(`${indent}end`);
}

/**
 * Collect all nodes from a subgraph tree for styling
 */
function collectNodesFromSubgraph(subgraph: DFDSubgraph): DFDNode[] {
  const nodes: DFDNode[] = [];
  
  for (const element of subgraph.elements) {
    if ('type' in element && (element.type === 'jsx-output' || element.type === 'conditional' || element.type === 'loop' || element.type === 'loop-conditional' || element.type === 'await' || element.type === 'exported-handlers')) {
      // It's a subgraph, recurse
      nodes.push(...collectNodesFromSubgraph(element as DFDSubgraph));
    } else {
      // It's a node
      nodes.push(element as DFDNode);
    }
  }
  
  return nodes;
}

export function transformToMermaid(dfdData: DFDSourceData): string {
  const lines: string[] = [];
  
  // Check if there are any nodes to display
  if (!dfdData.nodes || dfdData.nodes.length === 0) {
    // Return a simple message diagram
    lines.push('flowchart LR');
    lines.push('  message["No data flow detected in this component"]');
    lines.push('  style message fill:#f9f9f9,stroke:#999,stroke-width:2px');
    return lines.join('\n');
  }
  
  // Add hand-drawn sketch style (requires Mermaid v10.6.0+)
  // If not working, the Mermaid version might be too old
  lines.push("%%{init: {'theme': 'base', 'themeVariables': {'fontFamily': 'Comic Sans MS, cursive'}, 'flowchart': {'curve': 'basis', 'padding': 20}}}%%");
  
  // Start with flowchart LR (left to right)
  lines.push('flowchart LR');
  
  // Group nodes by category
  const inputProps: DFDNode[] = [];
  const outputProps: DFDNode[] = [];
  const jsxSubgraphs: Map<string, DFDNode[]> = new Map(); // subgraph name -> JSX nodes
  const jsxParent: DFDNode | null = dfdData.nodes.find(n => n.metadata?.category === 'jsx-parent') || null;
  const contextSubgraphs: Map<string, DFDNode[]> = new Map(); // subgraph name -> nodes
  const otherNodes: DFDNode[] = [];
  
  // Collect JSX nodes from rootSubgraph if it exists
  let jsxNodesFromSubgraph: DFDNode[] = [];
  if (dfdData.rootSubgraph) {
    jsxNodesFromSubgraph = collectNodesFromSubgraph(dfdData.rootSubgraph);
  }
  
  for (const node of dfdData.nodes) {
    if (node.metadata?.category === 'prop') {
      // Props can be either external-entity-input or external-entity-output
      if (node.metadata?.isFunctionType || node.type === 'external-entity-output') {
        outputProps.push(node);
      } else {
        inputProps.push(node);
      }
    } else if (node.metadata?.category === 'jsx-element') {
      // Skip JSX elements if we have a rootSubgraph (they'll be rendered from the subgraph)
      if (dfdData.rootSubgraph) {
        continue;
      }
      
      // Group JSX elements by subgraph (variable they use)
      const subgraphName = node.metadata?.subgraph;
      if (subgraphName) {
        if (!jsxSubgraphs.has(subgraphName)) {
          jsxSubgraphs.set(subgraphName, []);
        }
        jsxSubgraphs.get(subgraphName)!.push(node);
      }
      // Note: JSX elements without subgraph are not displayed
    } else if (node.metadata?.category === 'jsx-parent') {
      // Skip JSX parent node - we only show elements in the subgraph
      continue;
    } else if (node.metadata?.category === 'context-data' || 
               node.metadata?.category === 'context-function' ||
               node.metadata?.category === 'custom-hook-data' ||
               node.metadata?.category === 'custom-hook-function') {
      // Group context and custom hook nodes by subgraph
      const subgraphName = node.metadata?.subgraph;
      if (subgraphName) {
        if (!contextSubgraphs.has(subgraphName)) {
          contextSubgraphs.set(subgraphName, []);
        }
        contextSubgraphs.get(subgraphName)!.push(node);
      } else {
        otherNodes.push(node);
      }
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
  
  // Create context subgraphs
  for (const [subgraphName, nodes] of contextSubgraphs.entries()) {
    const displayName = subgraphName.replace(/-input$/, ' - Input').replace(/-output$/, ' - Output');
    lines.push(`  subgraph ${sanitizeId(subgraphName)}["${displayName}"]`);
    lines.push('    direction TB');
    for (const node of nodes) {
      const shape = getMermaidShape(node);
      const id = sanitizeId(node.id);
      const label = sanitizeLabel(node.label);
      lines.push(`    ${id}${shape.prefix}"${label}"${shape.suffix}`);
    }
    lines.push('  end');
  }

  // Create other nodes (not in subgraphs)
  for (const node of otherNodes) {
    const id = sanitizeId(node.id);
    const label = sanitizeLabel(node.label);
    
    // Use new syntax for subgraph nodes (hex shape)
    if (node.type === 'subgraph') {
      lines.push(`  ${id}@{ shape: hex, label: "${label}" }`);
    } else {
      const shape = getMermaidShape(node);
      lines.push(`  ${id}${shape.prefix}"${label}"${shape.suffix}`);
    }
  }
  
  // Render JSX output using rootSubgraph if available
  if (dfdData.rootSubgraph) {
    renderSubgraph(dfdData.rootSubgraph, lines, '  ');
  } else {
    // Fallback: Create JSX subgraphs grouped by variable
    for (const [subgraphName, nodes] of jsxSubgraphs.entries()) {
      // Extract variable name from subgraph name (jsx-variableName)
      const variableName = subgraphName.replace(/^jsx-/, '');
      const displayName = `{${variableName}}`;
      lines.push(`  subgraph ${sanitizeId(subgraphName)}["${displayName}"]`);
      lines.push('    direction TB');
      
      for (const node of nodes) {
        const id = sanitizeId(node.id);
        let label = sanitizeLabel(node.label);
        
        // Vue emit and Svelte event nodes should be rounded shape (rounded rectangle) without angle brackets
        const isVueEmit = node.metadata?.category === 'vue-emit';
        const isSvelteEvent = node.metadata?.category === 'svelte-event';
        const isEventNode = isVueEmit || isSvelteEvent;
        
        // Add angle brackets for JSX elements (but not for text nodes or event nodes)
        if (node.type === 'external-entity-output' && !isEventNode && !label.startsWith('&lt;') && !label.startsWith('#quot;')) {
          label = `&lt;${label}&gt;`;
        }
        
        // Use new syntax for JSX elements, but rounded for event nodes
        if (isEventNode) {
          lines.push(`    ${id}@{ shape: rounded, label: "${label}" }`);
        } else if (node.type === 'external-entity-output') {
          lines.push(`    ${id}@{ shape: hex, label: "${label}" }`);
        } else {
          const shape = getMermaidShape(node);
          lines.push(`    ${id}${shape.prefix}"${label}"${shape.suffix}`);
        }
      }
      lines.push('  end');
    }
  }
  
  // Render additional subgraphs (e.g., exported handlers)
  if (dfdData.subgraphs && dfdData.subgraphs.length > 0) {
    for (const subgraph of dfdData.subgraphs) {
      renderSubgraph(subgraph, lines, '  ');
    }
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
    
    // Use dashed line for cleanup/containment edges, longer arrows for exported handlers
    let lineStyle: string;
    if (edge.isCleanup) {
      lineStyle = '-.->';
    } else if (edge.isLongArrow) {
      lineStyle = '---->'; // Longer arrow for exported handler connections
    } else {
      lineStyle = '-->';
    }
    
    // Generate unique edge ID for animation
    const edgeId = `e${fromId}_${toId}`;
    
    if (label) {
      lines.push(`  ${fromId} ${edgeId}@${lineStyle}|"${label}"| ${toId}`);
    } else {
      lines.push(`  ${fromId} ${edgeId}@${lineStyle} ${toId}`);
    }
    
    // Add animation to edge
    lines.push(`  ${edgeId}@{ animate: true }`);
  }
  
  // Add styling
  lines.push('');
  lines.push('  %% Styling');
  lines.push('  classDef inputProp fill:#E3F2FD,stroke:#2196F3,stroke-width:2px');
  lines.push('  classDef outputProp fill:#FFF3E0,stroke:#FF9800,stroke-width:2px');
  lines.push('  classDef process fill:#F3E5F5,stroke:#9C27B0,stroke-width:3px');
  lines.push('  classDef dataStore fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px');
  lines.push('  classDef jsxElement fill:#FFF3E0,stroke:#FF9800,stroke-width:2px');
  lines.push('  classDef contextData fill:#E1F5FE,stroke:#0288D1,stroke-width:2px');
  lines.push('  classDef contextFunction fill:#FFF9C4,stroke:#F57C00,stroke-width:2px');
  lines.push('  classDef exportedHandler fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px');
  
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
  
  // Apply classes to JSX nodes from subgraph
  if (dfdData.rootSubgraph) {
    for (const node of jsxNodesFromSubgraph) {
      lines.push(`  class ${sanitizeId(node.id)} jsxElement`);
    }
  } else {
    // Fallback: apply classes to old-style JSX subgraphs
    for (const nodes of jsxSubgraphs.values()) {
      for (const node of nodes) {
        lines.push(`  class ${sanitizeId(node.id)} jsxElement`);
      }
    }
  }
  
  for (const nodes of contextSubgraphs.values()) {
    for (const node of nodes) {
      if (node.metadata?.category === 'context-data') {
        lines.push(`  class ${sanitizeId(node.id)} contextData`);
      } else if (node.metadata?.category === 'context-function') {
        lines.push(`  class ${sanitizeId(node.id)} contextFunction`);
      }
    }
  }
  
  // Apply classes to exported handler nodes from subgraphs
  if (dfdData.subgraphs && dfdData.subgraphs.length > 0) {
    for (const subgraph of dfdData.subgraphs) {
      if (subgraph.type === 'exported-handlers') {
        const exportedHandlerNodes = collectNodesFromSubgraph(subgraph);
        for (const node of exportedHandlerNodes) {
          if (node.metadata?.processType === 'exported-handler') {
            lines.push(`  class ${sanitizeId(node.id)} exportedHandler`);
          }
        }
      }
    }
  }
  
  return lines.join('\n');
}
