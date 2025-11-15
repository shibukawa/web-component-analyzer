# Design Document

## Overview

This design extends the web-component-analyzer to support popular React third-party libraries by implementing a flexible library adapter system. The system will automatically detect library imports, apply appropriate hook patterns, and generate accurate DFD visualizations for components using libraries like SWR, TanStack Query, React Router, React Hook Form, Zustand, Jotai, MobX, Apollo Client, RTK Query, and tRPC.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AST Parser                               │
│  (Existing: ast-parser.ts, ast-analyzer.ts)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Import Detector (NEW)                           │
│  - Extract import statements                                 │
│  - Identify third-party libraries                            │
│  - Activate library adapters                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Hook Registry (ENHANCED)                        │
│  - Built-in React hooks                                      │
│  - Third-party library adapters                              │
│  - Custom adapter registration                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Hooks Analyzer (ENHANCED)                       │
│  - Extract hook calls                                        │
│  - Apply library adapters                                    │
│  - Map return values to DFD elements                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DFD Builder                                     │
│  (Existing: dfd-builder.ts)                                  │
└─────────────────────────────────────────────────────────────┘
```


### Component Flow

1. **Import Detection Phase**
   - AST Parser extracts all import statements from the component file
   - Import Detector identifies which third-party libraries are being used
   - Relevant library adapters are activated for the current analysis

2. **Hook Analysis Phase**
   - Hooks Analyzer traverses the component AST to find hook calls
   - For each hook call, check if it matches a registered library adapter
   - Apply the adapter's pattern to map return values to DFD elements
   - Fall back to default behavior for unrecognized hooks

3. **DFD Generation Phase**
   - DFD Builder receives enriched hook information with library-specific metadata
   - Generate appropriate nodes (External Entity Input, Data Store, Process) based on adapter mappings
   - Create data flows between nodes according to library patterns

## Components and Interfaces

### 1. Import Detector (NEW)

**File**: `packages/analyzer/src/analyzers/import-detector.ts`

**Purpose**: Extract and analyze import statements to identify third-party libraries.

**Interface**:
```typescript
export interface ImportInfo {
  source: string; // e.g., 'swr', 'react-router-dom'
  imports: ImportedItem[];
  isNamespaceImport: boolean; // import * as SWR from 'swr'
  namespace?: string; // The namespace identifier if isNamespaceImport is true
}

export interface ImportedItem {
  name: string; // Original name in the library
  alias?: string; // Local alias if renamed
  isDefault: boolean; // true for default imports
}

export interface ImportDetector {
  detectImports(module: swc.Module): ImportInfo[];
  getActiveLibraries(imports: ImportInfo[]): string[];
}
```


**Implementation Details**:
- Traverse module body to find ImportDeclaration nodes
- Extract source (library name) and imported items
- Handle named imports, default imports, and namespace imports
- Track aliases for proper hook call matching

### 2. Library Adapter System (NEW)

**File**: `packages/analyzer/src/utils/library-adapters.ts`

**Purpose**: Define patterns for mapping third-party library hooks to DFD elements.

**Interface**:
```typescript
export interface LibraryAdapter {
  libraryName: string; // e.g., 'swr', '@tanstack/react-query'
  packagePatterns: string[]; // Alternative package names
  hooks: HookAdapter[];
}

export interface HookAdapter {
  hookName: string; // e.g., 'useSWR', 'useQuery'
  returnPattern: ReturnValuePattern;
  dataFlows?: DataFlowPattern[];
}

export interface ReturnValuePattern {
  type: 'object' | 'array' | 'single';
  mappings: ReturnValueMapping[];
}

export interface ReturnValueMapping {
  variableName?: string; // For array patterns: index-based (0, 1, 2)
  propertyName?: string; // For object patterns: property name
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: {
    isLoading?: boolean;
    isError?: boolean;
    isMutation?: boolean;
    isRefetch?: boolean;
  };
}

