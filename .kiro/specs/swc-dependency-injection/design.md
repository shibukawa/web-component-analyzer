# Design Document

## Overview

This design document outlines the refactoring of Vue and Svelte parsers to remove direct `@swc/core` dependencies from the analyzer package. The solution follows the existing React parser pattern by implementing dependency injection through a `ParserFunction` interface, allowing callers (extension or web packages) to provide their own SWC implementation.

## Architecture

### Current Architecture (Problematic)

```
┌─────────────────────────────────────────────────────────────┐
│ Extension Package (Node.js)                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Uses: @swc/core                                         │ │
│ │ Creates: DefaultVueParser, DefaultSvelteParser          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Analyzer Package (Environment-agnostic)                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VueASTAnalyzer                                          │ │
│ │   - Directly imports @swc/core ❌                       │ │
│ │   - parseScriptSetup() uses @swc/core.parseSync        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SvelteASTAnalyzer                                       │ │
│ │   - Directly imports @swc/core ❌                       │ │
│ │   - analyzeSvelteSFC() uses @swc/core.parseSync        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Web Package (Browser)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Uses: @swc/wasm-web                                     │ │
│ │ Creates: DefaultVueParser, DefaultSvelteParser          │ │
│ │ Problem: Vite tries to bundle @swc/core ❌              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (Solution)

```
┌─────────────────────────────────────────────────────────────┐
│ Extension Package (Node.js)                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ node-parser.ts                                          │ │
│ │   - Imports @swc/core                                   │ │
│ │   - Exports: parseWithSWC(code, path) => ParseResult   │ │
│ │   - Uses: @swc/core.parseSync                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Creates parsers with ParserFunction:                    │ │
│ │   - createVueParser(parseWithSWC)                       │ │
│ │   - createSvelteParser(parseWithSWC)                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Analyzer Package (Environment-agnostic)                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VueASTAnalyzer                                          │ │
│ │   - Constructor accepts ParserFunction ✅               │ │
│ │   - parseScriptSetup() uses this.parserFn ✅            │ │
│ │   - No direct @swc imports ✅                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SvelteASTAnalyzer                                       │ │
│ │   - Constructor accepts ParserFunction ✅               │ │
│ │   - analyzeSvelteSFC() uses this.parserFn ✅            │ │
│ │   - No direct @swc imports ✅                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DefaultVueParser / DefaultSvelteParser                  │ │
│ │   - Constructor accepts ParserFunction                  │ │
│ │   - Passes ParserFunction to AST Analyzer               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Web Package (Browser)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ browser-parser.ts                                       │ │
│ │   - Imports @swc/wasm-web                               │ │
│ │   - Exports: parseWithSWC(code, path) => ParseResult   │ │
│ │   - Uses: @swc/wasm-web.parseSync                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Creates parsers with ParserFunction:                    │ │
│ │   - createVueParser(parseWithSWC)                       │ │
│ │   - createSvelteParser(parseWithSWC)                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. ParserFunction Interface (Already Exists)

```typescript
// packages/analyzer/src/parser/index.ts
export type ParserFunction = (sourceCode: string, filePath: string) => Promise<ParseResult>;

export interface ParseResult {
  module?: swc.Module;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
}
```

This interface is already defined and used by React parser. No changes needed.

### 2. VueASTAnalyzer (Modified)

**File**: `packages/analyzer/src/parser/vue-ast-analyzer.ts`

**Changes**:
- Add `parserFn: ParserFunction` parameter to constructor
- Remove `import { parseSync } from '@swc/core'` from `parseScriptSetup()` method
- Replace direct `parseSync()` call with `this.parserFn()` call
- Update method signature to handle `ParseResult` instead of direct module

**Key Methods**:
```typescript
export class VueASTAnalyzer implements ASTAnalyzer {
  private parserFn: ParserFunction;
  
  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    // ... other initialization
  }
  
  private async parseScriptSetup(content: string, lang: string): Promise<swc.Module | null> {
    // Use this.parserFn instead of direct parseSync
    const parseResult = await this.parserFn(content, `temp.${lang}`);
    
    if (parseResult.error) {
      throw new Error(parseResult.error.message);
    }
    
    return parseResult.module || null;
  }
}
```

### 3. SvelteASTAnalyzer (Modified)

**File**: `packages/analyzer/src/parser/svelte-ast-analyzer.ts`

**Changes**:
- Add `parserFn: ParserFunction` parameter to constructor
- Remove `import { parseSync } from '@swc/core'` from `analyzeSvelteSFC()` method
- Replace direct `parseSync()` call with `this.parserFn()` call
- Update method signature to handle `ParseResult` instead of direct module

