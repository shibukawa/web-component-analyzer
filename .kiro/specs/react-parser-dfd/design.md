# Design Document

## Overview

The React Parser for DFD generation is a code analysis module that extracts structured information from React component source code to generate Data Flow Diagrams. The parser uses SWC (Speedy Web Compiler) to build an Abstract Syntax Tree (AST) and traverses it to identify DFD elements: external entities (inputs/outputs), processes, and data stores.

The design follows a pipeline architecture where source code flows through parsing, analysis, and transformation stages to produce DFD source data compatible with vis.js visualization.

SWC is chosen for its:
- Fast parsing performance (written in Rust)
- Native support for TypeScript and JSX
- Smaller memory footprint compared to TypeScript Compiler API
- Simple AST structure optimized for analysis

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  React Source   │
│   (.tsx/.jsx)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AST Parser     │
│     (SWC)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AST Analyzer   │
│  (Visitor)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DFD Builder    │
│  (Transformer)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DFD Source     │
│  Data (JSON)    │
└─────────────────┘
```

### Module Structure

```
src/
├── parser/
│   ├── index.ts              # Main parser entry point
│   ├── ast-parser.ts         # TypeScript AST parsing
│   ├── ast-analyzer.ts       # AST traversal and analysis
│   ├── dfd-builder.ts        # DFD data structure builder
│   └── types.ts              # Type definitions
├── analyzers/
│   ├── props-analyzer.ts     # Props extraction
│   ├── hooks-analyzer.ts     # Hooks identification
│   ├── process-analyzer.ts   # Process extraction
│   └── jsx-analyzer.ts       # JSX simplification
└── utils/
    ├── hook-registry.ts      # Third-party hook definitions
    └── error-handler.ts      # Error handling utilities
```

## Components and Interfaces

### 1. Main Parser Interface

```typescript
interface ReactParser {
  parse(sourceCode: string, filePath: string): Promise<DFDSourceData>;
}

interface DFDSourceData {
  nodes: DFDNode[];
  edges: DFDEdge[];
  errors?: ParseError[];
}

interface DFDNode {
  id: string;
  label: string;
  type: 'external-entity-input' | 'external-entity-output' | 'process' | 'data-store';
  metadata?: Record<string, any>;
}

interface DFDEdge {
  from: string;
  to: string;
  label?: string;
}

interface ParseError {
  message: string;
  line?: number;
  column?: number;
}
```

### 2. AST Parser

```typescript
interface ASTParser {
  parseSourceCode(sourceCode: string, filePath: string): Promise<swc.Module>;
}
```

Uses SWC's `parseSync()` or `parse()` to generate AST with support for both TypeScript and JavaScript (JSX) syntax.

**SWC Configuration:**
```typescript
const swcOptions: swc.Options = {
  syntax: filePath.endsWith('.tsx') || filePath.endsWith('.ts') 
    ? 'typescript' 
    : 'ecmascript',
  tsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
  decorators: true,
  dynamicImport: true
};
```

### 3. AST Analyzer

```typescript
interface ASTAnalyzer {
  analyze(module: swc.Module): ComponentAnalysis;
}
```

Traverses SWC AST nodes using visitor pattern. Key node types:
- `FunctionDeclaration` / `ArrowFunctionExpression`: Functional components
- `ClassDeclaration`: Class components
- `CallExpression`: Hook calls
- `VariableDeclaration`: Variable assignments
- `JSXElement` / `JSXFragment`: JSX output

interface ComponentAnalysis {
  componentName: string;
  componentType: 'functional' | 'class';
  props: PropInfo[];
  hooks: HookInfo[];
  processes: ProcessInfo[];
  jsxOutput: JSXInfo;
}

interface PropInfo {
  name: string;
  type?: string;
  isDestructured: boolean;
}

interface HookInfo {
  hookName: string;
  category: 'state' | 'effect' | 'context' | 'data-fetching' | 'state-management' | 'form' | 'routing' | 'server-action';
  variables: string[];
  dependencies?: string[];
  isReadWritePair?: boolean; // True if variables follow [value, setValue] pattern
  isFunctionOnly?: boolean; // True if all variables are functions (for useContext)
}

interface ProcessInfo {
  name: string;
  type: 'useEffect' | 'useCallback' | 'useMemo' | 'event-handler' | 'custom-function';
  dependencies?: string[];
  references: string[]; // Variables referenced in the function
  externalCalls: ExternalCallInfo[]; // External function calls made by this process
}

interface ExternalCallInfo {
  functionName: string; // e.g., "api.sendData", "logger.log"
  arguments: string[]; // Variable names passed as arguments
}

interface JSXInfo {
  simplified: string; // Simplified JSX with placeholders
  placeholders: PlaceholderInfo[];
}

interface PlaceholderInfo {
  id: string;
  originalExpression: string;
  variables: string[];
}
```

### 4. DFD Builder

```typescript
interface DFDBuilder {
  build(analysis: ComponentAnalysis): DFDSourceData;
}
```

Transforms `ComponentAnalysis` into `DFDSourceData` by:
1. Creating nodes for each identified element
2. Inferring edges based on variable references and dependencies
3. Assigning appropriate DFD types to each node

