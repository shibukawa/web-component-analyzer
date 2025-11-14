# Design Document: JSX Conditional Subgraphs

## Overview

This design enhances the JSX analyzer to create hierarchical subgraph structures for conditional JSX rendering in DFD visualizations. The system will decompose JSX output into nested subgraphs representing conditional branches, with proper data flow edges showing how state/stores control visibility and how data flows to individual JSX elements.

The key insight is that conditional rendering creates logical groupings in the output, and these groupings should be represented as nested subgraphs in the DFD. Each subgraph represents a section of UI that may or may not be rendered based on a condition.

## Architecture

### High-Level Flow

```
Component Source Code
    ↓
AST Parser (SWC)
    ↓
JSX Analyzer (Enhanced)
    ↓
Conditional Structure Extractor (NEW)
    ↓
Subgraph Builder (NEW)
    ↓
DFD Builder (Enhanced)
    ↓
DFD Visualization
```

### Component Responsibilities

1. **JSX Analyzer** (Enhanced): Extracts JSX structure and identifies conditional expressions
2. **Conditional Structure Extractor** (NEW): Analyzes conditional expressions and builds a tree structure
3. **Subgraph Builder** (NEW): Converts conditional tree into nested subgraph definitions
4. **DFD Builder** (Enhanced): Creates DFD nodes and edges including subgraph structures

## Components and Interfaces

### 1. Enhanced Type Definitions

Add new types to `src/parser/types.ts`:

```typescript
/**
 * Represents a conditional branch in JSX
 */
export interface ConditionalBranch {
  type: 'ternary' | 'logical-and' | 'logical-or' | 'loop';
  condition: ConditionExpression;
  trueBranch?: JSXStructure;
  falseBranch?: JSXStructure;
  loopVariable?: string; // For .map loops (e.g., 'item')
  line?: number;
  column?: number;
}

/**
 * Represents a condition expression
 */
export interface ConditionExpression {
  variables: string[]; // Variables referenced in the condition
  expression: string; // String representation of the condition
}

/**
 * Represents JSX structure (element or conditional)
 */
export type JSXStructure = JSXElementStructure | ConditionalBranch;

/**
 * Represents a JSX element with its data dependencies
 */
export interface JSXElementStructure {
  type: 'element';
  tagName: string;
  displayDependencies: string[]; // Variables displayed in content
  attributeReferences: JSXAttributeReference[]; // All attribute references (both data and handlers)
  children: JSXStructure[];
  line?: number;
  column?: number;
}

/**
 * Represents an attribute reference on a JSX element
 */
export interface JSXAttributeReference {
  attributeName: string; // e.g., 'onClick', 'onChange', 'onCustomEvent', 'value'
  referencedVariable: string; // Name of the variable being referenced
  isEventHandler?: boolean; // Determined by type classification (function = true, data = false)
}

/**
 * Represents a subgraph in the DFD
 */
export interface DFDSubgraph {
  id: string;
  label: string;
  type: 'jsx-output' | 'conditional';
  condition?: ConditionExpression; // For conditional subgraphs
  elements: (DFDNode | DFDSubgraph)[]; // Can contain nodes or nested subgraphs
}

/**
 * Enhanced JSX information with structure
 */
export interface JSXInfo {
  simplified: string;
  placeholders: PlaceholderInfo[];
  elements: JSXElementInfo[];
  structure?: JSXStructure; // NEW: Hierarchical structure
  rootSubgraph?: DFDSubgraph; // NEW: Root subgraph for visualization
}
```

### 2. Conditional Structure Extractor

New module: `src/analyzers/conditional-extractor.ts`

**Purpose**: Analyze JSX AST to extract conditional structure and data dependencies.

**Key Methods**:

