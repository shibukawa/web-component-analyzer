# Task 9.6 Implementation Summary: External API Endpoint Nodes

## Overview
Implemented automatic detection and visualization of API endpoints for data fetching hooks (useSWR, useQuery, useMutation, etc.) by creating "Server" external entity input nodes.

## Changes Made

### 1. Extended HookInfo Type (`packages/analyzer/src/parser/types.ts`)
- Added `arguments` field to `HookInfo` interface to store hook call arguments
- Format: `Array<{ type: string; value?: string | number | boolean }>`
- Enables extraction of API endpoints, query keys, and other literal arguments

### 2. Enhanced Hooks Analyzer (`packages/analyzer/src/analyzers/hooks-analyzer.ts`)
- Added `extractHookArguments()` method to extract literal values from hook call arguments
- Supports string literals, numeric literals, boolean literals, and simple template literals
- Extracts arguments during hook analysis and stores them in `HookInfo.arguments`
- Arguments are now available for all hooks, not just data fetching hooks

### 3. Enhanced DFD Builder (`packages/analyzer/src/parser/dfd-builder.ts`)

#### New Helper Methods:
- `isDataFetchingHook(hookName)`: Identifies data fetching hooks
  - Recognizes: useSWR, useSWRMutation, useQuery, useMutation, useSubscription, etc.
  - Also detects RTK Query generated hooks (use*Query, use*Mutation patterns)
  
- `extractAPIEndpoint(args)`: Extracts API endpoint from hook arguments
  - Returns the first string argument (typically the API endpoint or query key)
  
- `createServerNode(endpoint, line, column)`: Creates Server external entity input node
  - Label format: `"Server: {endpoint}"` (e.g., "Server: /api/user")
  - Type: `external-entity-input`
  - Metadata includes: category='server', endpoint, line, column

#### Updated Library Hook Processing:
- In `buildNodesFromLibraryHook()`:
  - Checks if hook is a data fetching hook
  - Extracts API endpoint from hook arguments
  - Creates Server node if endpoint is found
  - Stores `serverNodeId` in library hook node metadata
  - Creates edge from Server node to library hook node with label "fetches"

### 4. Updated Test Suite (`packages/extension/src/test/library-hook-consolidation.test.ts`)
- Added test: "useSWR should create Server node for API endpoint"
  - Verifies Server node creation with correct label and type
  - Verifies Server node has endpoint metadata
  - Verifies useSWR node references Server node
  - Verifies edge from Server to useSWR with "fetches" label
  
- Added test: "useSWRMutation should create Server node for API endpoint"
  - Same verifications for useSWRMutation

### 5. Updated Acceptance Tests
- Updated `101-SWR-BasicFetch.tsx`:
  - Added Server node to external_entities_input
  - Added data flow from Server to useSWR
  
- Updated `102-SWR-Mutation.tsx`:
  - Added Server node to external_entities_input
  - Added data flow from Server to useSWRMutation

## Data Flow Pattern

```
┌─────────────────────┐
│ Server: /api/user   │ (external-entity-input)
│ (API Endpoint)      │
└──────────┬──────────┘
           │ fetches
           ▼
┌─────────────────────┐
│ useSWR<resource>    │ (data-store)
│ - data              │
│ - error             │
│ - isLoading         │
│ - mutate            │
└─────────────────────┘
```

## Supported Libraries

The implementation automatically detects API endpoints for:

### Currently Implemented:
- **SWR**: useSWR, useSWRMutation, useSWRInfinite

### Ready for Future Implementation:
- **TanStack Query**: useQuery, useMutation, useInfiniteQuery, useLazyQuery
- **Apollo Client**: useQuery, useMutation, useSubscription
- **RTK Query**: use*Query, use*Mutation (generated hooks)
- **tRPC**: trpc.*.useQuery, trpc.*.useMutation

## Example Usage

### Input Code:
```typescript
import useSWR from 'swr';

function MyComponent() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher);
  
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return <div><p>{data.name}</p></div>;
}
```

### Generated DFD Nodes:
1. **Server Node**:
   - ID: `server_0`
   - Label: `"Server: /api/user"`
   - Type: `external-entity-input`
   - Metadata: `{ category: 'server', endpoint: '/api/user' }`

2. **useSWR Node**:
   - ID: `library_hook_1`
   - Label: `"useSWR<resource>"`
   - Type: `data-store`
   - Metadata: `{ ..., serverNodeId: 'server_0' }`

3. **Edge**:
   - From: `server_0`
   - To: `library_hook_1`
   - Label: `"fetches"`

## Benefits

1. **Clear Data Source Visualization**: Developers can immediately see where data is coming from
2. **API Endpoint Documentation**: DFDs now document which API endpoints are used
3. **Data Flow Clarity**: Shows the complete flow from external API to component state
4. **Extensible Pattern**: Easy to extend to other data fetching libraries
5. **Automatic Detection**: No manual configuration required

## Testing

- ✅ Compilation successful (TypeScript)
- ✅ New test cases added for Server node creation
- ✅ Acceptance tests updated with Server node expectations
- ✅ Backward compatible (existing tests still pass)

## Future Enhancements

1. **GraphQL Query Names**: Extract query/mutation names from Apollo Client
2. **tRPC Procedure Paths**: Extract full procedure paths (e.g., "user.getById")
3. **Query Parameters**: Extract and display query parameters from endpoints
4. **HTTP Methods**: Distinguish between GET, POST, PUT, DELETE operations
5. **Multiple Endpoints**: Handle hooks that fetch from multiple endpoints
6. **Dynamic Endpoints**: Handle template literals with variables

## Requirements Satisfied

✅ Requirement 1 (SWR): Extract API endpoint from useSWR key parameter
✅ Create external entity input node labeled "Server: {endpoint}"
✅ Add data flow from Server node to useSWR node
✅ Pattern ready for other data fetching libraries (TanStack Query, Apollo, RTK Query, tRPC)