### 5. Hook Registry

```typescript
interface HookRegistry {
  getHookCategory(hookName: string): HookCategory | null;
  registerHook(hookName: string, category: HookCategory): void;
}

type HookCategory = 
  | 'state'
  | 'effect'
  | 'context'
  | 'data-fetching'
  | 'state-management'
  | 'form'
  | 'routing'
  | 'server-action';
```

Pre-configured with known third-party hooks:
- **Data Fetching**: `useSWR`, `useQuery`, `useMutation`, `useSubscription`, `useQueryClient`
- **State Management**: `useAtom`, `useAtomValue`, `useSetAtom`, `useStore`, `useSelector`, `useDispatch`
- **Form**: `useForm`, `useController`, `useWatch`, `useFormik`, `useField`
- **Routing**: `useNavigate`, `useParams`, `useLocation`, `useSearchParams`, `useRouter`
- **Server Actions**: `useFormState`, `useFormStatus`

## Data Models

### Node Type Mapping

| Source Element | DFD Node Type | Examples |
|----------------|---------------|----------|
| Props | `external-entity-input` | `{ name, age }` from props |
| useContext (read-only) | `external-entity-input` | `const theme = useContext(ThemeContext)` |
| useContext (read-write) | `data-store` | `const { value, setValue } = useContext(MyContext)` |
| useContext (write-only functions) | `external-entity-output` | `const { logout } = useContext(AuthContext)` |
| Data Fetching Hooks | `external-entity-input` | `const { data } = useSWR(...)` |
| Routing Hooks | `external-entity-input` | `const params = useParams()` |
| Server Actions | `external-entity-input` | `const [state, formAction] = useFormState(...)` |
| useState | `data-store` | `const [count, setCount] = useState(0)` |
| useReducer | `data-store` | `const [state, dispatch] = useReducer(...)` |
| State Management Hooks | `data-store` | `const count = useAtom(countAtom)` |
| Form Hooks | `data-store` | `const { register } = useForm()` |
| useEffect | `process` | `useEffect(() => {...}, [deps])` |
| useCallback | `process` | `const handler = useCallback(() => {...})` |
| useMemo | `process` | `const value = useMemo(() => {...})` |
| Event Handlers | `process` | `const handleClick = () => {...}` |
| Custom Functions | `process` | `function calculateTotal() {...}` |
| Function Calls (external) | `external-entity-output` | `api.sendData(...)`, `logger.log(...)` |
| JSX Output | `external-entity-output` | Simplified JSX structure |

### Edge Inference Rules

Edges are inferred by analyzing variable references and usage patterns:

1. **External Entity → Process**: When a process function references an external entity variable
2. **Process → Data Store**: When a process calls a state setter function (e.g., `setCount`, `setValue`, `dispatch`)
3. **Data Store → Process**: When a process reads from a state variable
4. **Process → External Output (JSX)**: When JSX placeholders reference process results
5. **Process → External Output (Function Call)**: When a process calls an external function

### Variable Pattern Recognition

**Read-Write Pair Detection:**
Variables are considered a read-write pair (data store) when:
- Pattern: `[value, setValue]` or `[param, setParam]`
- Naming convention: Second variable starts with "set" + capitalized first variable name
- Examples: `[count, setCount]`, `[user, setUser]`, `[data, setData]`

**useContext Classification:**
```typescript
// Read-only (data) → external-entity-input
const theme = useContext(ThemeContext);
const user = useContext(UserContext);

// Read-write (data + setter) → data-store
const { value, setValue } = useContext(MyContext);
const [state, setState] = useContext(StateContext);

// Write-only (functions) → external-entity-output
const { logout, updateProfile } = useContext(AuthContext);
const dispatch = useContext(DispatchContext);
```

Detection logic:
1. If all destructured properties are functions → `external-entity-output`
2. If contains read-write pair pattern → `data-store`
3. Otherwise → `external-entity-input`

**Function Call Classification:**
```typescript
// External function call → external-entity-output
api.sendData(payload);
logger.log(message);
analytics.track(event);

// Internal function call → process-to-process edge
const result = calculateTotal(items);
```

Detection criteria for external function calls:
- Called on an imported object (e.g., `api.`, `logger.`)
- Not defined within the component
- Not a React hook or built-in function

### JSX Simplification Algorithm

```typescript
function simplifyJSX(jsxElement: swc.JSXElement | swc.JSXFragment): string {
  // 1. Keep tag names
  // 2. Replace text content with {TEXT}
  // 3. Replace expressions with {VAR:variableName}
  // 4. Maintain hierarchy with indentation
  // 5. Remove attributes except key structural ones
}
```

**SWC JSX Node Types:**
- `JSXElement`: Regular JSX elements (`<div>...</div>`)
- `JSXFragment`: Fragment elements (`<>...</>`)
- `JSXText`: Text content
- `JSXExpressionContainer`: Expressions in braces (`{variable}`)

Example transformation:
```jsx
// Original
<div className="container">
  <h1>{title}</h1>
  <p>Count: {count}</p>
  <button onClick={handleClick}>Click me</button>
</div>

// Simplified
<div>
  <h1>{VAR:title}</h1>
  <p>{TEXT} {VAR:count}</p>
  <button>{TEXT}</button>
</div>
```

