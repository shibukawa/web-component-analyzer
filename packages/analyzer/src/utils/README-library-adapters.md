# Library Adapter Types

This module defines the core type system for the third-party library adapter feature.

## Overview

The library adapter system enables the web-component-analyzer to recognize and properly visualize hooks from popular React third-party libraries like SWR, TanStack Query, React Router, and more.

## Core Types

### ImportInfo & ImportedItem

Represents information about import statements detected in a component file:

```typescript
interface ImportInfo {
  source: string;              // e.g., 'swr', '@tanstack/react-query'
  imports: ImportedItem[];     // List of imported items
  isNamespaceImport: boolean;  // true for: import * as SWR from 'swr'
  namespace?: string;          // The namespace identifier
}

interface ImportedItem {
  name: string;       // Original name in the library
  alias?: string;     // Local alias if renamed
  isDefault: boolean; // true for default imports
}
```

### LibraryAdapter & HookAdapter

Defines how a library's hooks should be mapped to DFD elements:

```typescript
interface LibraryAdapter {
  libraryName: string;        // e.g., 'swr'
  packagePatterns: string[];  // Alternative package names
  hooks: HookAdapter[];       // Hook configurations
}

interface HookAdapter {
  hookName: string;                // e.g., 'useSWR'
  returnPattern: ReturnValuePattern;
  dataFlows?: DataFlowPattern[];
}
```

### ReturnValuePattern & ReturnValueMapping

Describes how a hook's return value should be destructured and mapped:

```typescript
interface ReturnValuePattern {
  type: 'object' | 'array' | 'single';
  mappings: ReturnValueMapping[];
}

interface ReturnValueMapping {
  variableName?: string;    // For array patterns: '0', '1', '2'
  propertyName?: string;    // For object patterns: 'data', 'error'
  dfdElementType: DFDElementType;
  metadata?: ReturnValueMetadata;
}

type DFDElementType = 'external-entity-input' | 'data-store' | 'process';
```

## Example Usage

### SWR Library Adapter

```typescript
const swrAdapter: LibraryAdapter = {
  libraryName: 'swr',
  packagePatterns: ['swr'],
  hooks: [
    {
      hookName: 'useSWR',
      returnPattern: {
        type: 'object',
        mappings: [
          { 
            propertyName: 'data', 
            dfdElementType: 'external-entity-input' 
          },
          { 
            propertyName: 'error', 
            dfdElementType: 'data-store',
            metadata: { isError: true }
          },
          { 
            propertyName: 'isLoading', 
            dfdElementType: 'data-store',
            metadata: { isLoading: true }
          }
        ]
      }
    }
  ]
};
```

## Configuration Schema

The JSON schema for library adapters is defined in:
- `packages/analyzer/src/config/library-adapters.json` - JSON Schema definition
- `packages/analyzer/src/config/library-adapters-data.json` - Actual adapter data

## Related Files

- `library-adapter-types.ts` - Type definitions (this module)
- `hook-registry.ts` - Will be enhanced to use these types
- `hooks-analyzer.ts` - Will be enhanced to apply adapters
- `import-detector.ts` - Will use ImportInfo types (to be created)
