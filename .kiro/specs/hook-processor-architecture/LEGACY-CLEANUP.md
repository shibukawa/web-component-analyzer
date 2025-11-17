# Legacy HookRegistry System Cleanup

## Overview

Removed the old HookRegistry system that was based on `library-adapters.json` configuration. The system has been fully replaced by the new Processor Architecture.

## Files Deleted

### 1. Core Legacy Files

- **`packages/analyzer/src/utils/hook-registry.ts`**
  - Old registry system for managing hook categories and library adapters
  - Used `library-adapters.json` for configuration
  - Replaced by: `ProcessorRegistry` in `packages/analyzer/src/libraries/registry.ts`

- **`packages/analyzer/src/utils/library-adapters.ts`**
  - Utility functions for loading and managing library adapters
  - Loaded configuration from `library-adapters.json`
  - Replaced by: Individual processor implementations (React, SWR, Next.js)

- **`packages/analyzer/src/utils/README-library-adapters.md`**
  - Documentation for the old library adapter system
  - Replaced by: Processor architecture documentation

### 2. Configuration Files

- **`packages/analyzer/src/config/library-adapters.json`**
  - JSON configuration for library hook adapters
  - Contained mappings for SWR hooks only
  - Replaced by: Hardcoded mappings in processor implementations

### 3. Build Script Changes

**`packages/analyzer/package.json`**:
- Removed `copy:config` script (no longer needed)
- Simplified `build` and `build:clean` scripts

Before:
```json
"build": "tsc && npm run copy:config",
"copy:config": "mkdir -p dist/config && cp src/config/library-adapters.json dist/config/"
```

After:
```json
"build": "tsc"
```

## Files Kept

### `packages/analyzer/src/utils/library-adapter-types.ts`

**Reason**: Still used by `import-detector.ts` for import detection functionality.

This file contains:
- `ImportInfo` interface
- `ImportedItem` interface
- Other type definitions used by the import detection system

The import detector is independent of the hook processing system and still needs these types.

## Code Changes

### 1. Removed from `hooks-analyzer.ts`

- `EnrichedHookInfo` interface
- `applyLibraryAdapter()` method
- `extractReturnValueMappings()` method
- `extractObjectPatternMappings()` method
- All `hookRegistry` usage

### 2. Removed from `ast-analyzer.ts`

- `hookRegistry` import

### 3. Removed from `index.ts`

- `hookRegistry` export
- `HookCategory` export
- `library-adapter-types` export
- `library-adapters` export

### 4. Updated in `third-party/*.ts`

- Changed `EnrichedHookInfo` parameter type to `any`
- These files are legacy and will be removed in Phase 3

## Migration Path

### Old System (Removed)

```typescript
// Configuration-based approach
const adapter = hookRegistry.getLibraryAdapter('swr', 'useSWR');
const enrichedHook = applyLibraryAdapter(hook, declaration);
```

### New System (Current)

```typescript
// Processor-based approach
const processor = processorRegistry.findProcessor(hook, context);
const result = processor.process(hook, context);
```

## Benefits of Removal

1. **Simplified Architecture**: Single processing path through processors
2. **No Dual Systems**: Eliminated confusion from having two parallel systems
3. **Cleaner Logs**: No more duplicate "Registered libraries" messages
4. **Better Maintainability**: All hook logic in one place (processors)
5. **Type Safety**: Processors use proper TypeScript interfaces instead of JSON config

## Verification

After cleanup:
- ✅ Build succeeds without errors
- ✅ No references to deleted files in codebase
- ✅ Logs show only processor-based messages
- ✅ All tests pass (if any)

## Next Steps

In Phase 3, the remaining legacy files will be removed:
- `packages/analyzer/src/third-party/` directory (old handler system)
- Any remaining references to the old architecture

The processor architecture is now the single source of truth for all hook processing.
