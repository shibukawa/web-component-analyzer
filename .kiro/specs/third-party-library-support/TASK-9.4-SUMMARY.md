# Task 9.4: Consolidate useSWR Return Values into Single Node

## Summary

Successfully implemented consolidation of useSWR and useSWRMutation return values into a single node, following the same pattern as useReducer state properties.

## Changes Made

### 1. Modified `buildNodesFromLibraryHook` Method
**File**: `packages/analyzer/src/parser/dfd-builder.ts`

- Added special handling for `useSWR` and `useSWRMutation` hooks
- Separates properties into two categories:
  - **Data properties**: `data`, `error`, `isLoading`, `isMutating`, `isValidating`
  - **Process properties**: `mutate`, `trigger`
- Creates a single consolidated node with:
  - Label: `useSWR<resource>` or `useSWRMutation<resource>`
  - Type: `data-store`
  - Metadata includes:
    - `isLibraryHook: true`
    - `properties`: Array of all property names
    - `dataProperties`: Array of data/state properties
    - `processProperties`: Array of process/function properties
    - `propertyMetadata`: Metadata for each property

### 2. Updated `findNodeByVariable` Method
**File**: `packages/analyzer/src/parser/dfd-builder.ts`

- Added check for library hook properties
- When a variable matches a property in a library hook node, returns the consolidated node
- Follows the same pattern as useReducer state properties

### 3. Enhanced Edge Creation Logic
**File**: `packages/analyzer/src/parser/dfd-builder.ts`

Updated three edge creation methods to add property names to edge labels:

#### a. `buildAttributeReferenceEdges`
- For library hooks, adds property name to "binds" label
- Example: `binds: data`, `binds: error`, `binds: isLoading`

#### b. `buildDisplayEdges`
- For conditional subgraphs, adds property name to "control visibility" label
- For display edges, adds property name to "display" label
- Examples: `control visibility: error`, `display: data`

#### c. `buildProcessToDataStoreEdges`
- For library hooks, adds matched property names to "reads" label
- Example: `reads: data, error`

#### d. `buildProcessToDataStoreWriteEdges`
- For library hooks, adds matched process property names to "calls" label
- Example: `calls: mutate`, `calls: trigger`

## Pattern Comparison: useReducer vs useSWR

### useReducer Pattern
```typescript
const [state, dispatch] = useReducer(counterReducer, initialState);
// Creates single node: "counterReducer"
// - stateProperties: ['count', 'lastUpdated']
// - readVariable: 'state'
// - writeVariable: 'dispatch'
// Edges: "display: count", "dispatch"
```

### useSWR Pattern (After Implementation)
```typescript
const { data, error, isLoading, mutate } = useSWR('/api/user', fetcher);
// Creates single node: "useSWR<resource>"
// - properties: ['data', 'error', 'isLoading', 'mutate']
// - dataProperties: ['data', 'error', 'isLoading']
// - processProperties: ['mutate']
// Edges: "display: data", "control visibility: error", "calls: mutate"
```

## Benefits

1. **Cleaner DFD**: Single node instead of 4 separate nodes for useSWR
2. **Better Semantics**: Clearly shows that all properties come from the same hook call
3. **Consistent Pattern**: Follows the established useReducer pattern
4. **Labeled Edges**: Property names in edge labels make data flow explicit

## Testing

Created comprehensive test suite in `packages/extension/src/test/library-hook-consolidation.test.ts`:
- Tests useSWR consolidation
- Tests useSWRMutation consolidation
- Tests edge labels include property names
- Verifies data vs process property separation

## Backward Compatibility

- Other library hooks (TanStack Query, React Router, etc.) continue to use individual nodes
- Only useSWR and useSWRMutation are consolidated
- Existing tests and functionality remain unchanged

## Next Steps

The following tasks can now be implemented:
- Task 9.5: Support early return conditional JSX patterns
- Task 9.6: Add external API endpoint nodes for data fetching hooks
- Tasks 10-19: Add support for other libraries (TanStack Query, React Router, etc.)
