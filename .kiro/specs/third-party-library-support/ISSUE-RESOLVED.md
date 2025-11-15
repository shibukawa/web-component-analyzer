# Issue Resolved: Library Adapters Not Loading

## Problem

SWR nodes were being split into individual nodes (data, error, isLoading, mutate) instead of being consolidated into a single `useSWR<resource>` node, and no Server node was being created for the API endpoint.

## Root Cause

The library adapters from `library-adapters.json` were not being loaded and registered with the hook registry during initialization.

**Evidence from logs:**
```
📚 HookRegistry.getLibraryAdapter: swr / useSWR
📚   ⚠️ No hook map found for library: swr
📚   Available libraries: []
```

The `Available libraries: []` indicated that no adapters were registered.

## Solution

Added initialization code to `hook-registry.ts` to automatically load and register default library adapters when the singleton instance is created.

### Code Changes

**File**: `packages/analyzer/src/utils/hook-registry.ts`

**Before:**
```typescript
// Export singleton instance
export const hookRegistry: HookRegistry = new HookRegistryImpl();
```

**After:**
```typescript
// Export singleton instance
export const hookRegistry: HookRegistry = new HookRegistryImpl();

// Load default library adapters on initialization
import { loadDefaultLibraryAdapters } from './library-adapters';

try {
  console.log('📚 HookRegistry: Loading default library adapters...');
  const config = loadDefaultLibraryAdapters();
  console.log(`📚 HookRegistry: Loaded ${config.libraries.length} library adapters`);
  
  for (const adapter of config.libraries) {
    console.log(`📚 HookRegistry: Registering adapter for ${adapter.libraryName}`);
    hookRegistry.registerLibraryAdapter(adapter);
  }
  
  console.log('📚 HookRegistry: ✅ All adapters registered successfully');
} catch (error) {
  console.error('📚 HookRegistry: ❌ Failed to load default adapters:', error);
}
```

## Expected Behavior After Fix

When analyzing a component with `useSWR`, the following should occur:

1. **Library Detection**: SWR library is detected from imports
2. **Adapter Lookup**: Adapter for `useSWR` is found in hook registry
3. **Node Consolidation**: All return values (data, error, isLoading, mutate) are consolidated into a single `useSWR<resource>` node
4. **Server Node Creation**: A `Server: /api/user` external entity input node is created
5. **Edge Creation**: An edge labeled "fetches" connects the Server node to the useSWR node

## Verification

After rebuilding and reloading the extension, the logs should show:

```
📚 HookRegistry: Loading default library adapters...
📚 HookRegistry: Loaded 1 library adapters
📚 HookRegistry: Registering adapter for swr
📚 AdapterRegistry: Registering adapter for swr
📚   Package patterns: ['swr', 'swr/mutation']
📚   Hooks: ['useSWR', 'useSWRMutation', 'useSWRInfinite']
📚   ✅ Adapter registered for swr
📚 HookRegistry: ✅ All adapters registered successfully

... (during analysis) ...

📚 HookRegistry.getLibraryAdapter: swr / useSWR
📚   ✅ Found adapter for useSWR
🪝   ✅ Applied library adapter for useSWR
🚚 ✅ Created consolidated useSWR node
🚚 ✅ Created Server node: /api/user
🚚 ✅ Created edge from Server to useSWR
```

## Impact

This fix ensures that:
- All third-party library hooks are properly recognized and consolidated
- API endpoints are visualized as Server nodes
- The DFD accurately represents the data flow from external APIs through library hooks to the UI

## Related Files

- `packages/analyzer/src/utils/hook-registry.ts` - Added initialization code
- `packages/analyzer/src/utils/library-adapters.ts` - Provides loading functions
- `packages/analyzer/src/config/library-adapters.json` - Contains adapter definitions
