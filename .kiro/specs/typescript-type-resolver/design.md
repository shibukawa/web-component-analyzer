# Design Document: TypeScript Type Resolver

## Overview

The TypeScript Type Resolver adds accurate type information to the web-component-analyzer by integrating with VS Code's TypeScript Language Server. This enables precise classification of props as functions or values, especially for custom components where heuristics alone are insufficient.

The design is framework-agnostic and supports React, Vue, Svelte, and other TypeScript-based frameworks. It operates on-demand when triggered by the user, without requiring persistent caching.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
│                                                              │
│  ┌────────────────┐         ┌──────────────────────┐       │
│  │  DFD Builder   │────────▶│   Type Resolver      │       │
│  │                │         │                      │       │
│  └────────────────┘         └──────────┬───────────┘       │
│                                        │                    │
│                                        ▼                    │
│                             ┌──────────────────────┐       │
│                             │  Type Classifier     │       │
│                             └──────────────────────┘       │
└─────────────────────────────────────┬───────────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────┐
                    │  VS Code TypeScript Language     │
                    │  Server (via vscode.languages)   │
                    └──────────────────────────────────┘
```

### Component Interaction Flow

1. **DFD Builder** encounters a prop on a custom component
2. **Type Resolver** receives a type query request with:
   - File path
   - Component name
   - Prop name
   - Position in source code
3. **Type Resolver** queries VS Code's TypeScript Language Server
4. **Type Classifier** parses the returned type information
5. Classify as function/value based on TypeScript type
6. Return classification result to DFD Builder

## Components and Interfaces

### 1. TypeResolver Class

Main service for resolving TypeScript types.

```typescript
interface TypeResolverOptions {
  // Minimal options - no performance tuning needed
}

interface TypeQueryRequest {
  filePath: string;
  componentName: string;
  propName: string;
  position: { line: number; character: number };
}

interface TypeQueryResult {
  propName: string;
  isFunction: boolean;
  typeString?: string; // e.g., "() => void"
  source: 'language-server';
  error?: string;
}

class TypeResolver {
  constructor(options?: TypeResolverOptions);
  
  /**
   * Resolve type for a single prop
   */
  async resolveType(request: TypeQueryRequest): Promise<TypeQueryResult>;
  
  /**
   * Resolve types for multiple props
   */
  async resolveTypes(requests: TypeQueryRequest[]): Promise<TypeQueryResult[]>;
}
```

### 2. LanguageServerClient Class

Wrapper for VS Code TypeScript Language Server interactions.

```typescript
interface TypeDefinition {
  typeString: string;
  kind: string; // 'function', 'method', 'property', etc.
  documentation?: string;
}

class LanguageServerClient {
  /**
   * Get type definition at a specific position
   */
  async getTypeAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<TypeDefinition | null>;
  
  /**
   * Get hover information (includes type)
   */
  async getHoverInfo(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null>;
  
  /**
   * Execute TypeScript command
   */
  async executeTypeScriptCommand(
    command: string,
    args: any[]
  ): Promise<any>;
}
```

### 3. TypeClassifier Class

Parses TypeScript type strings and classifies them.

```typescript
interface TypeClassification {
  isFunction: boolean;
  isFunctionLike: boolean; // Includes callable objects
  isUnion: boolean;
  unionTypes?: string[];
  baseType: string;
}

class TypeClassifier {
  /**
   * Classify a TypeScript type string
   */
  classify(typeString: string): TypeClassification;
  
  /**
   * Check if type string represents a function
   */
  isFunction(typeString: string): boolean;
  
  /**
   * Check if type is a known event handler type
   */
  isEventHandler(typeString: string): boolean;
  
