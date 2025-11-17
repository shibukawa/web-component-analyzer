# Task 6: SWR Processor - Configuration Fix

## Issue

The SWR processor was not being invoked because the library adapter configuration was failing to load due to a validation error.

## Root Cause

The `library-adapters.json` file contained Next.js hook configurations with an invalid `returnPattern.type: "absorb"`:

```json
{
  "hookName": "useRouter",
  "returnPattern": {
    "type": "absorb"  // ❌ Invalid - must be "object", "array", or "single"
  }
}
```

This caused the entire library adapter configuration to fail validation with the error:
```
AdapterValidationError: Hook useRouter has invalid returnPattern.type: absorb. 
Must be one of: object, array, single
```

## Impact

When the library adapter configuration fails to load:
1. The `HookRegistry` cannot populate `returnValueMappings` for any library hooks
2. Without `returnValueMappings`, the SWR processor's `shouldHandle()` method returns false
3. The system falls back to the old `buildNodesFromLibraryHook()` method
4. This creates individual nodes instead of consolidated library-hook nodes

## Log Evidence

From the extension logs:
```
📚 HookRegistry: ❌ Failed to load default adapters: AdapterValidationError: 
Hook useRouter has invalid returnPattern.type: absorb. Must be one of: object, array, single

🪝 applyLibraryAdapter: Checking 1 active libraries for useSWR
🪝   Checking library: swr
📚 HookRegistry.getLibraryAdapter: swr / useSWR
📚   ⚠️ No hook map found for library: swr
📚   Available libraries: []
🪝   ⚠️ No adapter found for useSWR in swr
```

Notice that "Available libraries: []" - the registry is empty because validation failed.

## Solution

Removed the invalid Next.js hook configurations from `library-adapters.json`. The Next.js hooks will be handled by a dedicated processor in Task 7 instead of using the JSON configuration.

### Changes Made

**File: `packages/analyzer/src/config/library-adapters.json`**

Removed the entire `next/navigation` library section containing:
- `useRouter`
- `usePathname`
- `useSearchParams`
- `useParams`

The file now only contains the SWR library configuration with valid return patterns.

## Verification

After the fix:
1. ✅ Library adapter configuration loads successfully
2. ✅ SWR hooks get `returnValueMappings` populated
3. ✅ SWR processor's `shouldHandle()` returns true
4. ✅ SWR processor creates consolidated library-hook nodes
5. ✅ Extension compiles without errors

## Next Steps

1. **Task 7**: Create Next.js library processor to handle Next.js hooks properly
   - The processor will handle `useRouter`, `usePathname`, `useSearchParams`, `useParams`
   - No JSON configuration needed - all logic in the processor

2. **Phase 4**: Remove the old library adapter system entirely
   - Once all processors are implemented, remove `library-adapters.json`
   - Remove `buildNodesFromLibraryHook()` fallback logic
   - Remove `HookRegistry` and library adapter utilities

## Lessons Learned

1. **Validation is critical**: Invalid configuration in one library can break all libraries
2. **Processor architecture is better**: Self-contained processors don't have cross-library dependencies
3. **Migration strategy**: Remove JSON configurations as processors are implemented
4. **Error handling**: Better error messages would have made this easier to diagnose

## Files Modified

- `packages/analyzer/src/config/library-adapters.json` - Removed Next.js section
- Rebuilt: `packages/analyzer` and `packages/extension`
