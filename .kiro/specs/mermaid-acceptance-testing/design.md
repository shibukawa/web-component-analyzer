# Design Document: Mermaid-Based Acceptance Testing

## Overview

This design establishes a new acceptance testing framework that uses Mermaid diagram files (`.mmd`) as the source of truth for expected parser output. Instead of embedding YAML specifications in component files, developers place `.mmd` files alongside test components. The test runner parses components, generates Mermaid output, and compares it against reference files using semantic normalization to handle formatting variations.

## Architecture

### High-Level Flow

```
Test Discovery
    ↓
[Scan examples/react-vite/src/components/ for {number}-{Name}.tsx files]
    ↓
[Check for corresponding {number}-{Name}.mmd files]
    ↓
Test Execution (for each matched pair)
    ↓
[Parse component using analyzer]
    ↓
[Generate Mermaid output from DFD data]
    ↓
[Load reference .mmd file]
    ↓
Comparison
    ↓
[Normalize both diagrams]
    ↓
[Compare semantic structure]
    ↓
Report Results
    ↓
[Pass/Fail with detailed diff if needed]
```

### Component Organization

```
packages/extension/src/test/
├── acceptance/
│   ├── mermaid-acceptance-test.ts      # Main test runner
│   ├── mermaid-normalizer.ts           # Mermaid diagram normalization
│   ├── mermaid-parser.ts               # Parse Mermaid syntax into AST
│   ├── mermaid-comparator.ts           # Compare normalized diagrams
│   └── test-discovery.ts               # Discover test files
└── [existing test files]

examples/react-vite/src/components/
├── 001-ConditionalRendering.tsx
├── 001-ConditionalRendering.mmd        # NEW: Reference diagram
├── 002-LoopRendering.tsx
├── 002-LoopRendering.mmd               # NEW: Reference diagram
└── [more components and .mmd files]
```

## Components and Interfaces

### 1. Test Discovery (`test-discovery.ts`)

**Purpose**: Scan the components directory and identify test pairs

```typescript
interface TestCase {
  componentPath: string;      // Path to .tsx file
  referencePath: string;      // Path to .mmd file
  testName: string;           // e.g., "001-ConditionalRendering"
  framework: string;          // e.g., "react"
}

interface TestDiscoveryResult {
  testCases: TestCase[];
  totalTests: number;
  frameworks: string[];
}

function discoverTests(baseDir: string): TestDiscoveryResult
function getTestCasesForFramework(framework: string): TestCase[]
```

### 2. Mermaid Parser (`mermaid-parser.ts`)

**Purpose**: Parse Mermaid flowchart syntax into a structured AST

```typescript
interface MermaidNode {
  id: string;
  label: string;
  shape: 'rectangle' | 'rounded' | 'diamond' | 'hexagon' | 'cylinder' | 'subprocess';
  style?: string;
}

interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

interface MermaidSubgraph {
  id: string;
  label: string;
  elements: (MermaidNode | MermaidSubgraph)[];
}

interface MermaidAST {
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  subgraphs: MermaidSubgraph[];
  direction: 'LR' | 'TB' | 'RL' | 'BT';
}

function parseMermaid(mermaidText: string): MermaidAST
function extractNodes(mermaidText: string): MermaidNode[]
function extractEdges(mermaidText: string): MermaidEdge[]
function extractSubgraphs(mermaidText: string): MermaidSubgraph[]
```

### 3. Mermaid Normalizer (`mermaid-normalizer.ts`)

**Purpose**: Normalize Mermaid diagrams to handle formatting variations

```typescript
interface NormalizationOptions {
  ignoreWhitespace: boolean;
  ignoreQuoteStyle: boolean;
  ignoreComments: boolean;
  ignoreClassDefinitions: boolean;
  ignoreStyleDefinitions: boolean;
}

interface NormalizedDiagram {
  nodes: Set<string>;           // Normalized node definitions
  edges: Set<string>;           // Normalized edge definitions
  subgraphs: Set<string>;       // Normalized subgraph definitions
  originalText: string;         // Original input
}

function normalizeMermaid(
  mermaidText: string,
  options?: NormalizationOptions
): NormalizedDiagram

function normalizeNodeDefinition(nodeDef: string): string
function normalizeEdgeDefinition(edgeDef: string): string
function removeComments(text: string): string
function removeExtraWhitespace(text: string): string
```

### 4. Mermaid Comparator (`mermaid-comparator.ts`)

