# Type Extractor Scripts

This directory contains build-time scripts for extracting and bundling TypeScript type definitions from npm packages for use in Monaco Editor.

## Overview

The type extractor system enables the web application to provide accurate TypeScript IntelliSense and type checking for popular frontend libraries (React, SWR, etc.) without fetching types from CDNs at runtime. Type definitions are extracted from npm packages during the build process and bundled into the application.

## Scripts

### extract-types.ts

The main type extraction script that:
1. Reads configuration from `type-config.json`
2. Locates type definition packages in `node_modules`
3. Extracts and concatenates `.d.ts` files
4. Resolves dependencies between libraries
5. Generates a bundled TypeScript file with all type definitions

**Usage:**

```bash
# Run with default options
npm exec tsx scripts/extract-types.ts

# Specify custom config path
npm exec tsx scripts/extract-types.ts --config path/to/config.json

# Specify custom output path
npm exec tsx scripts/extract-types.ts --output path/to/output.ts

# Enable verbose logging
npm exec tsx scripts/extract-types.ts --verbose

# Show help
npm exec tsx scripts/extract-types.ts --help
```

**Default Paths:**
- Config: `src/config/type-config.json`
- Output: `src/config/type-definitions.ts`

**Integration:**

The script is automatically run during the build process:
- `npm run dev` - Extracts types before starting Vite dev server
- `npm run build` - Extracts types before building for production
- `npm run extract-types` - Manually extract types

## Configuration

### type-config.json

The configuration file defines which libraries should have type definitions available in Monaco Editor.

**Location:** `src/config/type-config.json`

**Schema:**

```typescript
interface TypeConfig {
  libraries: LibraryConfig[];
}

interface LibraryConfig {
  // Library name (e.g., "react", "swr")
  name: string;
  
  // Package name in node_modules (e.g., "@types/react", "swr")
  packageName: string;
  
  // Entry point file relative to package root (e.g., "index.d.ts")
  entryPoint: string;
  
  // Virtual file path in Monaco (e.g., "file:///node_modules/@types/react/index.d.ts")
  virtualPath: string;
  
  // Whether to include this library in the bundle
  enabled: boolean;
  
  // Optional: Additional .d.ts files to include
  additionalFiles?: string[];
  
  // Optional: Dependencies that should be loaded first
  dependencies?: string[];
}
```

**Example Configuration:**

```json
{
  "libraries": [
    {
      "name": "react",
      "packageName": "@types/react",
      "entryPoint": "index.d.ts",
      "virtualPath": "file:///node_modules/@types/react/index.d.ts",
      "enabled": true,
      "additionalFiles": [
        "global.d.ts",
        "jsx-runtime.d.ts"
      ],
      "dependencies": []
    },
    {
      "name": "swr",
      "packageName": "swr",
      "entryPoint": "dist/index/index.d.ts",
      "virtualPath": "file:///node_modules/swr/dist/index/index.d.ts",
      "enabled": true,
      "dependencies": ["react"]
    }
  ]
}
```

### Configuration Fields

#### name
**Type:** `string`  
**Required:** Yes

Unique identifier for the library. Used for dependency resolution and logging.

**Example:** `"react"`, `"swr"`, `"vue"`

#### packageName
**Type:** `string`  
**Required:** Yes

The npm package name as it appears in `node_modules`. Can be a scoped package.

**Examples:**
- `"@types/react"` - For DefinitelyTyped packages
- `"swr"` - For packages that include their own types
- `"@vue/runtime-core"` - For scoped packages

#### entryPoint
**Type:** `string`  
**Required:** Yes

Path to the main `.d.ts` file relative to the package root. This is typically `index.d.ts` but may vary.

**Examples:**
- `"index.d.ts"` - Standard entry point
- `"dist/index.d.ts"` - For packages with build output
- `"types/index.d.ts"` - For packages with separate types directory

**Tip:** Check the package's `package.json` for the `types` or `typings` field to find the correct entry point.

#### virtualPath
**Type:** `string`  
**Required:** Yes

The virtual file path that Monaco Editor will use to reference this type definition. Must follow the format `file:///node_modules/{packageName}/{entryPoint}`.

**Format:** `file:///node_modules/{packageName}/{entryPoint}`

