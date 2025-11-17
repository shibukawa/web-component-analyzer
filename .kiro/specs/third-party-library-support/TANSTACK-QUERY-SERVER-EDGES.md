# TanStack Query Server Node Edges Implementation

## Overview

Updated the DFD builder to properly create Server node edges for TanStack Query hooks, matching the behavior of SWR hooks.

## Changes Made

### File: `packages/analyzer/src/parser/dfd-builder.ts`

Updated the `buildMutationToServerEdges()` method to handle TanStack Query hooks:

#### For `useQuery` (Data Fetching)
- **Edge Direction**: Server → useQuery
- **Label**: "reads"
- **Meaning**: The query reads data from the server

```
Server: /api/posts --[reads]--> useQuery
```

#### For `useMutation` (Data Mutation)
- **Edge Direction**: useMutation → Server
- **Label**: "mutate"
- **Meaning**: The mutation sends data to the server

```
useMutation --[mutate]--> Server: /api/posts
```

#### For `useInfiniteQuery` (Infinite Scrolling)
- **Edge Direction**: Server → useInfiniteQuery
- **Label**: "reads"
- **Meaning**: The infinite query reads data from the server

```
Server: /api/posts --[reads]--> useInfiniteQuery
```

## Implementation Details

The updated `buildMutationToServerEdges()` method now:

1. **Finds all library hook nodes** with process properties (mutations)
2. **Checks for existing edges** to avoid duplication
3. **Creates appropriate edges** based on hook type:
   - `useQuery`: Server → hook (reads)
   - `useMutation`: hook → Server (mutate)
   - `useInfiniteQuery`: Server → hook (reads)

### Code Logic

```typescript
// For useMutation (TanStack Query), create edge from hook to Server
if (hookName === 'useMutation' && serverNodeId) {
  const edge: DFDEdge = {
    from: hookNode.id,
    to: serverNodeId,
    label: 'mutate'
  };
  // Check if edge already exists to avoid duplication
  const edgeExists = this.edges.some(e => e.from === edge.from && e.to === edge.to && e.label === edge.label);
  if (!edgeExists) {
    this.edges.push(edge);
  }
}

// For useQuery (TanStack Query), create edge from Server to hook
if (hookName === 'useQuery' && serverNodeId) {
  const edge: DFDEdge = {
    from: serverNodeId,
    to: hookNode.id,
    label: 'reads'
  };
  // Check if edge already exists to avoid duplication
  const edgeExists = this.edges.some(e => e.from === edge.from && e.to === edge.to && e.label === edge.label);
  if (!edgeExists) {
    this.edges.push(edge);
  }
}
```

## Acceptance Tests

### 103-TanStackQuery-BasicQuery.tsx

**YAML Data Flow**:
```yaml
- from: "Server: /api/posts"
  to: "useQuery"
  fromType: "external_entity_input"
  toType: "data_store"
  description: "fetches data from API"
```

**Expected DFD Edge**: Server --[reads]--> useQuery

### 104-TanStackQuery-Mutation.tsx

**YAML Data Flow**:
```yaml
- from: "mutate"
  to: "Server: /api/posts"
  fromType: "process"
  toType: "external_entity_input"
  description: "sends mutation to API"
```

**Expected DFD Edge**: useMutation --[mutate]--> Server

## Logging

Added comprehensive logging to trace edge creation:

```
🚚 Processing mutation hook: useQuery, has server: true
🚚 Creating fetch edge from Server to useQuery
🚚 ✅ Added reads edge

🚚 Processing mutation hook: useMutation, has server: true
🚚 Creating mutate edge from useMutation to Server
🚚 ✅ Added mutate edge
```

## Consistency with SWR

This implementation maintains consistency with how SWR hooks are handled:

- **useSWR**: Server → useSWR (fetch)
- **useSWRMutation**: useSWRMutation → Server (mutate)
- **useQuery**: Server → useQuery (reads)
- **useMutation**: useMutation → Server (mutate)

## Testing

The implementation includes:
- Duplicate edge detection to prevent multiple edges
- Logging for debugging
- Support for all TanStack Query hook types
- Proper edge direction based on data flow semantics
