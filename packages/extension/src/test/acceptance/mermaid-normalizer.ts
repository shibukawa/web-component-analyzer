/**
 * Mermaid diagram normalizer
 * Normalizes Mermaid diagrams to handle formatting variations
 */

export interface NormalizationOptions {
  ignoreWhitespace?: boolean;
  ignoreQuoteStyle?: boolean;
  ignoreComments?: boolean;
  ignoreClassDefinitions?: boolean;
  ignoreStyleDefinitions?: boolean;
}

export interface NormalizedDiagram {
  nodes: Set<string>;           // Normalized node definitions
  edges: Set<string>;           // Normalized edge definitions
  subgraphs: Set<string>;       // Normalized subgraph definitions
  originalText: string;         // Original input
}

/**
 * Remove comments from Mermaid text
 */
function removeComments(text: string): string {
  // Remove %% comments
  return text.replace(/%%.*$/gm, '').trim();
}

/**
 * Remove style and class definitions
 */
function removeStyleDefinitions(text: string): string {
  // Remove style definitions: style nodeId fill:...
  text = text.replace(/^\s*style\s+\w+.*$/gm, '');
  // Remove class definitions: class nodeId className
  text = text.replace(/^\s*class\s+\w+.*$/gm, '');
  // Remove classDef definitions: classDef className ...
  text = text.replace(/^\s*classDef\s+\w+.*$/gm, '');
  return text;
}

/**
 * Normalize whitespace
 */
function normalizeWhitespace(text: string): string {
  // Remove leading/trailing whitespace from each line
  let lines = text.split('\n').map(line => line.trim());
  // Remove empty lines
  lines = lines.filter(line => line.length > 0);
  return lines.join('\n');
}

/**
 * Normalize quote styles to double quotes
 */
function normalizeQuotes(text: string): string {
  // Replace single quotes with double quotes in labels
  // Be careful not to replace quotes inside already double-quoted strings
  return text.replace(/'([^']*)'/g, '"$1"');
}

/**
 * Normalize HTML entities
 */
function normalizeHtmlEntities(text: string): string {
  // Decode HTML entities to their character equivalents
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Extract node definitions from Mermaid text
 */
function extractNodes(text: string): Set<string> {
  const nodes = new Set<string>();
  
  // Match node definitions: id[label], id(label), id{label}, id{{label}}, id[(label)], id[[label]]
  // Also match new syntax: id@{ shape: ..., label: "..." }
  const nodePatterns = [
    /(\w+)\s*\[\s*"([^"]*)"\s*\]/g,           // [label]
    /(\w+)\s*\(\s*"([^"]*)"\s*\)/g,           // (label)
    /(\w+)\s*\{\s*"([^"]*)"\s*\}/g,           // {label}
    /(\w+)\s*\{\{\s*"([^"]*)"\s*\}\}/g,       // {{label}}
    /(\w+)\s*\[\(\s*"([^"]*)"\s*\)\]/g,       // [(label)]
    /(\w+)\s*\[\[\s*"([^"]*)"\s*\]\]/g,       // [[label]]
    /(\w+)@\{\s*shape:\s*\w+,\s*label:\s*"([^"]*)"\s*\}/g,  // @{ shape: ..., label: "..." }
  ];
  
  for (const pattern of nodePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const nodeId = match[1];
      const label = match[2];
      nodes.add(`node:${nodeId}:${label}`);
    }
  }
  
  return nodes;
}

/**
 * Extract edge definitions from Mermaid text
 */
function extractEdges(text: string): Set<string> {
  const edges = new Set<string>();
  
  // Match edge definitions: from --> to, from -->|label| to, from -.- to, etc.
  // Also match new syntax with edge IDs: from edgeId@--> to
  const edgePatterns = [
    /(\w+)\s+(?:\w+@)?(?:-->|--\|[^|]*\|-->|-\.-|---->)\s*(?:\|"([^"]*)"\|)?\s*(\w+)/g,
  ];
  
  // More flexible pattern that captures various edge formats
  const flexiblePattern = /(\w+)\s+(?:\w+@)?(?:-->|--\|[^|]*\|-->|-\.-|---->)\s*(?:\|"([^"]*)"\|)?\s*(\w+)/g;
  
  let match;
  while ((match = flexiblePattern.exec(text)) !== null) {
    const from = match[1];
    const label = match[2] || '';
    const to = match[3];
    edges.add(`edge:${from}:${to}:${label}`);
  }
  
  return edges;
}

/**
 * Extract subgraph definitions from Mermaid text
 */
function extractSubgraphs(text: string): Set<string> {
  const subgraphs = new Set<string>();
  
  // Match subgraph definitions: subgraph id["label"]
  const subgraphPattern = /subgraph\s+(\w+)\s*\[\s*"([^"]*)"\s*\]/g;
  
  let match;
  while ((match = subgraphPattern.exec(text)) !== null) {
    const subgraphId = match[1];
    const label = match[2];
    subgraphs.add(`subgraph:${subgraphId}:${label}`);
  }
  
  return subgraphs;
}