export interface DataFlowPattern {
  from: string; // Variable name or property name
  to: string; // Variable name or property name
  condition?: string; // Optional condition for the flow
}
```


**Example Adapter Configuration**:
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
          { propertyName: 'data', dfdElementType: 'external-entity-input' },
          { propertyName: 'error', dfdElementType: 'data-store', metadata: { isError: true } },
          { propertyName: 'isLoading', dfdElementType: 'data-store', metadata: { isLoading: true } },
          { propertyName: 'isValidating', dfdElementType: 'data-store' },
          { propertyName: 'mutate', dfdElementType: 'process', metadata: { isMutation: true } }
        ]
      }
    },
    {
      hookName: 'useSWRMutation',
      returnPattern: {
        type: 'object',
        mappings: [
          { propertyName: 'data', dfdElementType: 'external-entity-input' },
          { propertyName: 'error', dfdElementType: 'data-store', metadata: { isError: true } },
          { propertyName: 'trigger', dfdElementType: 'process', metadata: { isMutation: true } },
          { propertyName: 'isMutating', dfdElementType: 'data-store', metadata: { isLoading: true } }
        ]
      }
    }
  ]
};
```

### 3. Enhanced Hook Registry

**File**: `packages/analyzer/src/utils/hook-registry.ts` (ENHANCED)

**Changes**:
- Add library adapter registration and lookup
- Support adapter-based hook classification
- Maintain backward compatibility with existing category system


**New Interface**:
```typescript
export interface HookRegistry {
  // Existing methods
  getHookCategory(hookName: string): HookCategory | null;
  registerHook(hookName: string, category: HookCategory): void;
  
  // New methods for library adapters
  registerLibraryAdapter(adapter: LibraryAdapter): void;
  getLibraryAdapter(libraryName: string, hookName: string): HookAdapter | null;
  activateLibrary(libraryName: string): void;
  deactivateLibrary(libraryName: string): void;
  getActiveLibraries(): string[];
}
```

### 4. Enhanced Hooks Analyzer

**File**: `packages/analyzer/src/analyzers/hooks-analyzer.ts` (ENHANCED)

**Changes**:
- Accept active library list from Import Detector
- Check library adapters before falling back to category-based classification
- Extract and map return values according to adapter patterns
- Generate enriched HookInfo with library-specific metadata

**New Methods**:
```typescript
class SWCHooksAnalyzer {
  private activeLibraries: string[] = [];
  
  setActiveLibraries(libraries: string[]): void;
  
  private applyLibraryAdapter(
    hookInfo: HookInfo,
    declaration: swc.VariableDeclarator
  ): EnrichedHookInfo | null;
  
  private extractReturnValueMappings(
    pattern: swc.Pattern,
    adapter: HookAdapter
  ): Map<string, DFDElementType>;
}
```


**Enhanced HookInfo**:
```typescript
export interface EnrichedHookInfo extends HookInfo {
  libraryName?: string; // e.g., 'swr', '@tanstack/react-query'
  returnValueMappings?: Map<string, {
    dfdElementType: 'external-entity-input' | 'data-store' | 'process';
    metadata?: Record<string, any>;
  }>;
}
```

### 5. Enhanced DFD Builder

**File**: `packages/analyzer/src/parser/dfd-builder.ts` (ENHANCED)

**Changes**:
- Handle EnrichedHookInfo with library-specific mappings
- Generate nodes based on return value mappings
- Apply library-specific metadata to nodes (e.g., loading states, error states)

**New Methods**:
```typescript
class DFDBuilder {
  private buildNodesFromLibraryHook(
    hookInfo: EnrichedHookInfo
  ): DFDNode[];
  
  private applyLibraryMetadata(
    node: DFDNode,
    metadata: Record<string, any>
  ): void;
}
```

## Data Models

### Library Adapter Configuration Format

Library adapters will be defined in JSON format for easy extensibility:

**File**: `packages/analyzer/src/config/library-adapters.json`

```json
{
  "libraries": [
    {
      "libraryName": "swr",
      "packagePatterns": ["swr"],
      "hooks": [
        {
          "hookName": "useSWR",
          "returnPattern": {
            "type": "object",
            "mappings": [
              {
                "propertyName": "data",
                "dfdElementType": "external-entity-input"
              },
              {
                "propertyName": "error",
                "dfdElementType": "data-store",
                "metadata": { "isError": true }
              }
            ]
          }
        }
      ]
    }
  ]
}
```


### Adapter Registry Storage

