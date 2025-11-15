# Design Document

## Overview

This design introduces an extensible Type Registry system for managing TypeScript type definitions in the Monaco Editor within the web version of the component analyzer. The system will replace hardcoded type strings with actual type definitions extracted from npm packages at build time, making it easy to add support for new libraries like React, SWR, Vue, and others.

The solution consists of three main components:
1. **Type Registry** - Runtime system for loading and managing type definitions
2. **Type Extractor** - Build-time tool for extracting and bundling type definitions from npm packages
3. **Configuration System** - Declarative configuration for specifying which libraries to support

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Build Time                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  node_modules/@types/*  ──┐                                 │
│                            │                                 │
│  Type Extractor Script    │                                 │
│  (extract-types.ts)       │                                 │
│         │                  │                                 │
│         ├─ Read Config ────┘                                │
│         ├─ Extract DTS files                                │
│         ├─ Bundle & Minify                                  │
│         └─ Generate type-definitions.ts                     │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Runtime                                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  type-definitions.ts (bundled)                              │
│         │                                                    │
│         ▼                                                    │
│  Type Registry                                              │
│  (type-registry.ts)                                         │
│         │                                                    │
│         ├─ Load type definitions                            │
│         ├─ Register with Monaco                             │
│         └─ Provide IntelliSense                             │
│                    │                                         │
│                    ▼                                         │
│            Monaco Editor                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Diagram

```mermaid
graph TB
    Config[type-config.json]
    Extractor[Type Extractor Script]
    NPM[node_modules/@types/*]
    Bundle[type-definitions.ts]
    Registry[Type Registry]
    Monaco[Monaco Editor]
    
    Config -->|Configure| Extractor
    NPM -->|Read| Extractor
    Extractor -->|Generate| Bundle
    Bundle -->|Import| Registry
    Registry -->|Register| Monaco
```

## Components and Interfaces

### 1. Type Configuration (type-config.json)

A JSON configuration file that declares which libraries should have type definitions available in the editor.

**Location:** `packages/web/src/config/type-config.json`

**Schema:**
```typescript
interface TypeConfig {
  libraries: LibraryConfig[];
}

interface LibraryConfig {
  // Library name (e.g., "react", "swr")
  name: string;
  
  // Package name in node_modules (e.g., "@types/react")
  packageName: string;
  
  // Entry point file (e.g., "index.d.ts")
  entryPoint: string;
  
  // Virtual file path in Monaco (e.g., "file:///node_modules/@types/react/index.d.ts")
  virtualPath: string;
  
  // Whether to include this library (for conditional bundling)
  enabled: boolean;
  
  // Optional: Additional files to include
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
      ]
    },
    {
      "name": "swr",
      "packageName": "@types/swr",
      "entryPoint": "index.d.ts",
      "virtualPath": "file:///node_modules/@types/swr/index.d.ts",
      "enabled": true,
      "dependencies": ["react"]
    },
    {
      "name": "vue",
      "packageName": "@types/vue",
      "entryPoint": "index.d.ts",
      "virtualPath": "file:///node_modules/@types/vue/index.d.ts",
      "enabled": false
    }
  ]
}
```

### 2. Type Extractor Script (extract-types.ts)

A Node.js script that runs during the build process to extract type definitions from npm packages and generate a bundled TypeScript file.

**Location:** `packages/web/scripts/extract-types.ts`

**Interface:**
```typescript
interface TypeExtractor {
  // Load configuration
  loadConfig(): TypeConfig;
  
  // Extract type definitions for a single library
  extractLibrary(config: LibraryConfig): LibraryTypes;
  
  // Bundle all type definitions into a single file
  bundle(libraries: LibraryTypes[]): string;
  
  // Write the bundled file
  write(content: string, outputPath: string): void;
}

interface LibraryTypes {
  name: string;
  virtualPath: string;
  content: string;
  dependencies: string[];
}
```

**Key Responsibilities:**
- Read `type-config.json`
- Locate type definition files in `node_modules`
- Read and concatenate `.d.ts` files
- Resolve relative imports within type definitions
- Generate a TypeScript file with type definitions as string constants
- Handle dependencies and load order

**Output Format:**
```typescript
// Generated file: packages/web/src/config/type-definitions.ts

export interface TypeDefinition {
  name: string;
  virtualPath: string;
  content: string;
  dependencies: string[];
}

export const typeDefinitions: TypeDefinition[] = [
  {
    name: 'react',
    virtualPath: 'file:///node_modules/@types/react/index.d.ts',
    content: `/* React type definitions */\n...`,
    dependencies: []
  },
  {
    name: 'swr',
    virtualPath: 'file:///node_modules/@types/swr/index.d.ts',
    content: `/* SWR type definitions */\n...`,
    dependencies: ['react']
  }
];
```

### 3. Type Registry (type-registry.ts)

A runtime module that loads type definitions and registers them with Monaco Editor.

**Location:** `packages/web/src/utils/type-registry.ts`

**Interface:**
```typescript
interface TypeRegistry {
  // Initialize the registry and load all type definitions
  initialize(): void;
  
  // Register a single type definition with Monaco
  registerType(definition: TypeDefinition): void;
  
  // Register all type definitions
  registerAll(): void;
  
  // Check if a library is registered
  isRegistered(libraryName: string): boolean;
  
  // Get registered library names
  getRegisteredLibraries(): string[];
}

class MonacoTypeRegistry implements TypeRegistry {
  private registered: Set<string> = new Set();
  private definitions: TypeDefinition[];
  
  constructor(definitions: TypeDefinition[]) {
    this.definitions = definitions;
  }
  
  initialize(): void {
    // Sort by dependencies
    const sorted = this.topologicalSort(this.definitions);
    
    // Register each definition
    for (const def of sorted) {
      this.registerType(def);
    }
  }
  
  registerType(definition: TypeDefinition): void {
    if (this.registered.has(definition.name)) {
      return;
    }
    
    // Register dependencies first
    for (const dep of definition.dependencies) {
      const depDef = this.definitions.find(d => d.name === dep);
      if (depDef && !this.registered.has(dep)) {
        this.registerType(depDef);
      }
    }
    
    // Register with Monaco
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      definition.content,
      definition.virtualPath
    );
    
    this.registered.add(definition.name);
  }
  
  // ... other methods
}
```

