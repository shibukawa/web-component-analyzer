# Acceptance Testing Guidelines

## Overview

This project uses acceptance tests to validate parser implementations for different frontend frameworks. Sample components with embedded YAML specifications serve as test cases, ensuring parsers correctly extract Data Flow Diagram (DFD) elements.

## Test File Conventions

### Naming Pattern

- Test files MUST start with a three-digit numeric prefix: `001-`, `002-`, `003-`, etc.
- Follow the pattern: `{number}-{DescriptiveName}.{ext}`
- Examples:
  - `001-SimpleProps.tsx` (React)
  - `002-StateManagement.vue` (Vue)
  - `003-EventHandlers.svelte` (Svelte)

### File Location

Test files are organized by framework under `examples/`:

```
examples/
├── react-vite/src/components/
│   ├── 001-SimpleProps.tsx
│   └── 002-StateManagement.tsx
├── vue-vite/src/components/
│   ├── 001-SimpleProps.vue
│   └── 002-StateManagement.vue
└── svelte-vite/src/components/
    ├── 001-SimpleProps.svelte
    └── 002-StateManagement.svelte
```

## YAML Specification Format

### Embedding in Components

YAML specifications are embedded as comments within component files using framework-appropriate syntax:

**React/TypeScript:**
```tsx
/*
ACCEPTANCE_TEST:
external_entities_input:
  - name: "userName"
    type: "prop"
    dataType: "string"
*/
```

**Vue:**
```vue
<!--
ACCEPTANCE_TEST:
external_entities_input:
  - name: "userName"
    type: "prop"
    dataType: "string"
-->
```

**Svelte:**
```svelte
<!--
ACCEPTANCE_TEST:
external_entities_input:
  - name: "userName"
    type: "prop"
    dataType: "string"
-->
```

### YAML Schema

The YAML specification MUST include these sections:

```yaml
ACCEPTANCE_TEST:
  description: "Brief description of what this test validates"
  
  external_entities_input:
    - name: "entityName"
      type: "prop" | "context" | "state"
      dataType: "string" | "number" | "boolean" | "object" | "array" | "function"
  
  processes:
    - name: "processName"
      description: "What this process does"
      type: "computation" | "event_handler" | "effect"
  
  data_stores:
    - name: "storeName"
      type: "state" | "ref" | "computed" | "derived"
      dataType: "string" | "number" | "boolean" | "object" | "array"
  
  external_entities_output:
    - name: "outputName"
      type: "template" | "function_call" | "event_emit"
      target: "DOM element" | "parent function name"
  
  data_flows:
    - from: "sourceName"
      to: "targetName"
      fromType: "external_entity_input" | "process" | "data_store"
      toType: "process" | "data_store" | "external_entity_output"
      description: "Optional description of the data flow"
```

### Required Fields

- `external_entities_input`: List of all inputs (props, context, state initialization)
- `processes`: List of all processing logic (computations, handlers, effects)
- `data_stores`: List of all internal state management
- `external_entities_output`: List of all outputs (template rendering, function calls)
- `data_flows`: List of all data connections between elements

### Optional Fields

- `description`: Test case description
- `framework_version`: Specific framework version being tested
- `test_category`: Category for test organization (e.g., "basic", "advanced", "edge-cases")

## Test Execution

### Running Tests

```bash
# Run all acceptance tests
pnpm run test

# Run tests for specific framework
pnpm run test -- --grep "react"

# Run specific test by number
pnpm run test -- --grep "001"
```

### Test Runner Behavior

The test runner:
1. Scans `examples/` directories for files matching `{number}-*.{tsx,jsx,vue,svelte,js}`
2. Extracts YAML specifications from comments
3. Validates YAML syntax
4. Invokes the appropriate parser for the framework
5. Compares parser output against YAML specification
6. Reports pass/fail with detailed differences

### Expected Output Format

Parser output MUST match this structure for comparison:

```typescript
interface ParsedComponent {
  externalEntitiesInput: Array<{
    name: string;
    type: 'prop' | 'context' | 'state';
    dataType: string;
  }>;
  processes: Array<{
    name: string;
    description?: string;
    type: 'computation' | 'event_handler' | 'effect';
  }>;
  dataStores: Array<{
    name: string;
    type: 'state' | 'ref' | 'computed' | 'derived';
    dataType: string;
  }>;
  externalEntitiesOutput: Array<{
    name: string;
    type: 'template' | 'function_call' | 'event_emit';
    target?: string;
  }>;
  dataFlows: Array<{
    from: string;
    to: string;
    fromType: string;
    toType: string;
    description?: string;
  }>;
}
```

## Writing Acceptance Tests

### Best Practices

1. **Start Simple**: Begin with basic component patterns (simple props, single state)
2. **Incremental Complexity**: Gradually add more complex patterns (multiple states, computed values, effects)
3. **One Concept Per Test**: Each test should focus on validating one specific parser capability
4. **Clear Naming**: Use descriptive names that indicate what pattern is being tested
5. **Complete Specifications**: Include all DFD elements, even if empty arrays

### Example Test Case

```tsx
// examples/react-vite/src/components/001-SimpleProps.tsx

/*
ACCEPTANCE_TEST:
  description: "Simple component with string prop rendered in template"
  
  external_entities_input:
    - name: "userName"
      type: "prop"
      dataType: "string"
  
  processes: []
  
  data_stores: []
  
  external_entities_output:
    - name: "userName_display"
      type: "template"
      target: "div"
  
  data_flows:
    - from: "userName"
      to: "userName_display"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "Direct prop to template rendering"
*/

interface Props {
  userName: string;
}

export default function SimpleProps({ userName }: Props) {
  return <div>Hello, {userName}!</div>;
}
```

## Test Failure Reporting

When tests fail, the runner MUST report:

1. **Missing Elements**: DFD elements in YAML but not in parser output
2. **Extra Elements**: DFD elements in parser output but not in YAML
3. **Incorrect Data Flows**: Flows that don't match the specification
4. **Type Mismatches**: Elements with incorrect types or data types
5. **File Location**: Clear indication of which test file failed

## Integration with Development Workflow

### Pre-commit

Acceptance tests SHOULD run before commits to catch parser regressions early.

### CI/CD

Acceptance tests MUST run in CI/CD pipeline to prevent merging broken parser implementations.

### Adding New Framework Support

When adding support for a new framework:

1. Create framework directory under `examples/`
2. Add at least 5 basic acceptance test cases covering:
   - Simple props/properties
   - State management
   - Event handlers
   - Computed/derived values
   - Effects/lifecycle hooks
3. Implement parser for the framework
4. Run acceptance tests to validate implementation
5. Iterate until all tests pass

## AI Assistant Guidelines

When implementing parser features or adding framework support:

1. **Always check for existing acceptance tests** in the relevant `examples/` directory
2. **Run acceptance tests** after implementing parser logic
3. **Add new acceptance tests** when implementing new parser capabilities
4. **Update YAML specifications** if parser output format changes
5. **Use acceptance test failures** as guidance for fixing parser bugs
6. **Keep test cases minimal** - focus on one pattern per test
7. **Ensure YAML is valid** before committing test files