/**
 * Normalize a Mermaid diagram
 */
export function normalizeMermaid(
  mermaidText: string,
  options: NormalizationOptions = {}
): NormalizedDiagram {
  const {
    ignoreWhitespace = true,
    ignoreQuoteStyle = true,
    ignoreComments = true,
    ignoreClassDefinitions = true,
    ignoreStyleDefinitions = true,
  } = options;
  
  let normalized = mermaidText;
  
  // Apply normalizations
  if (ignoreComments) {
    normalized = removeComments(normalized);
  }
  
  if (ignoreStyleDefinitions) {
    normalized = removeStyleDefinitions(normalized);
  }
  
  if (ignoreWhitespace) {
    normalized = normalizeWhitespace(normalized);
  }
  
  if (ignoreQuoteStyle) {
    normalized = normalizeQuotes(normalized);
  }
  
  // Normalize HTML entities
  normalized = normalizeHtmlEntities(normalized);
  
  // Extract core elements
  const nodes = extractNodes(normalized);
  const edges = extractEdges(normalized);
  const subgraphs = extractSubgraphs(normalized);
  
  return {
    nodes,
    edges,
    subgraphs,
    originalText: mermaidText,
  };
}

/**
 * Compare two normalized diagrams and return differences
 */
export interface ComparisonResult {
  passed: boolean;
  missingNodes: string[];
  extraNodes: string[];
  missingEdges: string[];
  extraEdges: string[];
  missingSubgraphs: string[];
  extraSubgraphs: string[];
}

export function compareDiagrams(
  generated: NormalizedDiagram,
  reference: NormalizedDiagram
): ComparisonResult {
  const missingNodes: string[] = [];
  const extraNodes: string[] = [];
  const missingEdges: string[] = [];
  const extraEdges: string[] = [];
  const missingSubgraphs: string[] = [];
  const extraSubgraphs: string[] = [];
  
  // Find missing and extra nodes
  for (const node of reference.nodes) {
    if (!generated.nodes.has(node)) {
      missingNodes.push(node);
    }
  }
  
  for (const node of generated.nodes) {
    if (!reference.nodes.has(node)) {
      extraNodes.push(node);
    }
  }
  
  // Find missing and extra edges
  for (const edge of reference.edges) {
    if (!generated.edges.has(edge)) {
      missingEdges.push(edge);
    }
  }
  
  for (const edge of generated.edges) {
    if (!reference.edges.has(edge)) {
      extraEdges.push(edge);
    }
  }
  
  // Find missing and extra subgraphs
  for (const subgraph of reference.subgraphs) {
    if (!generated.subgraphs.has(subgraph)) {
      missingSubgraphs.push(subgraph);
    }
  }
  
  for (const subgraph of generated.subgraphs) {
    if (!reference.subgraphs.has(subgraph)) {
      extraSubgraphs.push(subgraph);
    }
  }
  
  const passed =
    missingNodes.length === 0 &&
    extraNodes.length === 0 &&
    missingEdges.length === 0 &&
    extraEdges.length === 0 &&
    missingSubgraphs.length === 0 &&
    extraSubgraphs.length === 0;
  
  return {
    passed,
    missingNodes,
    extraNodes,
    missingEdges,
    extraEdges,
    missingSubgraphs,
    extraSubgraphs,
  };
}

/**
 * Generate a human-readable diff report
 */
export function generateDiffReport(result: ComparisonResult): string {
  const lines: string[] = [];
  
  if (result.passed) {
    lines.push('✓ Test passed - diagrams match');
    return lines.join('\n');
  }
  
  lines.push('✗ Test failed - diagrams differ:');
  lines.push('');
  
  if (result.missingNodes.length > 0) {
    lines.push('Missing nodes (in reference but not in generated):');
    for (const node of result.missingNodes) {
      lines.push(`  - ${node}`);
    }
    lines.push('');
  }
  
  if (result.extraNodes.length > 0) {
    lines.push('Extra nodes (in generated but not in reference):');
    for (const node of result.extraNodes) {
      lines.push(`  - ${node}`);
    }
    lines.push('');
  }
  
  if (result.missingEdges.length > 0) {
    lines.push('Missing edges (in reference but not in generated):');
    for (const edge of result.missingEdges) {
      lines.push(`  - ${edge}`);
    }
    lines.push('');
  }
  
  if (result.extraEdges.length > 0) {
    lines.push('Extra edges (in generated but not in reference):');
    for (const edge of result.extraEdges) {
      lines.push(`  - ${edge}`);
    }
    lines.push('');
  }
  
  if (result.missingSubgraphs.length > 0) {
    lines.push('Missing subgraphs (in reference but not in generated):');
    for (const subgraph of result.missingSubgraphs) {
      lines.push(`  - ${subgraph}`);
    }
    lines.push('');
  }
  
  if (result.extraSubgraphs.length > 0) {
    lines.push('Extra subgraphs (in generated but not in reference):');
    for (const subgraph of result.extraSubgraphs) {
      lines.push(`  - ${subgraph}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}