```typescript
class ConditionalStructureExtractor {
  /**
   * Extract hierarchical JSX structure from AST
   */
  extractStructure(jsxNode: JSXElement | JSXFragment): JSXStructure;
  
  /**
   * Analyze a conditional expression (ternary or logical)
   */
  private analyzeConditional(expr: ConditionalExpression | LogicalExpression): ConditionalBranch;
  
  /**
   * Extract variables from a condition expression
   */
  private extractConditionVariables(expr: Expression): string[];
  
  /**
   * Analyze a JSX element for data dependencies
   */
  private analyzeElement(element: JSXElement): JSXElementStructure;
  
  /**
   * Extract display dependencies from JSX content
   */
  private extractDisplayDependencies(children: JSXElementChild[]): string[];
  
  /**
   * Extract attribute references from JSX attributes
   */
  private extractAttributeReferences(attributes: JSXAttribute[]): JSXAttributeReference[];
  
  /**
   * Check if a structure has any data dependencies
   */
  private hasDependencies(structure: JSXStructure): boolean;
}
```

**Algorithm for extractStructure**:

1. If node is JSXElement:
   - Extract tag name
   - Extract display dependencies from children
   - Extract attribute references from attributes (all attributes, not just event handlers)
   - Recursively process children
   - Return JSXElementStructure

2. If node is JSXExpressionContainer:
   - If expression is ConditionalExpression (ternary):
     - Extract condition variables
     - Recursively process consequent (true branch)
     - Recursively process alternate (false branch)
     - Return ConditionalBranch with type 'ternary'
   
   - If expression is LogicalExpression with operator '&&':
     - Extract condition variables
     - Recursively process right side (true branch)
     - Return ConditionalBranch with type 'logical-and'
   
   - If expression is LogicalExpression with operator '||':
     - Extract condition variables
     - Recursively process right side (false branch)
     - Return ConditionalBranch with type 'logical-or'
   
   - If expression is CallExpression with callee ending in '.map':
     - Extract array variable being mapped
     - Extract loop variable from arrow function parameter
     - Recursively process arrow function body
     - Return ConditionalBranch with type 'loop'

3. If node is JSXFragment:
   - Recursively process children
   - Return array of structures

### 3. Subgraph Builder

New module: `src/analyzers/subgraph-builder.ts`

**Purpose**: Convert JSX structure tree into DFD subgraph definitions.

**Key Methods**:

```typescript
class SubgraphBuilder {
  private subgraphCounter: number = 0;
  
  /**
   * Build root JSX Output subgraph
   */
  buildRootSubgraph(structure: JSXStructure): DFDSubgraph;
  
  /**
   * Build subgraph from JSX structure
   */
  private buildSubgraph(structure: JSXStructure, parentId: string): DFDSubgraph | DFDNode | null;
  
  /**
   * Build conditional subgraph
   */
  private buildConditionalSubgraph(branch: ConditionalBranch, parentId: string): DFDSubgraph | null;
  
  /**
   * Build element node
   */
  private buildElementNode(element: JSXElementStructure, parentId: string): DFDNode | null;
  
  /**
   * Check if element should be included (has dependencies or is in conditional)
   */
  private shouldIncludeElement(element: JSXElementStructure, isInConditional: boolean): boolean;
  
  /**
   * Generate subgraph label from condition
   */
  private generateConditionLabel(condition: ConditionExpression): string;
  
  /**
   * Filter empty subgraphs recursively
   */
  private filterEmptySubgraphs(subgraph: DFDSubgraph): DFDSubgraph | null;
}
```

**Algorithm for buildRootSubgraph**:

1. Create root subgraph with label "JSX Output"
2. Process structure recursively:
   - For ConditionalBranch:
     - If type is 'loop':
       - Create loop subgraph with label "{loop}"
       - Process loop body
       - Check for nested loops with no intermediate content
       - If nested loop found, merge subgraphs
       - Add to parent if not empty
     - Else (conditional):
       - Create conditional subgraph with condition label
       - Process true branch
       - Process false branch (if exists)
       - Add to parent if not empty
   
   - For JSXElementStructure:
     - Check if element has dependencies or is in conditional
     - If yes, create element node
     - Process children recursively
     - Add to parent if not empty

3. Filter out empty subgraphs
4. Return root subgraph

**Filtering Rules**:

- Element with no dependencies and not in conditional → omit
- Subgraph with no elements after filtering → omit
- Top-level wrapper elements (div, etc.) with no dependencies → omit but keep children
- Nested loops with no intermediate content → merge into single {loop} subgraph

### 4. Enhanced DFD Builder

Modify `src/parser/dfd-builder.ts`:

**New Methods**:

