# Logging Added for Third-Party Library Support Analysis

## Overview
Added comprehensive logging throughout the third-party library support system to help diagnose issues with library detection, adapter application, and node generation.

## Logging Locations

### 1. AST Analyzer (`packages/analyzer/src/parser/ast-analyzer.ts`)
- **Import Detection Phase**:
  - Logs all detected imports with their sources
  - Lists registered libraries being checked
  - Shows which libraries are activated
  - Format: `🔍 AST Analyzer: ...`

### 2. Import Detector (`packages/analyzer/src/analyzers/import-detector.ts`)
- **Import Scanning**:
  - Logs each import statement found
  - Shows namespace vs named imports
  - Displays import aliases
- **Library Activation**:
  - Checks each import against registered libraries
  - Shows which imports are matched/skipped
  - Lists final active libraries
  - Format: `📦 Import Detector: ...`

### 3. Hooks Analyzer (`packages/analyzer/src/analyzers/hooks-analyzer.ts`)
- **Hook Classification**:
  - Logs each hook being processed
  - Shows hook variables, arguments, and dependencies
  - Indicates whether library adapter is attempted
- **Library Adapter Application**:
  - Logs adapter lookup for each active library
  - Shows adapter return pattern type and mappings count
  - Displays extracted return value mappings
  - Indicates success/failure of adapter application
  - Format: `🪝 Hooks Analyzer: ...`

### 4. Hook Registry (`packages/analyzer/src/utils/hook-registry.ts`)
- **Adapter Lookup**:
  - Logs library and hook name being queried
  - Shows available libraries if not found
  - Lists available hooks in library if hook not found
  - Format: `📚 HookRegistry: ...`

### 5. Adapter Registry (`packages/analyzer/src/utils/library-adapters.ts`)
- **Adapter Registration**:
  - Logs each adapter being registered
  - Shows package patterns and hooks
  - Displays package-to-library mappings
  - Format: `📚 AdapterRegistry: ...`

### 6. DFD Builder (`packages/analyzer/src/parser/dfd-builder.ts`)
- **Library Hook Processing**:
  - Logs when library hook node building starts
  - Shows return value mappings and hook arguments
  - Indicates if hook is a data fetching hook
  - Logs API endpoint extraction
  - Shows Server node creation
  - Displays consolidated node details
  - Shows edge creation from Server to hook
  - Format: `🚚 DFD Builder: ...`

## Log Symbols

- `✅` - Success/Found
- `⚠️` - Warning/Not Found
- `⏭️` - Skipped
- `========================================` - Section separator for major operations

## Example Log Flow

When analyzing a component with `useSWR`:

```
🔍 ========================================
🔍 AST Analyzer: Detecting imports...
🔍 AST Analyzer: Imports detected: 2
🔍   - swr: useSWR
🔍   - react: useState
🔍 AST Analyzer: Registered libraries: ['swr', 'swr/mutation', ...]
📦 ========================================
📦 Checking for active libraries
📦 Total imports detected: 2
📦 Registered libraries: ['swr', 'swr/mutation', ...]
📦 Checking import: swr
📦   ✅ Active library: swr
📦 Checking import: react
📦   ⏭️  Skipping unregistered: react
📦 ========================================
📦 Total active libraries: 1
📦 Active libraries list: ['swr']
🔍 AST Analyzer: Active libraries: ['swr']
🔍 ========================================
🪝 ========================================
🪝 Classifying 1 hooks
🪝 Active libraries: ['swr']
🪝 Processing hook: useSWR
🪝   Variables: ['data', 'error', 'isLoading', 'mutate']
🪝   Arguments: [{ type: 'string', value: '/api/user' }, ...]
🪝   Attempting to apply library adapter...
🪝 applyLibraryAdapter: Checking 1 active libraries for useSWR
🪝   Checking library: swr
📚 HookRegistry.getLibraryAdapter: swr / useSWR
📚   ✅ Found adapter for useSWR
🪝   ✅ Found library adapter for useSWR from swr
🪝      Adapter return pattern type: object
🪝      Adapter mappings count: 4
🪝   ✅ Extracted 4 return value mappings
🪝      data -> external-entity-input
🪝      error -> data-store
🪝      isLoading -> data-store
🪝      mutate -> process
🪝   ✅ Applied library adapter for useSWR
🪝      Library: swr
🪝      Mappings: Map(4) { ... }
🚚 ========================================
🚚 Building nodes from library hook: useSWR (swr)
🚚 Return value mappings: Map(4) { ... }
🚚 Hook arguments: [{ type: 'string', value: '/api/user' }, ...]
🚚 Hook dependencies: undefined
🚚 Hook variables: ['data', 'error', 'isLoading', 'mutate']
🚚 Is data fetching hook: true
🚚 Extracting API endpoint from arguments: [...]
🚚 ✅ Creating Server node for endpoint: /api/user
🚚 ✅ Created Server node: /api/user
🚚 Consolidating useSWR into single node
🚚 ✅ Created consolidated useSWR node:
🚚    Node ID: library_hook_0
🚚    Label: useSWR<resource>
🚚    Type: data-store
🚚    All properties: ['data', 'error', 'isLoading', 'mutate']
🚚    Data properties: ['data', 'error', 'isLoading']
🚚    Process properties: ['mutate']
🚚    Server node ID: server_0
🚚 ✅ Created edge from Server (server_0) to useSWR (library_hook_0)
🚚 ========================================
```

## Debugging Tips

1. **Library Not Detected**: Check `📦 Import Detector` logs to see if import is recognized
2. **Adapter Not Applied**: Check `🪝 Hooks Analyzer` and `📚 HookRegistry` logs for adapter lookup
3. **Node Not Created**: Check `🚚 DFD Builder` logs for node generation
4. **Server Node Missing**: Check if hook is recognized as data fetching hook and if endpoint is extracted

## Performance Note

These logs are verbose and intended for development/debugging. In production, consider:
- Using a logging level system to control verbosity
- Filtering logs by component or library
- Disabling logs for performance-critical paths
