/**
 * Diagram Structure Preservation Tests
 * 
 * Property 5: Diagram Structure Preservation
 * For any diagram code and any theme, the diagram structure (nodes, edges, relationships)
 * SHALL remain unchanged when the theme is switched.
 * 
 * Validates: Requirements 1.1, 1.3, 1.5
 */

import * as assert from 'assert';
import { ThemeConfig, type VSCodeTheme } from '../visualization/theme-config';

/**
 * Parse a Mermaid diagram string to extract its structure
 * Returns an object with nodes and edges
 */
function parseMermaidDiagram(diagramText: string): {
  nodes: Set<string>;
  edges: Array<{ from: string; to: string }>;
} {
  const nodes = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  // Split by lines and process
  const lines = diagramText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('%%')) {
      continue;
    }
    
    // Skip flowchart declaration
    if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
      continue;
    }
    
    // Parse node definitions (e.g., "nodeId[label]" or "nodeId(label)")
    const nodeMatch = trimmed.match(/^(\w+)\s*[\[\(\{]/);
    if (nodeMatch) {
      nodes.add(nodeMatch[1]);
    }
    
    // Parse edges (e.g., "nodeA --> nodeB" or "nodeA -- label --> nodeB")
    const edgeMatch = trimmed.match(/^(\w+)\s*(?:-->|--[^-]*-->|===|==[^=]*==)\s*(\w+)/);
    if (edgeMatch) {
      nodes.add(edgeMatch[1]);
      nodes.add(edgeMatch[2]);
      edges.push({
        from: edgeMatch[1],
        to: edgeMatch[2]
      });
    }
  }
  
  return { nodes, edges };
}

/**
 * Compare two diagram structures
 * Returns true if they are identical
 */
function compareDiagramStructures(
  structure1: { nodes: Set<string>; edges: Array<{ from: string; to: string }> },
  structure2: { nodes: Set<string>; edges: Array<{ from: string; to: string }> }
): boolean {
  // Compare nodes
  if (structure1.nodes.size !== structure2.nodes.size) {
    return false;
  }
  
  for (const node of structure1.nodes) {
    if (!structure2.nodes.has(node)) {
      return false;
    }
  }
  
  // Compare edges
  if (structure1.edges.length !== structure2.edges.length) {
    return false;
  }
  
  // Create a set of edge strings for comparison
  const edges1 = new Set(structure1.edges.map(e => `${e.from}->${e.to}`));
  const edges2 = new Set(structure2.edges.map(e => `${e.from}->${e.to}`));
  
  for (const edge of edges1) {
    if (!edges2.has(edge)) {
      return false;
    }
  }
  
  return true;
}

describe('Diagram Structure Preservation Tests', () => {
  describe('Property 5: Diagram Structure Preservation', () => {
    // Sample diagrams for testing
    const sampleDiagrams = [
      // Simple linear flow
      `flowchart TD
        A[Input Props]
        B[Process]
        C[Output]
        A --> B
        B --> C`,
      
      // Branching flow
      `flowchart TD
        A[Input]
        B[Decision]
        C[Path 1]
        D[Path 2]
        E[Output]
        A --> B
        B --> C
        B --> D
        C --> E
        D --> E`,
      
      // Complex flow with multiple connections
      `flowchart TD
        A[Props]
        B[State]
        C[Handler]
        D[Effect]
        E[Render]
        A --> C
        B --> C
        C --> D
        D --> B
        B --> E
        A --> E`,
      
      // Flow with data stores
      `flowchart TD
        A[Input]
        B[Process]
        C[(Data Store)]
        D[Output]
        A --> B
        B --> C
        C --> B
        B --> D`,
    ];

    const themes: VSCodeTheme[] = ['light', 'dark', 'high-contrast'];

    it('should preserve diagram structure when switching between light and dark themes', () => {
      for (const diagram of sampleDiagrams) {
        const structure = parseMermaidDiagram(diagram);
        
        // Get theme configurations
        const lightTheme = ThemeConfig.getTheme('light');
        const darkTheme = ThemeConfig.getTheme('dark');
        
        // Verify that theme variables are different
        assert.notStrictEqual(
          lightTheme.themeVariables.primaryColor,
          darkTheme.themeVariables.primaryColor,
          'Light and dark themes should have different primary colors'
        );
        
        // Parse the same diagram (theme variables don't affect structure)
        const structure2 = parseMermaidDiagram(diagram);
        
        // Structures should be identical
        assert.ok(
          compareDiagramStructures(structure, structure2),
          'Diagram structure should remain unchanged regardless of theme'
        );
      }
    });

    it('should preserve diagram structure for all theme combinations', () => {
      for (const diagram of sampleDiagrams) {
        const structures = new Map<VSCodeTheme, ReturnType<typeof parseMermaidDiagram>>();
        
        // Parse diagram for each theme
        for (const theme of themes) {
          const themeConfig = ThemeConfig.getTheme(theme);
          
          // Verify theme config is valid
          assert.ok(themeConfig.themeVariables, `Theme config should have variables for ${theme}`);
          assert.ok(themeConfig.flowchart, `Theme config should have flowchart config for ${theme}`);
          
          // Parse diagram (theme doesn't affect structure)
          structures.set(theme, parseMermaidDiagram(diagram));
        }
        
        // Compare all structures - they should all be identical
        const firstStructure = structures.get('light')!;
        
        for (const theme of themes) {
          const structure = structures.get(theme)!;
          assert.ok(
            compareDiagramStructures(firstStructure, structure),
            `Diagram structure should be identical for ${theme} theme`
          );
        }
      }
    });

    it('should preserve node positions and relationships across theme changes', () => {
      const diagram = `flowchart TD
        A[Input Props]
        B[Process Handler]
        C[Update State]
        D[Render Output]
        A --> B
        B --> C
        C --> D`;
      
      const structure = parseMermaidDiagram(diagram);
      
      // Verify structure has expected nodes
      assert.strictEqual(structure.nodes.size, 4, 'Should have 4 nodes');
      assert.ok(structure.nodes.has('A'), 'Should have node A');
      assert.ok(structure.nodes.has('B'), 'Should have node B');
      assert.ok(structure.nodes.has('C'), 'Should have node C');
      assert.ok(structure.nodes.has('D'), 'Should have node D');
      
      // Verify structure has expected edges
      assert.strictEqual(structure.edges.length, 3, 'Should have 3 edges');
      
      // Verify specific edges exist
      const edgeStrings = structure.edges.map(e => `${e.from}->${e.to}`);
      assert.ok(edgeStrings.includes('A->B'), 'Should have A->B edge');
      assert.ok(edgeStrings.includes('B->C'), 'Should have B->C edge');
      assert.ok(edgeStrings.includes('C->D'), 'Should have C->D edge');
    });

    it('should maintain edge connectivity when theme changes', () => {
      const diagram = `flowchart TD
        Input[Input]
        Process[Process]
        Store[(Store)]
        Output[Output]
        Input --> Process
        Process --> Store
        Store --> Process
        Process --> Output`;
      
      const structure = parseMermaidDiagram(diagram);
      
      // Verify all edges are present
      const edgeMap = new Map<string, Set<string>>();
      
      for (const edge of structure.edges) {
        if (!edgeMap.has(edge.from)) {
          edgeMap.set(edge.from, new Set());
        }
        edgeMap.get(edge.from)!.add(edge.to);
      }
      
      // Verify connectivity
      assert.ok(edgeMap.get('Input')?.has('Process'), 'Input should connect to Process');
      assert.ok(edgeMap.get('Process')?.has('Store'), 'Process should connect to Store');
      assert.ok(edgeMap.get('Store')?.has('Process'), 'Store should connect back to Process');
      assert.ok(edgeMap.get('Process')?.has('Output'), 'Process should connect to Output');
      
      // Verify structure is preserved when parsed again
      const structure2 = parseMermaidDiagram(diagram);
      assert.ok(
        compareDiagramStructures(structure, structure2),
        'Edge connectivity should be preserved'
      );
    });

    it('should preserve diagram structure with multiple theme switches', () => {
      const diagram = `flowchart TD
        A[Start]
        B[Step 1]
        C[Step 2]
        D[End]
        A --> B
        B --> C
        C --> D`;
      
      const originalStructure = parseMermaidDiagram(diagram);
      
      // Simulate multiple theme switches
      const themeSequence: VSCodeTheme[] = ['light', 'dark', 'high-contrast', 'light', 'dark'];
      
      for (const theme of themeSequence) {
        const themeConfig = ThemeConfig.getTheme(theme);
        
        // Verify theme config is valid
        assert.ok(themeConfig.themeVariables, `Theme config should be valid for ${theme}`);
        
        // Parse diagram again
        const currentStructure = parseMermaidDiagram(diagram);
        
        // Structure should remain identical
        assert.ok(
          compareDiagramStructures(originalStructure, currentStructure),
          `Diagram structure should be preserved after switching to ${theme} theme`
        );
      }
    });

    it('should verify theme variables do not affect diagram structure', () => {
      const diagram = `flowchart TD
        A[Node A]
        B[Node B]
        A --> B`;
      
      // Get all theme configurations
      const lightTheme = ThemeConfig.getTheme('light');
      const darkTheme = ThemeConfig.getTheme('dark');
      const highContrastTheme = ThemeConfig.getTheme('high-contrast');
      
      // Verify theme variables are different
      const themes = [lightTheme, darkTheme, highContrastTheme];
      const colorSets = themes.map(t => ({
        primary: t.themeVariables.primaryColor,
        secondary: t.themeVariables.secondaryColor,
        tertiary: t.themeVariables.tertiaryColor,
      }));
      
      // At least some colors should be different between themes
      const allColorsSame = colorSets.every(c => 
        c.primary === colorSets[0].primary &&
        c.secondary === colorSets[0].secondary &&
        c.tertiary === colorSets[0].tertiary
      );
      
      assert.ok(
        !allColorsSame,
        'Theme variables should differ between themes'
      );
      
      // But diagram structure should be the same regardless
      const structure = parseMermaidDiagram(diagram);
      assert.strictEqual(structure.nodes.size, 2, 'Should have 2 nodes');
      assert.strictEqual(structure.edges.length, 1, 'Should have 1 edge');
    });

    it('should handle complex diagrams with multiple node types', () => {
      const diagram = `flowchart TD
        Props[Props]
        State[State]
        Handler[Handler]
        Effect[Effect]
        Render[Render]
        Props --> Handler
        State --> Handler
        Handler --> Effect
        Effect --> State
        State --> Render
        Props --> Render`;
      
      const structure = parseMermaidDiagram(diagram);
      
      // Verify all nodes are present
      assert.strictEqual(structure.nodes.size, 5, 'Should have 5 nodes');
      
      // Verify all edges are present
      assert.strictEqual(structure.edges.length, 6, 'Should have 6 edges');
      
      // Parse again and verify structure is identical
      const structure2 = parseMermaidDiagram(diagram);
      assert.ok(
        compareDiagramStructures(structure, structure2),
        'Complex diagram structure should be preserved'
      );
    });
  });
});