The Hook Registry will maintain:
- Map of library name → LibraryAdapter
- Set of active libraries (based on imports in current file)
- Fallback to category-based classification for unmatched hooks

## Error Handling

### Import Detection Errors
- **Invalid Import Syntax**: Log warning and skip the import
- **Unrecognized Library**: No error, simply don't activate any adapter
- **Namespace Import Conflicts**: Track namespace and match hook calls with namespace prefix

### Adapter Application Errors
- **Pattern Mismatch**: If destructuring pattern doesn't match adapter pattern, fall back to default behavior
- **Missing Adapter**: If library is detected but no adapter exists, use category-based classification
- **Invalid Adapter Configuration**: Validate adapter JSON at load time, reject invalid configurations

### DFD Generation Errors
- **Unknown DFD Element Type**: Log error and skip the mapping
- **Circular Data Flows**: Detect and break cycles with warning
- **Missing Variable References**: Create placeholder nodes with warning

## Testing Strategy

### Unit Tests

1. **Import Detector Tests**
   - Test named imports: `import { useSWR } from 'swr'`
   - Test default imports: `import SWR from 'swr'`
   - Test namespace imports: `import * as SWR from 'swr'`
   - Test aliased imports: `import { useSWR as useData } from 'swr'`
   - Test multiple imports from same library
   - Test imports from scoped packages: `@tanstack/react-query`

2. **Library Adapter Tests**
   - Test adapter registration and lookup
   - Test pattern matching for object destructuring
   - Test pattern matching for array destructuring
   - Test metadata application
   - Test adapter validation

3. **Enhanced Hooks Analyzer Tests**
   - Test library adapter application
   - Test fallback to category-based classification
   - Test return value mapping extraction
   - Test enriched HookInfo generation


4. **Enhanced DFD Builder Tests**
   - Test node generation from library hooks
   - Test metadata application to nodes
   - Test data flow creation for library patterns
   - Test backward compatibility with existing hooks

### Integration Tests

1. **End-to-End Library Support Tests**
   - Parse component using SWR and verify DFD output
   - Parse component using TanStack Query and verify DFD output
   - Parse component using React Router and verify DFD output
   - Parse component using React Hook Form and verify DFD output
   - Parse component using Zustand and verify DFD output
   - Parse component using Jotai and verify DFD output
   - Parse component using MobX and verify DFD output
   - Parse component using Apollo Client and verify DFD output
   - Parse component using RTK Query and verify DFD output
   - Parse component using tRPC and verify DFD output

2. **Mixed Library Tests**
   - Component using multiple libraries (e.g., SWR + React Router)
   - Component using library hooks alongside built-in React hooks
   - Component with custom hooks and library hooks

### Acceptance Tests

Following the project's acceptance testing format, create test components for each library:

**Location**: `examples/react-vite/src/components/`

**Naming**: `{number}-{LibraryName}-{Pattern}.tsx`

Examples:
- `101-SWR-BasicFetch.tsx`
- `102-SWR-Mutation.tsx`
- `103-TanStackQuery-BasicQuery.tsx`
- `104-TanStackQuery-Mutation.tsx`
- `105-ReactRouter-Navigation.tsx`
- `106-ReactHookForm-BasicForm.tsx`
- `107-Zustand-StateManagement.tsx`
- `108-Jotai-AtomicState.tsx`
- `109-MobX-ObservableState.tsx`
- `110-Apollo-GraphQLQuery.tsx`
- `111-RTKQuery-APIEndpoint.tsx`
- `112-tRPC-TypeSafeProcedure.tsx`

Each test component will include embedded YAML specifications defining expected DFD elements.


## Library-Specific Design Details

### 1. SWR (Data Fetching)

**Hooks**: `useSWR`, `useSWRMutation`, `useSWRConfig`, `useSWRInfinite`

**DFD Mapping**:
- `data` → External Entity Input (fetched data from API)
- `error` → Data Store (error state)
- `isLoading`, `isValidating` → Data Store (loading states)
- `mutate` → Process (mutation function)

**Key Pattern**: Object destructuring with data, error, and loading states

### 2. TanStack Query (React Query)

**Hooks**: `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueries`