```typescript
class DFDBuilder {
  /**
   * Build edges from conditions to conditional subgraphs
   */
  private buildConditionEdges(subgraph: DFDSubgraph, nodes: DFDNode[]): DFDEdge[];
  
  /**
   * Build edges from stores/processes to JSX elements based on attribute references
   */
  private buildAttributeReferenceEdges(
    element: JSXElementStructure, 
    elementNode: DFDNode,
    nodes: DFDNode[],
    typeClassifier: TypeClassifier
  ): DFDEdge[];
  
  /**
   * Build edges for display dependencies (content variables)
   */
  private buildDisplayEdges(subgraph: DFDSubgraph, nodes: DFDNode[]): DFDEdge[];
  
  /**
   * Recursively collect all element nodes from subgraph tree
   */
  private collectElementNodes(subgraph: DFDSubgraph): DFDNode[];
  
  /**
   * Find node by variable name
   */
  private findNodeByVariable(variableName: string, nodes: DFDNode[]): DFDNode | undefined;
  
  /**
   * Classify variable as function or data using TypeClassifier
   */
  private classifyVariable(variableName: string, typeClassifier: TypeClassifier): 'function' | 'data';
}
```

**Enhanced buildDFD Method**:

1. Build nodes for props, hooks, processes (existing logic)
2. If JSX structure exists:
   - Build root subgraph using SubgraphBuilder
   - Build condition edges (condition variables → conditional subgraphs)
   - For each attribute reference in JSX elements:
     - Use type classification to determine if referenced variable is function or data
     - If function: create edge labeled with attribute name (e.g., "onClick")
     - If data: create edge labeled as "display"
   - Build display edges (stores → element nodes for content variables)
3. Return DFDSourceData with nodes, edges, and subgraphs

### 5. Enhanced JSX Analyzer

Modify `src/analyzers/jsx-analyzer.ts`:

**Integration Points**:

```typescript
class SWCJSXAnalyzer {
  private conditionalExtractor: ConditionalStructureExtractor;
  
  analyzeJSX(ast: Module, sourceCode: string): JSXInfo {
    // Existing logic to find JSX node
    const jsxNode = this.findJSXNode(ast);
    
    // NEW: Extract conditional structure
    if (jsxNode) {
      const structure = this.conditionalExtractor.extractStructure(jsxNode);
      
      return {
        simplified: this.simplifyJSX(jsxNode),
        placeholders: this.placeholders,
        elements: this.elements,
        structure: structure // NEW
      };
    }
    
    // Existing return
  }
}
```

## Data Models

### Example Data Flow

For the AuthConsumer component:

```typescript
// Input: AuthConsumer.tsx with conditional rendering

// Output: JSXStructure
{
  type: 'element',
  tagName: 'div',
  displayDependencies: [],
  eventHandlers: [],
  children: [
    {
      type: 'element',
      tagName: 'h2',
      displayDependencies: [],
      eventHandlers: [],
      children: []
    },
    {
      type: 'conditional',
      condition: {
        variables: ['isLoading'],
        expression: 'isLoading'
      },
      trueBranch: {
        type: 'element',
        tagName: 'p',
        displayDependencies: [],
        eventHandlers: [],
        children: []
      }
    },
    {
      type: 'conditional',
      condition: {
        variables: ['isAuthenticated'],
        expression: '!isAuthenticated'
      },
      trueBranch: {
        type: 'element',
        tagName: 'div',
        displayDependencies: [],
        eventHandlers: [],
        children: [
          {
            type: 'element',
            tagName: 'input',
            displayDependencies: ['email'],
            attributeReferences: [
              { attributeName: 'value', referencedVariable: 'email', isEventHandler: false },
              { attributeName: 'onChange', referencedVariable: 'setEmail', isEventHandler: true }
            ],
            children: []
          },
          {
            type: 'element',
            tagName: 'input',
            displayDependencies: ['password'],
            attributeReferences: [
              { attributeName: 'value', referencedVariable: 'password', isEventHandler: false },
              { attributeName: 'onChange', referencedVariable: 'setPassword', isEventHandler: true }
            ],
            children: []
          },
          {
            type: 'element',
            tagName: 'button',
            displayDependencies: [],
            attributeReferences: [
              { attributeName: 'onClick', referencedVariable: 'handleLogin', isEventHandler: true }
            ],
            children: []
          }
        ]
      },
      falseBranch: {
        type: 'element',
        tagName: 'div',
        displayDependencies: [],
        eventHandlers: [],
        children: [
          {
            type: 'element',
            tagName: 'p',
            displayDependencies: ['user'],
            attributeReferences: [],
            children: []
          },
          {
            type: 'element',
            tagName: 'p',
            displayDependencies: ['user'],
            attributeReferences: [],
            children: []
          },
          {
            type: 'element',
            tagName: 'button',
            displayDependencies: [],
            attributeReferences: [
              { attributeName: 'onClick', referencedVariable: 'handleUpdateProfile', isEventHandler: true }
            ],
            children: []
          },
          {
            type: 'element',
            tagName: 'button',
            displayDependencies: [],
            attributeReferences: [
              { attributeName: 'onClick', referencedVariable: 'handleLogout', isEventHandler: true }
            ],
            children: []
          }
        ]
      }
    }
  ]
}

// Output: DFDSubgraph
{
  id: 'subgraph-0',
  label: 'JSX Output',
  type: 'jsx-output',
  elements: [
    {
      id: 'subgraph-1',
      label: '{isLoading}',
      type: 'conditional',
      condition: { variables: ['isLoading'], expression: 'isLoading' },
      elements: [
        { id: 'jsx-element-1', label: 'p', type: 'external-entity-output' }
      ]
    },
    {
      id: 'subgraph-2',
      label: '{!isAuthenticated}',
      type: 'conditional',
      condition: { variables: ['isAuthenticated'], expression: '!isAuthenticated' },
      elements: [
        { id: 'jsx-element-2', label: 'input', type: 'external-entity-output' },
        { id: 'jsx-element-3', label: 'input', type: 'external-entity-output' },
        { id: 'jsx-element-4', label: 'button', type: 'external-entity-output' }
      ]
    },
    {
      id: 'subgraph-3',
      label: '{isAuthenticated}',
      type: 'conditional',
      condition: { variables: ['isAuthenticated'], expression: 'isAuthenticated' },
      elements: [
        { id: 'jsx-element-5', label: 'p', type: 'external-entity-output' },
        { id: 'jsx-element-6', label: 'p', type: 'external-entity-output' },
        { id: 'jsx-element-7', label: 'button', type: 'external-entity-output' },
        { id: 'jsx-element-8', label: 'button', type: 'external-entity-output' }
      ]
    }
  ]
}

// Output: DFD Edges (partial)
[
  // Condition to subgraph edges
  { from: 'isLoading', to: 'subgraph-1', label: 'controls visibility' },
  { from: 'isAuthenticated', to: 'subgraph-2', label: 'controls visibility' },
  { from: 'isAuthenticated', to: 'subgraph-3', label: 'controls visibility' },
  
  // Display edges (from content)
  { from: 'user', to: 'jsx-element-5', label: 'display' },
  { from: 'user', to: 'jsx-element-6', label: 'display' },
  
  // Attribute reference edges (data)
  { from: 'email', to: 'jsx-element-2', label: 'display' },
  { from: 'password', to: 'jsx-element-3', label: 'display' },
  
  // Attribute reference edges (event handlers)
  { from: 'setEmail', to: 'jsx-element-2', label: 'onChange' },
  { from: 'setPassword', to: 'jsx-element-3', label: 'onChange' },
  { from: 'handleLogin', to: 'jsx-element-4', label: 'onClick' },
  { from: 'handleUpdateProfile', to: 'jsx-element-7', label: 'onClick' },
  { from: 'handleLogout', to: 'jsx-element-8', label: 'onClick' }
]
```

## Error Handling

### Parsing Errors

- **Invalid JSX syntax**: Caught by SWC parser, reported in DFDSourceData.errors
- **Unsupported conditional patterns**: Log warning, fall back to flat structure
- **Circular dependencies**: Should not occur in JSX structure (tree by nature)

### Edge Cases

