# Library Adapter Configuration Fix

## Problem

The useSWR hook variables (`data`, `error`, `isLoading`, `mutate`) were not being consolidated into a single node. Instead, they appeared as 4 separate nodes in the DFD visualization.

### Root Cause

The library adapter configuration file (`library-adapters.json`) was not being loaded correctly because:

1. **File not copied during build**: The JSON configuration file in `packages/analyzer/src/config/library-adapters.json` was not being copied to the `dist/` folder during TypeScript compilation
2. **Runtime path resolution failed**: The code used `__dirname` to locate the JSON file, which doesn't work correctly when bundled by esbuild
3. **Missing file error**: The extension tried to load from a non-existent path, causing the adapter registry to remain empty

## Solution

### 1. Import JSON Directly (Primary Fix)

Changed `packages/analyzer/src/utils/library-adapters.ts` to import the JSON configuration directly as a module:

```typescript
// Import the default configuration directly
import defaultAdaptersConfig from '../config/library-adapters.json' assert { type: 'json' };

export function loadDefaultLibraryAdapters(): LibraryAdapterConfig {
  // Validate the imported configuration
  validateLibraryAdapterConfig(defaultAdaptersConfig);
  return defaultAdaptersConfig as LibraryAdapterConfig;
}
```

### 2. Enable JSON Module Resolution

Updated `packages/analyzer/tsconfig.json` to enable JSON imports:

```json
{
  "compilerOptions": {
    ...
    "resolveJsonModule": true
  }
}
```

### 3. Add Build Script for JSON Copying (Backup)

Updated `packages/analyzer/package.json` to copy the JSON file during build:

```json
{
  "scripts": {
    "build": "tsc && npm run copy:config",
    "copy:config": "mkdir -p dist/config && cp src/config/library-adapters.json dist/config/"
  }
}
```

### 4. Fix ESM Imports

Updated `packages/analyzer/src/index.ts` to use `.js` extensions for ESM compatibility:

```typescript
export * from './parser/types.js';
export * from './parser/ast-parser.js';
// ... etc
```

## Benefits

1. **Bundler-friendly**: The JSON is now bundled directly into the JavaScript, eliminating runtime file system dependencies
2. **No path resolution issues**: No need to use `__dirname` or `path.join()` to locate the configuration
3. **Type-safe**: TypeScript validates the JSON structure at compile time
4. **Smaller distribution**: No need to distribute separate JSON files

## Testing

After applying these fixes:

1. Rebuild the analyzer package: `cd packages/analyzer && npm run build`
2. Rebuild the extension: `cd packages/extension && npm run compile`
3. Reload the VS Code extension
4. Open `examples/react-vite/src/components/101-SWR-BasicFetch.tsx`
5. Run "Show Component Structure Preview"

Expected result: useSWR should now appear as a single consolidated node with properties `data`, `error`, `isLoading`, and `mutate`, instead of 4 separate nodes.

## Files Modified

- `packages/analyzer/src/utils/library-adapters.ts` - Import JSON directly
- `packages/analyzer/tsconfig.json` - Enable `resolveJsonModule`
- `packages/analyzer/package.json` - Add `copy:config` script
- `packages/analyzer/src/index.ts` - Add `.js` extensions to imports

## Related

- Issue: useSWR variables not consolidated
- Test file: `packages/extension/src/test/library-hook-consolidation.test.ts`
- Configuration: `packages/analyzer/src/config/library-adapters.json`