**Key Methods**:
```typescript
export class SvelteASTAnalyzer implements ASTAnalyzer {
  private parserFn: ParserFunction;
  
  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    // ... other initialization
  }
  
  private async analyzeSvelteSFC(source: string, filePath?: string): Promise<ComponentAnalysis | null> {
    // ... SFC parsing ...
    
    // Use this.parserFn instead of direct parseSync
    const parseResult = await this.parserFn(sfc.script.content, filePath || 'temp.js');
    
    if (parseResult.error) {
      console.error('SvelteASTAnalyzer: Script parsing failed:', parseResult.error);
      return null;
    }
    
    const module = parseResult.module;
    if (!module) {
      return null;
    }
    
    // ... rest of analysis ...
  }
}
```

### 4. DefaultVueParser (Modified)

**File**: `packages/analyzer/src/parser/index.ts`

**Changes**:
- Add `parserFn: ParserFunction` parameter to constructor
- Pass `parserFn` to `VueASTAnalyzer` constructor
- Update `createVueParser()` factory function to accept `parserFn`

**Key Methods**:
```typescript
export class DefaultVueParser implements ComponentParser {
  private parserFn: ParserFunction;
  private astAnalyzer: any;
  
  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    this.typeResolver = typeResolver;
    // ... initialization
  }
  
  private async loadAnalyzer(): Promise<void> {
    const { VueASTAnalyzer } = await import('./vue-ast-analyzer.js');
    this.astAnalyzer = new VueASTAnalyzer(this.parserFn, this.typeResolver);
  }
}

export function createVueParser(parserFn: ParserFunction, typeResolver?: TypeResolver): ComponentParser {
  return new DefaultVueParser(parserFn, typeResolver);
}
```

### 5. DefaultSvelteParser (Modified)

**File**: `packages/analyzer/src/parser/index.ts`

**Changes**:
- Add `parserFn: ParserFunction` parameter to constructor
- Pass `parserFn` to `SvelteASTAnalyzer` constructor
- Update `createSvelteParser()` factory function to accept `parserFn`

**Key Methods**:
```typescript
export class DefaultSvelteParser implements ComponentParser {
  private parserFn: ParserFunction;
  private astAnalyzer: any;
  
  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    this.typeResolver = typeResolver;
    // ... initialization
  }
  
  private async loadAnalyzer(): Promise<void> {
    const { SvelteASTAnalyzer } = await import('./svelte-ast-analyzer.js');
    this.astAnalyzer = new SvelteASTAnalyzer(this.parserFn, this.typeResolver);
  }
}

export function createSvelteParser(parserFn: ParserFunction, typeResolver?: TypeResolver): ComponentParser {
  return new DefaultSvelteParser(parserFn, typeResolver);
}
```

### 6. Extension Package Parser Provider (Modified)

**File**: `packages/extension/src/utils/node-parser.ts`

**Changes**:
- Ensure `parseWithSWC()` function is exported and available
- This file already exists and provides Node.js parser implementation

**Current Implementation** (already correct):
```typescript
import { parseSync } from '@swc/core';
import type { ParseResult } from '@web-component-analyzer/analyzer';

export async function parseWithSWC(sourceCode: string, filePath: string): Promise<ParseResult> {
  try {
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
    
    const module = parseSync(sourceCode, {
      syntax: isTsx ? 'typescript' : 'ecmascript',
      tsx: true,
      decorators: true,
      dynamicImport: true,
    });

    return { module };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
```

### 7. Extension Package Parser Usage (Modified)

**File**: `packages/extension/src/visualization/dfd-visualizer-service.ts`

**Changes**:
- Update `createVueParser()` and `createSvelteParser()` calls to pass `parseWithSWC`

**Before**:
```typescript
const parser = createVueParser();
```

**After**:
```typescript
import { parseWithSWC } from '../utils/node-parser';
const parser = createVueParser(parseWithSWC);
```

### 8. Web Package Parser Provider (Modified)

**File**: `packages/web/src/services/analyzer.ts`

**Changes**:
- Update browser parser to provide `ParserFunction` for Vue and Svelte
- Ensure `parseWithSWC()` uses `@swc/wasm-web`

**Current Implementation** (needs update):
```typescript
// Add ParserFunction for browser environment
async function parseWithSWCBrowser(sourceCode: string, filePath: string): Promise<ParseResult> {
  try {
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
    
    const module = await swc.parseSync(sourceCode, {
      syntax: isTsx ? 'typescript' : 'ecmascript',
      tsx: true,
      decorators: true,
      dynamicImport: true,
    });

    return { module };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// Update parser creation
const parser = framework === 'vue' 
  ? createVueParser(parseWithSWCBrowser)
  : createSvelteParser(parseWithSWCBrowser);
```

### 9. Update createParser() Helper (Modified)

**File**: `packages/analyzer/src/parser/index.ts`

**Changes**:
- Update `createParser()` function signature to require `parserFn` for all frameworks

**Before**:
```typescript
export function createParser(
  filePath: string,
  parserFn: ParserFunction,
  typeResolver?: TypeResolver
): ComponentParser {
  if (filePath.endsWith('.vue')) {
    return createVueParser(typeResolver);
  }
  if (filePath.endsWith('.svelte')) {
    return createSvelteParser(typeResolver);
  }
  return createReactParser(parserFn, typeResolver);
}
```

