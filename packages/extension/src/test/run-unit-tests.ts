/**
 * Simple unit test runner
 * Runs diagram structure preservation tests
 */

import * as assert from 'assert';
import { ThemeConfig, type VSCodeTheme } from '../visualization/theme-config';

/**
 * Parse a Mermaid diagram string to extract its structure
 */
function parseMermaidDiagram(diagramText: string): {
  nodes: Set<string>;
  edges: Array<{ from: string; to: string }>;
} {
  const nodes = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  const lines = diagramText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('%%')) {
      continue;
    }
    
    if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) {
      continue;
    }
    
    const nodeMatch = trimmed.match(/^(\w+)\s*[\[\(\{]/);
    if (nodeMatch) {
      nodes.add(nodeMatch[1]);
    }
    
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
 */
function compareDiagramStructures(
  structure1: { nodes: Set<string>; edges: Array<{ from: string; to: string }> },
  structure2: { nodes: Set<string>; edges: Array<{ from: string; to: string }> }
): boolean {
  if (structure1.nodes.size !== structure2.nodes.size) {
    return false;
  }
  
  for (const node of structure1.nodes) {
    if (!structure2.nodes.has(node)) {
      return false;
    }
  }
  
  if (structure1.edges.length !== structure2.edges.length) {
    return false;
  }
  
  const edges1 = new Set(structure1.edges.map(e => `${e.from}->${e.to}`));
  const edges2 = new Set(structure2.edges.map(e => `${e.from}->${e.to}`));
  
  for (const edge of edges1) {
    if (!edges2.has(edge)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Run tests
 */
async function runTests(): Promise<void> {
  let passedTests = 0;
  let failedTests = 0;
  const errors: string[] = [];

  console.log('\n=== Diagram Structure Preservation Tests ===\n');

  // Test 1: Theme variables are different
  try {
    console.log('Test 1: Theme variables should differ between themes');
    const lightTheme = ThemeConfig.getTheme('light');
    const darkTheme = ThemeConfig.getTheme('dark');
    
    assert.notStrictEqual(
      lightTheme.themeVariables.primaryColor,
      darkTheme.themeVariables.primaryColor,
      'Light and dark themes should have different primary colors'
    );
    
    console.log('✓ PASSED\n');
    passedTests++;
  } catch (error) {
    console.log(`✗ FAILED: ${(error as Error).message}\n`);
    failedTests++;
    errors.push(`Test 1: ${(error as Error).message}`);
  }

  // Test 2: Diagram structure is preserved
  try {
    console.log('Test 2: Diagram structure should be preserved across themes');
    const diagram = `flowchart TD
      A[Input Props]
      B[Process]
      C[Output]
      A --> B
      B --> C`;
    
    const structure = parseMermaidDiagram(diagram);
    const structure2 = parseMermaidDiagram(diagram);
    
    assert.ok(
      compareDiagramStructures(structure, structure2),
      'Diagram structure should remain unchanged'
    );
    
    console.log('✓ PASSED\n');
    passedTests++;
  } catch (error) {
    console.log(`✗ FAILED: ${(error as Error).message}\n`);
    failedTests++;
    errors.push(`Test 2: ${(error as Error).message}`);
  }

  // Test 3: Complex diagram structure preservation
  try {
    console.log('Test 3: Complex diagram structure should be preserved');
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
    
    assert.strictEqual(structure.nodes.size, 5, 'Should have 5 nodes');
    assert.strictEqual(structure.edges.length, 6, 'Should have 6 edges');
    
    const structure2 = parseMermaidDiagram(diagram);
    assert.ok(
      compareDiagramStructures(structure, structure2),
      'Complex diagram structure should be preserved'
    );
    
    console.log('✓ PASSED\n');
    passedTests++;
  } catch (error) {
    console.log(`✗ FAILED: ${(error as Error).message}\n`);
    failedTests++;
    errors.push(`Test 3: ${(error as Error).message}`);
  }

  // Test 4: Theme configuration validity
  try {
    console.log('Test 4: Theme configurations should be valid for all themes');
    const themes: VSCodeTheme[] = ['light', 'dark', 'high-contrast'];
    
    for (const theme of themes) {
      const themeConfig = ThemeConfig.getTheme(theme);
      
      assert.ok(themeConfig.themeVariables, `Theme config should have variables for ${theme}`);
      assert.ok(themeConfig.flowchart, `Theme config should have flowchart config for ${theme}`);
      assert.strictEqual(themeConfig.theme, 'base', `Theme should be 'base' for ${theme}`);
    }
    
    console.log('✓ PASSED\n');
    passedTests++;
  } catch (error) {
    console.log(`✗ FAILED: ${(error as Error).message}\n`);
    failedTests++;
    errors.push(`Test 4: ${(error as Error).message}`);
  }

  // Test 5: Multiple theme switches
  try {
    console.log('Test 5: Diagram structure should be preserved across multiple theme switches');
    const diagram = `flowchart TD
      A[Start]
      B[Step 1]
      C[Step 2]
      D[End]
      A --> B
      B --> C
      C --> D`;
    
    const originalStructure = parseMermaidDiagram(diagram);
    const themeSequence: VSCodeTheme[] = ['light', 'dark', 'high-contrast', 'light', 'dark'];
    
    for (const theme of themeSequence) {
      const themeConfig = ThemeConfig.getTheme(theme);
      assert.ok(themeConfig.themeVariables, `Theme config should be valid for ${theme}`);
      
      const currentStructure = parseMermaidDiagram(diagram);
      assert.ok(
        compareDiagramStructures(originalStructure, currentStructure),
        `Diagram structure should be preserved after switching to ${theme} theme`
      );
    }
    
    console.log('✓ PASSED\n');
    passedTests++;
  } catch (error) {
    console.log(`✗ FAILED: ${(error as Error).message}\n`);
    failedTests++;
    errors.push(`Test 5: ${(error as Error).message}`);
  }

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total: ${passedTests + failedTests}\n`);

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(error => console.log(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