**DFD Mapping**:
- `data` → External Entity Input (query data)
- `error` → Data Store (error state)
- `isLoading`, `isFetching`, `isError` → Data Store (status states)
- `refetch` → Process (refetch function)
- `mutate`, `mutateAsync` → Process (mutation functions)

**Key Pattern**: Object destructuring with comprehensive status flags

### 3. React Router

**Hooks**: `useNavigate`, `useParams`, `useLocation`, `useSearchParams`

**DFD Mapping**:
- `useParams()` → External Entity Input (route parameters)
- `useLocation()` → External Entity Input (location object)
- `useNavigate()` → Process (navigation function)
- `searchParams` from `useSearchParams()` → External Entity Input
- `setSearchParams` from `useSearchParams()` → Process

**Key Pattern**: Mix of single return values and array destructuring

### 4. Next.js Routing

**Hooks**: `useRouter`, `usePathname`, `useSearchParams`, `useParams`

**DFD Mapping**:
- `usePathname()` → External Entity Input (current pathname)
- `useSearchParams()` → External Entity Input (search parameters)
- `useParams()` → External Entity Input (route parameters)
- `router.push`, `router.replace` → Process (navigation methods)

**Key Pattern**: Single return values and object with methods


### 5. React Hook Form

**Hooks**: `useForm`, `useController`, `useWatch`, `useFormState`

**DFD Mapping**:
- Form state (`formState.errors`, `formState.isDirty`, `formState.isValid`) → Data Store
- `register` → Process (field registration)
- `handleSubmit` → Process (form submission handler)
- `setValue`, `reset` → Process (form manipulation)
- `watch` → External Entity Input (watched field values)

**Key Pattern**: Object destructuring with nested formState object

### 6. Zustand

**Hooks**: Custom store hooks (e.g., `useStore`, `useBearStore`)

**DFD Mapping**:
- Selected state → External Entity Input (global state slice)
- Store actions → Process (state update functions)

**Key Pattern**: Selector-based state access, requires heuristic classification

**Special Handling**: Zustand stores are created with `create()`, not imported. Detection requires:
- Identifying store creation patterns
- Tracking store variable names
- Matching hook calls to store variables

### 7. Jotai

**Hooks**: `useAtom`, `useAtomValue`, `useSetAtom`

**DFD Mapping**:
- `value` from `useAtom` → External Entity Input (atom value)
- `setValue` from `useAtom` → Process (atom setter)
- `useAtomValue()` → External Entity Input (read-only atom)
- `useSetAtom()` → Process (write-only setter)

**Key Pattern**: Array destructuring for `useAtom`, single return for others

### 8. MobX

**Hooks**: `useObserver`, `useLocalObservable`

**DFD Mapping**:
- Observable state access → External Entity Input
- Action function calls → Process

**Special Handling**: MobX uses `observer` HOC, not just hooks. Detection requires:
- Identifying `observer()` wrapper
- Tracking observable state access within component
- Detecting action function calls


### 9. Apollo Client

**Hooks**: `useQuery`, `useMutation`, `useSubscription`, `useLazyQuery`

**DFD Mapping**:
- `data` → External Entity Input (GraphQL query data)
- `loading`, `error`, `networkStatus` → Data Store (query states)
- Mutation function → Process (GraphQL mutation)
- `refetch`, `fetchMore` → Process (query operations)

**Key Pattern**: Object destructuring with GraphQL-specific states

**Special Handling**: Query and mutation names from GraphQL documents

### 10. RTK Query

**Hooks**: Generated hooks like `useGetUserQuery`, `useUpdateUserMutation`

**DFD Mapping**:
- `data` → External Entity Input (API response)
- `isLoading`, `isFetching`, `isError` → Data Store (request states)
- Mutation trigger function → Process (API mutation)

**Key Pattern**: Generated hook names follow pattern `use{Endpoint}{Query|Mutation}`

**Special Handling**: Hook names are generated from API endpoint definitions, requires pattern matching

### 11. tRPC

**Hooks**: `trpc.{procedure}.useQuery`, `trpc.{procedure}.useMutation`

**DFD Mapping**:
- `data` → External Entity Input (procedure response)
- `isLoading`, `isError` → Data Store (request states)
- `mutate`, `mutateAsync` → Process (procedure mutation)