### 4. Monaco Configuration Integration

Update the existing Monaco configuration to use the Type Registry.

**Location:** `packages/web/src/utils/monaco-types.ts` (refactored)

**Changes:**
```typescript
import { typeDefinitions } from '../config/type-definitions';
import { MonacoTypeRegistry } from './type-registry';

let registry: MonacoTypeRegistry | null = null;

export function addMonacoTypes() {
  if (registry) {
    return; // Already initialized
  }
  
  try {
    // Create and initialize registry
    registry = new MonacoTypeRegistry(typeDefinitions);
    registry.initialize();
    
    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });
    
    console.log('Monaco types registered:', registry.getRegisteredLibraries());
  } catch (error) {
    console.error('Failed to add Monaco types:', error);
  }
}

export function getTypeRegistry(): MonacoTypeRegistry | null {
  return registry;
}
```

## Data Models

### TypeDefinition

```typescript
interface TypeDefinition {
  // Unique identifier for the library
  name: string;
  
  // Virtual file path in Monaco's file system
  virtualPath: string;
  
  // The actual TypeScript type definition content
  content: string;
  
  // List of library names this definition depends on
  dependencies: string[];
}
```

### LibraryConfig

```typescript
interface LibraryConfig {
  name: string;
  packageName: string;
  entryPoint: string;
  virtualPath: string;
  enabled: boolean;
  additionalFiles?: string[];
  dependencies?: string[];
}
```

## Error Handling

### Build-Time Errors

1. **Missing Package**: If a configured package is not found in `node_modules`
   - Log a warning
   - Skip the package
   - Continue with other packages

2. **Invalid Type Definition**: If a `.d.ts` file cannot be parsed
   - Log an error with file path
   - Skip the file
   - Continue with other files

3. **Circular Dependencies**: If libraries have circular dependencies
   - Detect using topological sort
   - Log an error
   - Break the cycle by loading in alphabetical order

### Runtime Errors

1. **Monaco Registration Failure**: If `addExtraLib` throws an error
   - Log the error with library name
   - Continue registering other libraries
   - Mark the library as failed

2. **Missing Dependencies**: If a library depends on another that failed to load
   - Log a warning
   - Attempt to load anyway (Monaco may handle it)

3. **Initialization Failure**: If the entire registry fails to initialize
   - Log the error
   - Fall back to Monaco's default types
   - Display a non-blocking notification to the user

## Testing Strategy

### Unit Tests

1. **Type Extractor Tests** (`extract-types.test.ts`)
   - Test configuration loading
   - Test file reading from node_modules
   - Test content bundling
   - Test dependency resolution
   - Test output generation

2. **Type Registry Tests** (`type-registry.test.ts`)
   - Test initialization
   - Test type registration
   - Test dependency ordering (topological sort)
   - Test duplicate registration prevention
   - Test error handling

### Integration Tests

1. **Monaco Integration Tests** (`monaco-types.integration.test.ts`)
   - Test that React types are available in Monaco
   - Test that imports don't show errors
   - Test IntelliSense for React hooks
   - Test JSX type checking

2. **Build Process Tests** (`build.test.ts`)
   - Test that `extract-types` script runs successfully
   - Test that `type-definitions.ts` is generated
   - Test that the generated file is valid TypeScript

### Manual Testing

1. **Editor Testing**
   - Open the web version
   - Type `import React from 'react'`
   - Verify no type errors
   - Type `useState` and verify IntelliSense appears
   - Write a complete React component and verify type checking

2. **Build Testing**
   - Run `pnpm run build`
   - Verify no build errors
   - Check bundle size
   - Verify type definitions are included in the bundle

## Implementation Notes

### Build Integration

The type extractor script should be integrated into the Vite build process:

**packages/web/package.json:**
```json
{
  "scripts": {
    "prebuild": "tsx scripts/extract-types.ts",
    "build": "vite build",
    "dev": "tsx scripts/extract-types.ts && vite"
  }
}
```

### Performance Considerations

1. **Bundle Size**: Type definitions can be large (React types are ~500KB)
   - Consider minifying type definitions (remove comments, whitespace)
   - Consider lazy loading for less common libraries
   - Monitor bundle size impact

2. **Load Time**: Registering many type definitions can be slow
   - Register types asynchronously if possible
   - Show a loading indicator during registration
   - Cache registration status

3. **Memory Usage**: Type definitions consume memory
   - Only include essential files
   - Remove duplicate declarations
   - Consider using Monaco's built-in types where possible

### Dependency Resolution

The type extractor must handle complex dependency scenarios:

1. **Transitive Dependencies**: If React depends on csstype, include csstype
2. **Peer Dependencies**: Handle peer dependencies correctly
3. **Version Conflicts**: Use the version installed in node_modules
4. **Relative Imports**: Resolve relative imports within type definitions

### Future Enhancements

1. **CDN Fallback**: If bundled types fail, fetch from CDN as fallback
2. **Dynamic Loading**: Load types on-demand when user imports a library
3. **Type Caching**: Cache types in IndexedDB for faster subsequent loads
4. **User Configuration**: Allow users to enable/disable specific libraries
5. **Type Updates**: Mechanism to update types without rebuilding the app