  /**
   * Extract function signature from type
   */
  extractFunctionSignature(typeString: string): string | null;
}
```



## Data Models

### Type Information Storage

```typescript
interface PropTypeInfo {
  propName: string;
  componentName: string;
  filePath: string;
  isFunction: boolean;
  typeString?: string;
}
```

### Integration with Existing DFD Types

Extend existing `PropInfo` interface:

```typescript
interface PropInfo {
  name: string;
  type?: string;
  isRequired?: boolean;
  defaultValue?: string;
  // NEW: Type resolution metadata
  isFunction?: boolean;
  typeString?: string; // Full TypeScript type string
}
```

## Error Handling

### Error Scenarios and Responses

1. **Language Server Unavailable**
   - Return error result with `error` field set
   - Log error: "TypeScript Language Server not available"
   - DFD Builder should handle missing type information gracefully

2. **Type Query Failed**
   - Return error result
   - Log error: "Type query failed for {propName}: {error}"
   - Include error details in result

3. **Invalid Type String**
   - Attempt to parse with TypeClassifier
   - If parsing fails, return error result
   - Log error with type string for debugging

4. **File Not Found**
   - Return error result
   - Log error: "File not found: {filePath}"
   - Skip type resolution for this prop

5. **TypeScript Configuration Error**
   - Return error result
   - Log error: "TypeScript configuration error"
   - DFD Builder continues without type information

### Error Recovery Strategy

```typescript
async function resolveType(
  request: TypeQueryRequest
): Promise<TypeQueryResult> {
  try {
    const result = await this.resolveViaLanguageServer(request);
    if (result) return result;
    
    // If no result, return error
    return {
      propName: request.propName,
      isFunction: false,
      source: 'language-server',
      error: 'No type information available'
    };
  } catch (error) {
    return {
      propName: request.propName,
      isFunction: false,
      source: 'language-server',
      error: error.message
    };
  }
}
```

## Testing Strategy

### Unit Tests

1. **TypeClassifier Tests**
   - Test function type detection: `() => void`, `Function`, `MouseEventHandler`
   - Test union types: `string | (() => void)`
   - Test callable interfaces
   - Test edge cases: `any`, `unknown`, `never`

2. **LanguageServerClient Tests**
   - Mock VS Code API responses
   - Test error scenarios
   - Test multiple type queries

### Integration Tests

1. **React Component Tests**
   - Test custom component with typed props
   - Test event handler props
   - Test render props
   - Test custom hook return values

2. **Vue Component Tests**
   - Test Vue component props
   - Test Pinia store actions
   - Test emits and event handlers

3. **Framework-Agnostic Tests**
   - Test JavaScript files (no types)
   - Test mixed TypeScript/JavaScript projects
   - Test third-party component libraries

### Acceptance Tests

Create sample components in `examples/` with embedded YAML specs:

```tsx
// examples/react-vite/src/components/005-CustomComponentProps.tsx

/*
ACCEPTANCE_TEST:
  description: "Custom component with function and value props"
  
  external_entities_input:
    - name: "userName"
      type: "prop"
      dataType: "string"
    - name: "onSubmit"
      type: "prop"
      dataType: "function"
  
  processes:
    - name: "handleClick"
      type: "event_handler"
  
  data_flows:
    - from: "handleClick"
      to: "onSubmit"
      fromType: "process"
      toType: "external_entity_input"
*/

interface CustomButtonProps {
  userName: string;
  onSubmit: (name: string) => void;
}

function CustomButton({ userName, onSubmit }: CustomButtonProps) {
  const handleClick = () => {
    onSubmit(userName);
  };
  
  return <button onClick={handleClick}>Submit {userName}</button>;
}
```



## Framework-Specific Considerations

### React

- Support `React.FC`, `React.ComponentType` prop types
- Recognize event handler types: `MouseEventHandler`, `ChangeEventHandler`, etc.
- Support custom hook return types
- Handle `forwardRef` and `useImperativeHandle` patterns

### Vue

- Support Vue 3 `defineProps` with TypeScript
- Recognize Pinia store actions and getters
- Support `emit` function types
- Handle Vue SFC `<script setup>` syntax

### Svelte

- Support Svelte component prop types
- Recognize Svelte store subscriptions
- Support event dispatcher types
- Handle Svelte's reactive declarations

### Framework Detection

```typescript
function detectFramework(filePath: string, ast: any): Framework {
  if (filePath.endsWith('.vue')) return 'vue';
  if (filePath.endsWith('.svelte')) return 'svelte';
  
  // Check imports
  if (hasImport(ast, 'react')) return 'react';
  if (hasImport(ast, 'vue')) return 'vue';
  if (hasImport(ast, 'svelte')) return 'svelte';
  
  return 'unknown';
}
```

## Integration Points

### 1. Props Analyzer Integration

Modify `PropsAnalyzer` to use `TypeResolver`:

```typescript
class SWCPropsAnalyzer {
  constructor(private typeResolver: TypeResolver) {}
  
  async analyzeProps(
    component: ComponentInfo,
    filePath: string
  ): Promise<PropInfo[]> {
    const props = this.extractPropsFromAST(component);
    
    // Resolve types for all props
    const typeRequests = props.map(prop => ({
      filePath,
      componentName: component.name,
      propName: prop.name,
      position: prop.position
    }));
    
    const typeResults = await this.typeResolver.resolveTypes(typeRequests);
    
    // Merge type information
    return props.map((prop, i) => ({
      ...prop,
      isFunction: typeResults[i].isFunction,
      typeString: typeResults[i].typeString
    }));
  }
}
```

### 2. DFD Builder Integration

Use type information when creating edges:

```typescript
class DFDBuilder {
  private createPropEdges(props: PropInfo[]): DFDEdge[] {
    return props.map(prop => {
      const edgeType = prop.isFunction ? 'function-call' : 'data-flow';
      
      return {
        from: prop.name,
        to: 'component',
        type: edgeType
      };
    });
  }
}
```

## Configuration

### Extension Settings

Add VS Code settings for type resolution:

```json
{
  "webComponentAnalyzer.typeResolution.enabled": true
}
```

### Usage in Extension

```typescript
const config = vscode.workspace.getConfiguration('webComponentAnalyzer');
const enabled = config.get('typeResolution.enabled', true);

if (enabled) {
  const typeResolver = new TypeResolver();
  // Use type resolver
}
```

## Migration Path

### Phase 1: Core Implementation
- Implement `TypeResolver`, `LanguageServerClient`, `TypeClassifier`
- Add basic function type detection
- Integrate with Props Analyzer

### Phase 2: Framework Support
- Add React-specific type handling
- Add Vue-specific type handling
- Add Svelte-specific type handling

### Phase 3: Testing and Integration
- Add comprehensive unit tests
- Add acceptance tests with sample components
- Integrate with existing DFD Builder