**Key Pattern**: Nested property access on tRPC client object

**Special Handling**: Procedure paths can be deeply nested (e.g., `trpc.user.profile.get.useQuery`)

## Configuration and Customization

### User Configuration File

**Location**: `.kiro/library-adapters.json` (workspace-level)

Users can override or extend default adapters:

```json
{
  "extends": "default",
  "overrides": {
    "swr": {
      "hooks": [
        {
          "hookName": "useSWR",
          "returnPattern": {
            "type": "object",
            "mappings": [
              {
                "propertyName": "data",
                "dfdElementType": "data-store"
              }
            ]
          }
        }
      ]
    }
  },
  "custom": [
    {
      "libraryName": "my-custom-library",
      "packagePatterns": ["@myorg/custom-lib"],
      "hooks": []
    }
  ],
  "disabled": ["mobx"]
}
```


### Configuration Loading

1. Load default adapters from `packages/analyzer/src/config/library-adapters.json`
2. Check for workspace configuration at `.kiro/library-adapters.json`
3. Merge configurations with user overrides taking precedence
4. Validate merged configuration
5. Register adapters with Hook Registry

## Performance Considerations

### Import Detection Optimization
- Cache import analysis results per file
- Only re-analyze when file changes
- Lazy-load library adapters (only load when library is detected)

### Adapter Lookup Optimization
- Use Map for O(1) adapter lookup by library name + hook name
- Pre-filter active adapters based on detected imports
- Cache adapter application results for repeated hook calls

### Memory Management
- Unload inactive library adapters after analysis
- Clear import cache for files no longer in workspace
- Limit adapter configuration size (validate at load time)

## Migration Strategy

### Backward Compatibility

1. **Existing Hook Registry**: Keep category-based classification as fallback
2. **Existing Tests**: All existing tests should pass without modification
3. **Existing DFD Output**: Components without third-party libraries should produce identical output

### Gradual Rollout

1. **Phase 1**: Implement core infrastructure (Import Detector, Library Adapter system)
2. **Phase 2**: Add adapters for data fetching libraries (SWR, TanStack Query, Apollo, RTK Query, tRPC)
3. **Phase 3**: Add adapters for state management libraries (Zustand, Jotai, MobX)
4. **Phase 4**: Add adapters for routing and form libraries (React Router, Next.js, React Hook Form)
5. **Phase 5**: Documentation and user configuration support


## Documentation Requirements

### Developer Documentation

**File**: `docs/third-party-library-support.md`

Content:
- Overview of supported libraries
- How library detection works
- How to add support for new libraries
- Adapter configuration format
- Examples for each supported library

### User Documentation

**File**: `README.md` (update)

Content:
- List of supported third-party libraries
- Visual examples of DFD output for popular libraries
- Link to detailed documentation

### API Documentation

**Files**: JSDoc comments in source code

Content:
- Interface documentation for all new types
- Method documentation with examples
- Configuration schema documentation

## Security Considerations

### Configuration Validation

- Validate adapter JSON schema before loading
- Sanitize user-provided adapter configurations
- Limit adapter configuration file size (max 1MB)
- Reject adapters with suspicious patterns (e.g., code execution)

### Import Detection Safety

- Only analyze import statements, never execute code
- Handle malformed import syntax gracefully
- Limit number of imports processed per file (max 1000)

### Error Information Disclosure

- Don't expose file system paths in error messages
- Sanitize library names in logs
- Limit error message length

## Future Enhancements

### Potential Additions

1. **More Libraries**: Recoil, XState, React Query DevTools
2. **Framework-Specific**: Vue Composition API, Svelte stores
3. **Custom Hook Analysis**: Automatically infer patterns from custom hooks
4. **Type-Based Detection**: Use TypeScript types to improve accuracy
5. **Visual Customization**: Allow users to customize node colors/shapes per library
6. **Performance Metrics**: Track and display hook performance characteristics
7. **Dependency Graph**: Show relationships between library hooks

### Extensibility Points

- Plugin system for third-party adapter contributions
- Adapter marketplace or registry
- Community-contributed adapters
- Adapter testing framework for contributors