**Purpose**: Compare two normalized Mermaid diagrams and report differences

```typescript
interface ComparisonResult {
  passed: boolean;
  missingNodes: string[];       // In reference but not in generated
  extraNodes: string[];         // In generated but not in reference
  missingEdges: string[];       // In reference but not in generated
  extraEdges: string[];         // In generated but not in reference
  missingSubgraphs: string[];
  extraSubgraphs: string[];
  differences: string[];        // Human-readable diff
}

function compareMermaidDiagrams(
  generated: string,
  reference: string
): ComparisonResult

function findMissingElements(
  generated: NormalizedDiagram,
  reference: NormalizedDiagram
): ComparisonResult

function generateDiffReport(result: ComparisonResult): string
```

### 5. Main Test Runner (`mermaid-acceptance-test.ts`)

**Purpose**: Orchestrate test discovery, execution, and reporting

```typescript
interface TestResult {
  testName: string;
  componentPath: string;
  passed: boolean;
  error?: string;
  comparison?: ComparisonResult;
  duration: number;
}

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  duration: number;
}

async function runAcceptanceTests(
  baseDir: string,
  filter?: string
): Promise<TestSuiteResult>

async function runSingleTest(testCase: TestCase): Promise<TestResult>

function formatTestReport(result: TestSuiteResult): string
```

## Data Models

### Mermaid Diagram Structure

The system works with Mermaid flowchart syntax. Key elements:

**Nodes**:
- Rectangle: `[label]`
- Rounded: `(label)`
- Diamond: `{label}`
- Hexagon: `{{label}}`
- Cylinder: `[(label)]`
- Subprocess: `[[label]]`

**Edges**:
- Solid: `-->`
- Dashed: `-.->`
- Labeled: `-->|label|`

**Subgraphs**:
```
subgraph id["label"]
  direction TB
  [elements]
end
```

### Normalization Strategy

1. **Remove Comments**: Strip `%%` comments
2. **Remove Styling**: Strip `style` and `class` definitions
3. **Normalize Whitespace**: Collapse multiple spaces, remove blank lines
4. **Normalize Quotes**: Convert all quotes to double quotes
5. **Extract Core Elements**: Parse nodes, edges, subgraphs into sets
6. **Compare Sets**: Use set operations to find differences

## Error Handling

### Parser Errors
- Invalid Mermaid syntax in reference files → Report with line number
- Missing reference file → Skip test with warning
- Component parsing failure → Report with analyzer error details

### Comparison Errors
- Normalization failures → Report with context
- Unexpected element types → Report with element details

### Test Execution Errors
- File I/O errors → Report with path and error
- Timeout during parsing → Report with component name
- Memory issues → Report with diagnostic info

## Testing Strategy

### Unit Tests
- Mermaid parser: Validate parsing of various node/edge/subgraph syntaxes
- Normalizer: Verify whitespace/quote normalization preserves structure
- Comparator: Test diff detection for missing/extra elements

### Integration Tests
- End-to-end test execution with sample components
- Verify test discovery finds all test pairs
- Validate error reporting for various failure scenarios

### Acceptance Tests
- Run against existing test components
- Verify parser output matches expected Mermaid diagrams
- Test with various component patterns (hooks, state, context, etc.)

## Implementation Phases

### Phase 1: Core Infrastructure
1. Implement test discovery
2. Implement Mermaid parser
3. Implement normalizer
4. Implement comparator

### Phase 2: Test Runner
1. Implement main test runner
2. Integrate with existing test framework
3. Add CLI support for filtering tests

### Phase 3: Reference Files
1. Generate initial `.mmd` files for existing test components
2. Validate against current parser output
3. Document `.mmd` file format

### Phase 4: Integration
1. Add to CI/CD pipeline
2. Add pre-commit hooks
3. Document testing workflow

## Design Decisions

### Why Mermaid Files Instead of YAML?
- **Visual**: Developers can see exactly what the parser should produce
- **Maintainable**: Easy to update when parser behavior changes
- **Testable**: Can be rendered to verify correctness
- **Semantic**: Focuses on structure, not implementation details

### Why Normalization?
- **Robustness**: Tests don't break on formatting changes
- **Flexibility**: Parser can optimize output without breaking tests
- **Clarity**: Focuses on semantic differences, not whitespace

### Why Separate Normalizer and Comparator?
- **Modularity**: Each component has single responsibility
- **Testability**: Can test normalization and comparison independently
- **Reusability**: Normalizer can be used for other purposes