**Examples:**
- `"file:///node_modules/@types/react/index.d.ts"`
- `"file:///node_modules/swr/dist/index/index.d.ts"`

**Important:** The virtual path must match the import path that users will write in the editor. For example, `import React from 'react'` expects types at `file:///node_modules/@types/react/index.d.ts`.

#### enabled
**Type:** `boolean`  
**Required:** Yes

Whether to include this library in the type bundle. Set to `false` to temporarily disable a library without removing its configuration.

**Use Cases:**
- Disable large libraries to reduce bundle size during development
- Conditionally include libraries based on build environment
- Keep configuration for libraries that may be enabled later

#### additionalFiles
**Type:** `string[]`  
**Optional**

Additional `.d.ts` files to include from the package. Paths are relative to the package root.

**Use Cases:**
- Include global type declarations (e.g., `global.d.ts`)
- Include JSX runtime types (e.g., `jsx-runtime.d.ts`)
- Include module augmentations

**Example:**
```json
"additionalFiles": [
  "global.d.ts",
  "jsx-runtime.d.ts",
  "jsx-dev-runtime.d.ts"
]
```

**Note:** Files are concatenated in the order specified. If a file doesn't exist, a warning is logged but extraction continues.

#### dependencies
**Type:** `string[]`  
**Optional**

List of library names (matching the `name` field) that this library depends on. Dependencies are loaded before dependents.

**Use Cases:**
- Ensure React is loaded before React-based libraries (SWR, React Query, etc.)
- Ensure core libraries are loaded before plugins
- Resolve type dependencies between libraries

**Example:**
```json
{
  "name": "swr",
  "dependencies": ["react"]
}
```

**Dependency Resolution:**
- The extractor performs topological sort to determine load order
- Circular dependencies are detected and cause an error
- Missing dependencies cause a warning but don't fail the build

## Adding a New Library

Follow these steps to add type definitions for a new library:

### Step 1: Install the Type Package

Install the library's type definitions (if not already installed):

```bash
# For DefinitelyTyped packages
npm install -D @types/library-name

# For packages with built-in types
npm install library-name
```

### Step 2: Find the Entry Point

Check the package's `package.json` to find the types entry point:

```bash
# View package.json
cat node_modules/library-name/package.json | grep -E '"types"|"typings"'
```

Or manually inspect:
```bash
ls node_modules/library-name/*.d.ts
ls node_modules/library-name/dist/*.d.ts
```

### Step 3: Add Configuration

Edit `src/config/type-config.json` and add a new library entry:

```json
{
  "libraries": [
    // ... existing libraries ...
    {
      "name": "library-name",
      "packageName": "@types/library-name",
      "entryPoint": "index.d.ts",
      "virtualPath": "file:///node_modules/@types/library-name/index.d.ts",
      "enabled": true,
      "dependencies": []
    }
  ]
}
```

### Step 4: Extract and Test

Run the extractor and test in the editor:

```bash
# Extract types
npm run extract-types

# Start dev server
npm run dev
```

In the Monaco Editor, test the import:
```typescript
import { Something } from 'library-name';
```

Verify that:
- No type errors appear
- IntelliSense shows library types
- Hover tooltips display type information

### Step 5: Handle Dependencies

If the library depends on other libraries (e.g., React), add them to the `dependencies` array:

```json
{
  "name": "react-query",
  "packageName": "@types/react-query",
  "entryPoint": "index.d.ts",
  "virtualPath": "file:///node_modules/@types/react-query/index.d.ts",
  "enabled": true,
  "dependencies": ["react"]
}
```

## Examples

### Example 1: React (DefinitelyTyped)

```json
{
  "name": "react",
  "packageName": "@types/react",
  "entryPoint": "index.d.ts",
  "virtualPath": "file:///node_modules/@types/react/index.d.ts",
  "enabled": true,
  "additionalFiles": [
    "global.d.ts",
    "jsx-runtime.d.ts"
  ],
  "dependencies": []
}
```

**Notes:**
- Uses `@types/react` from DefinitelyTyped
- Includes additional files for global types and JSX runtime
- No dependencies (base library)

### Example 2: SWR (Built-in Types)

