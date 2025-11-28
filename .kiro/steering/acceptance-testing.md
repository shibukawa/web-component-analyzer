---
inclusion: always
---

# Acceptance Testing Guidelines

Acceptance tests validate parser implementations by comparing extracted DFD elements against embedded YAML specifications in component files.

## Test File Structure

Test files use a three-digit numeric prefix: `{number}-{DescriptiveName}.{ext}` (e.g., `001-SimpleProps.tsx`).

Location: `examples/{framework}-vite/src/components/`

YAML specifications are embedded as comments using framework-appropriate syntax:

**React/TypeScript:**
```tsx
/*
ACCEPTANCE_TEST:
  description: "What this test validates"
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
*/
```

**Vue/Svelte:** Use `<!-- ACCEPTANCE_TEST: ... -->`

## YAML Schema

Required sections in every test:

```yaml
ACCEPTANCE_TEST:
  description: "Brief description"
  external_entities_input:      # Props, context, state initialization
    - name: string
      type: "prop" | "context" | "state"
      dataType: "string" | "number" | "boolean" | "object" | "array" | "function"
  processes:                     # Computations, handlers, effects
    - name: string
      description: string
      type: "computation" | "event_handler" | "effect"
  data_stores:                   # Internal state management
    - name: string
      type: "state" | "ref" | "computed" | "derived"
      dataType: string
  external_entities_output:      # Template rendering, function calls, events
    - name: string
      type: "template" | "function_call" | "event_emit"
      target: string
  data_flows:                    # Connections between elements
    - from: string
      to: string
      fromType: "external_entity_input" | "process" | "data_store"
      toType: "process" | "data_store" | "external_entity_output"
      description: string
```

Use empty arrays `[]` for unused sections. All fields are required; omit only `description` in nested objects if not applicable.

## Parser Output Format

Parsers must return this structure:

```typescript
interface ParsedComponent {
  externalEntitiesInput: Array<{ name: string; type: string; dataType: string }>;
  processes: Array<{ name: string; description?: string; type: string }>;
  dataStores: Array<{ name: string; type: string; dataType: string }>;
  externalEntitiesOutput: Array<{ name: string; type: string; target?: string }>;
  dataFlows: Array<{ from: string; to: string; fromType: string; toType: string; description?: string }>;
}
```

## Writing Tests

**Best Practices:**
- Start with simple patterns (single prop, basic state)
- Increase complexity incrementally
- One concept per test
- Use descriptive names
- Always include all DFD sections

**Minimum Coverage for New Frameworks:**
- Simple props/properties
- State management
- Event handlers
- Computed/derived values
- Effects/lifecycle hooks

## Running Tests

```bash
npm run test                    # All tests
npm run test -- --grep "react" # Framework-specific
npm run test -- --grep "001"   # Specific test number
```

## Test Failure Reporting

Failures report:
- Missing elements (in YAML but not parser output)
- Extra elements (in parser output but not YAML)
- Incorrect data flows
- Type mismatches
- File location of failure

## AI Assistant Workflow

When implementing parser features:

1. Check for existing tests in `examples/{framework}-vite/src/components/`
2. Run tests after implementing parser logic: `npm run test`
3. Add new tests when implementing new parser capabilities
4. Update YAML specs if parser output format changes
5. Use test failures as debugging guidance
6. Keep tests minimal—one pattern per test
7. Validate YAML syntax before committing

When adding framework support:
1. Create `examples/{framework}-vite/` directory
2. Add 5+ basic test cases covering required patterns
3. Implement parser
4. Run tests iteratively until all pass