## Error Handling

### Error Categories

1. **Syntax Errors**: Invalid TypeScript/JavaScript syntax
2. **Component Not Found**: No React component detected in file
3. **Parsing Timeout**: Parsing exceeds 5-second limit
4. **Unsupported Patterns**: Complex patterns that cannot be analyzed

### Error Handling Strategy

```typescript
class ParserErrorHandler {
  handleError(error: Error, context: ParsingContext): ParseError {
    // Log error details
    // Return user-friendly error message
    // Include line/column information if available
  }
  
  handleTimeout(partialResult: Partial<ComponentAnalysis>): DFDSourceData {
    // Return partial DFD data with warning
  }
}
```

### Graceful Degradation

- If props cannot be parsed, continue with hooks analysis
- If hooks fail, continue with JSX analysis
- Always return a valid `DFDSourceData` structure, even if empty
- Include error information in the `errors` array

## Testing Strategy

### Unit Tests

1. **AST Parser Tests**
   - Parse valid TypeScript/JavaScript files using SWC
   - Handle syntax errors gracefully
   - Support both `.tsx` and `.jsx` extensions
   - Verify SWC configuration for different file types

2. **Props Analyzer Tests**
   - Extract props from functional components
   - Extract props from class components
   - Handle destructured props
   - Resolve TypeScript type definitions

3. **Hooks Analyzer Tests**
   - Identify React built-in hooks
   - Identify third-party hooks from registry
   - Extract variable names from destructuring
   - Extract dependencies arrays
   - Detect read-write pairs ([value, setValue])
   - Classify useContext as input or data store based on pattern

4. **Process Analyzer Tests**
   - Identify useEffect, useCallback, useMemo
   - Extract event handler functions
   - Extract custom functions
   - Analyze variable references
   - Detect external function calls
   - Distinguish internal vs external function calls

5. **JSX Analyzer Tests**
   - Simplify JSX elements
   - Replace text with placeholders
   - Replace expressions with variable placeholders
   - Maintain hierarchy

6. **DFD Builder Tests**
   - Create correct node types
   - Infer edges from variable references
   - Generate valid vis.js compatible data

### Integration Tests

1. **End-to-End Parsing**
   - Parse complete React components
   - Verify DFD data structure
   - Test with real-world component examples

2. **Third-Party Hook Integration**
   - Test with SWR components
   - Test with TanStack Query components
   - Test with Jotai/Zustand components
   - Test with React Hook Form components
   - Test with React Router components

3. **Error Scenarios**
   - Invalid syntax handling
   - Missing component handling
   - Timeout handling
   - Partial result generation

### Test Data

Create sample React components in `src/test/fixtures/`:
- `simple-functional.tsx`: Basic functional component
- `with-hooks.tsx`: Component with useState, useEffect
- `with-third-party.tsx`: Component with useSWR, useAtom
- `class-component.tsx`: Class component
- `complex-component.tsx`: Large component for timeout testing

## Performance Considerations

### Optimization Strategies

1. **AST Caching**: Cache parsed AST for repeated analysis
2. **Lazy Analysis**: Only analyze requested aspects (props, hooks, etc.)
3. **Timeout Protection**: Abort parsing after 5 seconds
4. **Memory Management**: Release AST after analysis completes
5. **SWC Performance**: Leverage SWC's native Rust performance for fast parsing

### Performance Targets

- Parse files up to 1000 lines in < 500ms (SWC is significantly faster than TypeScript Compiler API)
- Parse files up to 5000 lines in < 2 seconds
- Memory usage < 50MB for typical components (SWC has lower memory footprint)

## Extension Integration

### VS Code Command Integration

```typescript
// In extension.ts
vscode.commands.registerCommand('web-component-analyzer.showStructure', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  
  const sourceCode = editor.document.getText();
  const filePath = editor.document.fileName;
  
  const parser = new ReactParser();
  const dfdData = await parser.parse(sourceCode, filePath);
  
  // Pass dfdData to webview for visualization
  showDFDWebview(dfdData);
});
```

### Webview Communication

```typescript
interface WebviewMessage {
  type: 'dfd-data';
  payload: DFDSourceData;
}

// Send to webview
webviewPanel.webview.postMessage({
  type: 'dfd-data',
  payload: dfdData
});
```

## Dependencies

### Required npm Packages

```json
{
  "@swc/core": "^1.3.0",
  "@swc/wasm": "^1.3.0"
}
```

**Note**: Use `@swc/core` for Node.js environments. The package includes native bindings for fast parsing.

## Future Enhancements

1. **Incremental Parsing**: Update DFD on file changes without full reparse
2. **Multi-Component Support**: Analyze multiple components in a single file
3. **Custom Hook Analysis**: Deep analysis of custom hook implementations
4. **Type Flow Analysis**: Track TypeScript type information through data flow (using SWC's type information)
5. **Interactive Filtering**: Allow users to show/hide specific node types
6. **SWC Plugin System**: Extend analysis capabilities using SWC plugins