```json
{
  "name": "swr",
  "packageName": "swr",
  "entryPoint": "dist/index/index.d.ts",
  "virtualPath": "file:///node_modules/swr/dist/index/index.d.ts",
  "enabled": true,
  "dependencies": ["react"]
}
```

**Notes:**
- Uses built-in types from the `swr` package
- Entry point is in `dist/index/` subdirectory
- Depends on React (loaded first)

### Example 3: Vue (Scoped Package)

```json
{
  "name": "vue",
  "packageName": "@vue/runtime-core",
  "entryPoint": "dist/runtime-core.d.ts",
  "virtualPath": "file:///node_modules/@vue/runtime-core/dist/runtime-core.d.ts",
  "enabled": false,
  "dependencies": []
}
```

**Notes:**
- Uses scoped package `@vue/runtime-core`
- Currently disabled (`enabled: false`)
- Can be enabled when Vue support is needed

## Troubleshooting

### Package Not Found

**Error:** `Package not found: @types/library-name`

**Solutions:**
1. Verify the package is installed: `ls node_modules/@types/library-name`
2. Install the package: `npm install -D @types/library-name`
3. Check the `packageName` in configuration matches the actual package name

### Entry Point Not Found

**Error:** `Type definition file not found: /path/to/index.d.ts`

**Solutions:**
1. Check the package structure: `ls node_modules/library-name/`
2. Find the correct entry point: `cat node_modules/library-name/package.json | grep types`
3. Update the `entryPoint` field in configuration

### Circular Dependency

**Error:** `Circular dependency detected: react -> react-dom -> react`

**Solutions:**
1. Review the `dependencies` arrays in configuration
2. Remove unnecessary dependencies
3. If the circular dependency is real, consider loading libraries in alphabetical order

### Type Errors in Editor

**Problem:** Import shows type errors despite successful extraction

**Solutions:**
1. Verify the `virtualPath` matches the import path
2. Check Monaco's compiler options in `monaco-types.ts`
3. Ensure the library is actually registered: Check browser console for registration logs
4. Clear browser cache and reload

### Large Bundle Size

**Problem:** Generated `type-definitions.ts` is too large

**Solutions:**
1. Disable unused libraries: Set `enabled: false`
2. Remove unnecessary `additionalFiles`
3. Consider lazy-loading less common libraries
4. Use minification (remove comments and whitespace)

## Performance Considerations

### Bundle Size

Type definitions can be large:
- React: ~500KB
- Vue: ~300KB
- TypeScript lib: ~200KB

**Recommendations:**
- Only enable libraries that users will actually import
- Monitor the size of `type-definitions.ts`
- Consider lazy-loading for libraries used in <10% of components

### Extraction Time

The extraction process runs during build:
- Typical time: 1-3 seconds for 2-3 libraries
- Scales linearly with number of libraries
- Cached by Vite in development mode

**Optimization:**
- Use `--verbose` flag to identify slow libraries
- Disable unused libraries during development
- Consider caching extracted types in CI/CD

### Runtime Performance

Type registration happens during Monaco initialization:
- Typical time: 50-200ms for 2-3 libraries
- Scales linearly with type definition size
- Blocks editor initialization

**Optimization:**
- Register types asynchronously if possible
- Show loading indicator during registration
- Consider lazy registration on first import

## Advanced Usage

### Custom Output Format

Modify `extract-types.ts` to change the output format:

```typescript
// Add custom metadata
const header = `/**
 * Custom header
 * Build: ${process.env.BUILD_ID}
 */`;
```

### Filtering Type Content

Add custom filtering to reduce bundle size:

```typescript
function filterContent(content: string): string {
  // Remove comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove extra whitespace
  content = content.replace(/\n\s*\n/g, '\n');
  
  return content;
}
```

### Dynamic Configuration

Load configuration from environment variables:

```typescript
const config = {
  libraries: [
    {
      name: 'react',
      enabled: process.env.ENABLE_REACT === 'true',
      // ...
    }
  ]
};
```

## Related Files

- `src/config/type-config.json` - Configuration file
- `src/config/type-definitions.ts` - Generated output (auto-generated, do not edit)
- `src/types/type-config.ts` - TypeScript interfaces for configuration
- `src/utils/type-registry.ts` - Runtime type registration system
- `src/utils/monaco-types.ts` - Monaco Editor configuration

## Further Reading

- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)