1. **Nested ternaries**: Support multiple levels of nesting
2. **Mixed logical operators**: Handle && and || in same expression
3. **Complex conditions**: Extract all referenced variables, simplify expression string
4. **Inline arrow functions**: Treat as anonymous event handlers
5. **JSX fragments**: Process children without creating wrapper element
6. **Empty conditionals**: Filter out during subgraph building
7. **.map() loops**: Create {loop} subgraph with edge from array variable
8. **Nested .map() calls**: Merge into single {loop} subgraph if no intermediate content
9. **Loop variables**: Track as local dependencies within loop scope

## Testing Strategy

### Unit Tests

1. **ConditionalStructureExtractor**:
   - Test simple conditional (logical AND)
   - Test ternary operator
   - Test nested conditionals
   - Test element with display dependencies
   - Test element with event handlers
   - Test mixed content (elements + conditionals)

2. **SubgraphBuilder**:
   - Test root subgraph creation
   - Test conditional subgraph creation
   - Test element node creation
   - Test empty subgraph filtering
   - Test nested subgraph structure
   - Test condition label generation

3. **DFDBuilder (enhanced)**:
   - Test condition edge creation
   - Test display edge creation
   - Test event handler edge creation
   - Test edge creation with nested subgraphs

### Integration Tests

1. **AuthConsumer component**:
   - Verify 3 conditional subgraphs created
   - Verify condition edges from isLoading, isAuthenticated
   - Verify display edges to input elements
   - Verify event handler edges to buttons

2. **DataDashboard component**:
   - Verify nested conditional handling
   - Verify multiple data dependencies

3. **Edge cases**:
   - Component with no conditionals
   - Component with only conditionals (no static content)
   - Component with deeply nested conditionals
   - Component with .map() loops
   - Component with nested .map() loops (should merge)

### Acceptance Tests

Create acceptance test file: `examples/react-vite/src/components/001-ConditionalRendering.tsx`

```yaml
ACCEPTANCE_TEST:
  description: "Component with conditional rendering using ternary operator"
  
  external_entities_input:
    - name: "isLoggedIn"
      type: "prop"
      dataType: "boolean"
  
  data_stores:
    - name: "count"
      type: "state"
      dataType: "number"
  
  processes:
    - name: "handleIncrement"
      type: "event-handler"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "subgraph-condition-1"
      type: "subgraph"
      label: "{isLoggedIn}"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-condition-1"
  
  data_flows:
    - from: "isLoggedIn"
      to: "subgraph-condition-1"
      fromType: "external_entity_input"
      toType: "subgraph"
      description: "Controls visibility of conditional branch"
    - from: "handleIncrement"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick event handler"
```

## Implementation Phases

### Phase 1: Type Definitions and Structure Extraction
- Add new types to types.ts
- Implement ConditionalStructureExtractor
- Write unit tests for structure extraction

### Phase 2: Subgraph Building
- Implement SubgraphBuilder
- Write unit tests for subgraph building
- Test filtering logic

### Phase 3: DFD Integration
- Enhance DFDBuilder with subgraph support
- Implement edge creation for subgraphs
- Write integration tests

### Phase 4: Visualization
- Update data-transformer to handle subgraphs
- Update mermaid-transformer to render nested subgraphs
- Test visualization output

### Phase 5: Testing and Refinement
- Create acceptance tests
- Test with real components
- Fix edge cases
- Performance optimization

## Performance Considerations

- **AST traversal**: Single pass through JSX tree
- **Subgraph filtering**: Recursive but limited by JSX depth (typically < 10 levels)
- **Edge creation**: O(n*m) where n = elements, m = stores/processes (acceptable for typical components)
- **Memory**: Additional structure data is proportional to JSX complexity

## Dependencies

- Existing: `@swc/core` for AST parsing
- Existing: `src/analyzers/jsx-analyzer.ts` for JSX analysis
- Existing: `src/parser/dfd-builder.ts` for DFD construction
- New: `src/analyzers/conditional-extractor.ts`
- New: `src/analyzers/subgraph-builder.ts`

## Migration Path

This is an additive change:
1. New types are optional fields on existing interfaces
2. Existing DFD generation continues to work
3. Subgraph generation is opt-in via structure field
4. Visualization layer can fall back to flat structure if subgraphs not present

No breaking changes to existing functionality.