**After**:
```typescript
export function createParser(
  filePath: string,
  parserFn: ParserFunction,
  typeResolver?: TypeResolver
): ComponentParser {
  if (filePath.endsWith('.vue')) {
    return createVueParser(parserFn, typeResolver);
  }
  if (filePath.endsWith('.svelte')) {
    return createSvelteParser(parserFn, typeResolver);
  }
  return createReactParser(parserFn, typeResolver);
}
```

## Data Models

### ParseResult (Already Exists)

```typescript
export interface ParseResult {
  module?: swc.Module;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
}
```

No changes needed to this interface.

### ParserFunction (Already Exists)

```typescript
export type ParserFunction = (sourceCode: string, filePath: string) => Promise<ParseResult>;
```

No changes needed to this type.

## Error Handling

### 1. Parser Function Errors

When `parserFn()` returns an error, the AST analyzers should:
- Log the error for debugging
- Return `null` to indicate no component found
- Allow the error handler to create appropriate user-facing error messages

### 2. Missing Parser Function

If `parserFn` is not provided to constructor:
- TypeScript will catch this at compile time (required parameter)
- No runtime checks needed

### 3. SFC Parsing Errors

SFC parsing errors (from `SFCParser`) are handled separately and should not be affected by this refactoring.

## Testing Strategy

### 1. Unit Tests

**New Tests**:
- Test `VueASTAnalyzer` with mock `ParserFunction`
- Test `SvelteASTAnalyzer` with mock `ParserFunction`
- Test error handling when `ParserFunction` returns errors

**Modified Tests**:
- Update existing Vue/Svelte analyzer tests to provide mock `ParserFunction`

### 2. Integration Tests

**Extension Package**:
- Test Vue component parsing with `@swc/core` parser
- Test Svelte component parsing with `@swc/core` parser
- Verify DFD generation matches expected output

**Web Package**:
- Test Vue component parsing with `@swc/wasm-web` parser
- Test Svelte component parsing with `@swc/wasm-web` parser
- Verify web app builds successfully
- Verify web app runs without errors

### 3. Acceptance Tests

**Existing Tests**:
- Run all existing Vue acceptance tests
- Run all existing Svelte acceptance tests
- Verify all tests pass with new implementation

**No New Tests Needed**:
- Acceptance tests should pass without modification
- They test end-to-end behavior, not implementation details

## Migration Path

### Phase 1: Update Analyzer Package
1. Modify `VueASTAnalyzer` to accept `ParserFunction`
2. Modify `SvelteASTAnalyzer` to accept `ParserFunction`
3. Update `DefaultVueParser` and `DefaultSvelteParser` constructors
4. Update factory functions (`createVueParser`, `createSvelteParser`)
5. Update `createParser()` helper function

### Phase 2: Update Extension Package
1. Verify `node-parser.ts` exports `parseWithSWC`
2. Update `dfd-visualizer-service.ts` to pass `parseWithSWC` to Vue/Svelte parsers
3. Update any other extension files that create parsers

### Phase 3: Update Web Package
1. Create or update browser parser function in `analyzer.ts`
2. Update parser creation to pass browser parser function
3. Test web app builds successfully
4. Test web app runs without errors

### Phase 4: Verification
1. Run all acceptance tests
2. Test extension with Vue components
3. Test extension with Svelte components
4. Test web app with Vue components
5. Test web app with Svelte components

## Design Decisions and Rationales

### Decision 1: Follow React Parser Pattern

**Rationale**: The React parser already implements dependency injection successfully. Using the same pattern for Vue and Svelte ensures consistency and maintainability.

### Decision 2: Use Existing ParserFunction Interface

**Rationale**: The `ParserFunction` interface is already defined and proven to work. No need to create a new interface.

### Decision 3: Keep SFC Parsing in Analyzer

**Rationale**: SFC parsing (extracting script/template sections) doesn't require SWC and can remain in the analyzer package. Only the JavaScript/TypeScript parsing needs to be injected.

### Decision 4: Dynamic Import for AST Analyzers

**Rationale**: Keep the existing dynamic import pattern for `VueASTAnalyzer` and `SvelteASTAnalyzer` to avoid bundling issues. The `ParserFunction` is passed during analyzer instantiation.

### Decision 5: No Changes to SFC Parser

**Rationale**: The `SFCParser` class doesn't use SWC and works correctly in both environments. No changes needed.

## Performance Considerations

### Impact: Minimal

- The refactoring changes how the parser is provided, not how it's used
- No additional function calls or overhead
- Same parsing performance as before

### Memory: No Change

- Same number of objects created
- Same memory footprint

## Security Considerations

### No Security Impact

- This is an internal refactoring
- No changes to external APIs or data handling
- No new security risks introduced
