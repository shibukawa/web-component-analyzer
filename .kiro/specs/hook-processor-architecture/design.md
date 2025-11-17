# Design Document

## Overview

This document describes the architecture for refactoring the DFD builder to use a pluggable hook processor system. The design unifies React-specific hook handling and third-party library hook handling into a single, extensible architecture where processors are self-contained modules that can be easily added or modified.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DFD Builder                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Hook Processing Orchestrator                    │ │
│  │  - Receives hooks from ComponentAnalysis               │ │
│  │  - Delegates to ProcessorRegistry                      │ │
│  │  - Collects nodes/edges from processors                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Processor Registry                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Maintains registered processors                      │ │
│  │  - Matches hooks to appropriate processor              │ │
│  │  - Handles processor priority/fallback                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Library Processors (libraries/)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    react     │  │     swr      │  │   next.js    │      │
│  │  (useState,  │  │  (useSWR,    │  │ (useRouter,  │      │
│  │  useContext, │  │useSWRMutation│  │usePathname,  │      │
│  │  useReducer, │  │useSWRConfig) │  │useParams)    │      │
│  │useImperative)│  └──────────────┘  └──────────────┘      │
│  └──────────────┘  ┌──────────────┐  ┌──────────────┐      │
│                    │react-query   │  │ custom-hook  │      │
│                    │  (useQuery,  │  │  (fallback   │      │
│                    │ useMutation) │  │  processor)  │      │
│                    └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
packages/analyzer/src/
├── parser/
│   ├── dfd-builder.ts          # Main builder (orchestrator only)
│   └── types.ts
├── libraries/                   # All library processors (1 file per library)
│   ├── react.ts                # React standard hooks processor
│   ├── swr.ts                  # SWR library processor
│   ├── next.ts                 # Next.js hooks processor
│   ├── react-query.ts          # TanStack Query processor
│   ├── custom-hook.ts          # Fallback for custom hooks
│   └── index.ts                # Registry and exports
└── analyzers/
    └── hooks-analyzer.ts
```

**Key Changes:**
- Rename `third-party/` to `libraries/`
- Move React-specific processors into `libraries/react.ts`
- Each library = 1 file with all its hook processors
- `libraries/index.ts` exports registry and all processors

## Components and Interfaces

### 1. HookProcessor Interface

Base interface that all processors must implement:

```typescript
export interface HookProcessor {
  /**
   * Metadata about this processor
   */
  readonly metadata: ProcessorMetadata;
  
  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean;
  
  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult;
}

export interface ProcessorMetadata {
  /** Unique identifier for this processor */
  id: string;
  
  /** Library name (e.g., 'react', 'swr', 'next/navigation') */
  libraryName: string;
  
  /** Package patterns to match imports */
  packagePatterns: string[];
  
  /** Hook names or patterns this processor handles */
  hookNames: Array<string | RegExp>;
  
  /** Priority (higher = checked first) */
  priority: number;
  
  /** Human-readable description */
  description?: string;
}

export interface ProcessorContext {
  /** Component analysis data */
  analysis: ComponentAnalysis;
  
  /** All existing nodes (for lookups) */
  nodes: DFDNode[];
  
  /** All existing edges */
  edges: DFDEdge[];
  
  /** Utility: Generate unique node ID */
  generateNodeId: (prefix: string) => string;
  
  /** Utility: Find node by variable name */
  findNodeByVariable: (varName: string, nodes: DFDNode[]) => DFDNode | null;
  
  /** Utility: Create server node */
  createServerNode: (endpoint?: string, line?: number, column?: number) => string;
  
  /** Logger with processor-specific prefix */
  logger: ProcessorLogger;
}

export interface ProcessorResult {
  /** Nodes created by this processor */
  nodes: DFDNode[];
  
  /** Edges created by this processor */
  edges: DFDEdge[];
  
  /** Optional subgraphs */
  subgraphs?: DFDSubgraph[];
  
  /** Whether this processor fully handled the hook */
  handled: boolean;
}
```


### 2. ProcessorRegistry

Central registry for managing and dispatching to processors:

```typescript
export class ProcessorRegistry {
  private processors: HookProcessor[] = [];
  private processorsByLibrary: Map<string, HookProcessor[]> = new Map();
  private processorsByHook: Map<string, HookProcessor[]> = new Map();
  
  /**
   * Register a processor
   */
  register(processor: HookProcessor): void {
    this.processors.push(processor);
    
    // Sort by priority (higher first)
    this.processors.sort((a, b) => b.metadata.priority - a.metadata.priority);
    
    // Index by library
    const libraryProcessors = this.processorsByLibrary.get(processor.metadata.libraryName) || [];
    libraryProcessors.push(processor);
    this.processorsByLibrary.set(processor.metadata.libraryName, libraryProcessors);
    
    // Index by exact hook names (not regex patterns)
    for (const hookName of processor.metadata.hookNames) {
      if (typeof hookName === 'string') {
        const hookProcessors = this.processorsByHook.get(hookName) || [];
        hookProcessors.push(processor);
        this.processorsByHook.set(hookName, hookProcessors);
      }
    }
  }
  
  /**
   * Find the best processor for a hook
   * Tries exact match first, then regex patterns
   */
  findProcessor(hook: HookInfo, context: ProcessorContext): HookProcessor | null {
    // Try exact match first (O(1) lookup)
    const exactMatches = this.processorsByHook.get(hook.hookName);
    if (exactMatches) {
      for (const processor of exactMatches) {
        if (processor.shouldHandle(hook, context)) {
          return processor;
        }
      }
    }
    
    // Try regex patterns (O(n) but only for unmatched hooks)
    for (const processor of this.processors) {
      if (processor.shouldHandle(hook, context)) {
        return processor;
      }
    }
    
    return null;
  }
  
  /**
   * Get all processors for a library
   */
  getProcessorsForLibrary(libraryName: string): HookProcessor[] {
    return this.processorsByLibrary.get(libraryName) || [];
  }
  
  /**
   * Clear all processors (for testing)
   */
  clear(): void {
    this.processors = [];
    this.processorsByLibrary.clear();
    this.processorsByHook.clear();
  }
}
```

### 3. ProcessorLogger

Structured logging interface for processors:

```typescript
export interface ProcessorLogger {
  /** Log processor invocation */
  start(hookName: string, hookInfo: HookInfo): void;
  
  /** Log node creation */
  node(action: 'created' | 'found', node: DFDNode): void;
  
  /** Log edge creation */
  edge(action: 'created', edge: DFDEdge): void;
  
  /** Log processor completion */
  complete(result: ProcessorResult): void;
  
  /** Log warnings */
  warn(message: string, data?: any): void;
  
  /** Log debug information */
  debug(message: string, data?: any): void;
}
```

## Library Processor Examples

### Example 1: React Library Processor (libraries/react.ts)

```typescript
import { HookProcessor, ProcessorMetadata, ProcessorContext, ProcessorResult } from './types';

/**
 * React standard hooks processor
 * Handles: useState, useReducer, useContext, useImperativeHandle, useEffect, etc.
 */
export class ReactLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'react',
    libraryName: 'react',
    packagePatterns: ['react'],
    hookNames: [
      'useState', 'useReducer', 'useContext', 'useImperativeHandle',
      'useEffect', 'useLayoutEffect', 'useCallback', 'useMemo', 'useRef'
    ],
    priority: 100, // High priority for built-in hooks
    description: 'React standard hooks processor'
  };
  
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    return this.metadata.hookNames.includes(hook.hookName);
  }
  
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);
    
    // Delegate to specific hook handlers
    switch (hook.hookName) {
      case 'useState':
        return this.processUseState(hook, context);
      case 'useReducer':
        return this.processUseReducer(hook, context);
      case 'useContext':
        return this.processUseContext(hook, context);
      case 'useImperativeHandle':
        return this.processUseImperativeHandle(hook, context);
      default:
        return { nodes: [], edges: [], handled: false };
    }
  }
  
  private processUseState(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    // Extract current useState logic from dfd-builder
    // ...
  }
  
  private processUseReducer(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    // Extract current useReducer logic from dfd-builder
    // ...
  }
  
  private processUseContext(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    // Extract current useContext logic from dfd-builder
    // ...
  }
  
  private processUseImperativeHandle(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    // Extract current useImperativeHandle logic from dfd-builder
    // ...
  }
}
```

### Example 2: SWR Library Processor (libraries/swr.ts)

```typescript
/**
 * SWR library processor
 * Handles: useSWR, useSWRMutation, useSWRConfig
 */
export class SWRLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'swr',
    libraryName: 'swr',
    packagePatterns: ['swr', 'swr/mutation'],
    hookNames: ['useSWR', 'useSWRMutation', 'useSWRConfig'],
    priority: 50,
    description: 'SWR data fetching library processor'
  };
  
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if hook is from SWR library
    const enrichedHook = hook as any;
    return enrichedHook.libraryName === 'swr' && 
           this.metadata.hookNames.includes(hook.hookName);
  }
  
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger, generateNodeId, createServerNode } = context;
    logger.start(hook.hookName, hook);
    
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];
    
    // Create Server node for data fetching hooks
    let serverNodeId: string | null = null;
    if (hook.hookName === 'useSWR' || hook.hookName === 'useSWRMutation') {
      const endpoint = this.extractEndpoint(hook);
      serverNodeId = createServerNode(endpoint, hook.line, hook.column);
    }
    
    // Create consolidated hook node
    const nodeId = generateNodeId('library_hook');
    const node: DFDNode = {
      id: nodeId,
      label: this.createLabel(hook),
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'swr',
        // ... other metadata
      }
    };
    
    nodes.push(node);
    logger.node('created', node);
    
    // Create edge from Server to hook
    if (serverNodeId) {
      edges.push({
        from: serverNodeId,
        to: nodeId,
        label: 'fetches'
      });
      logger.edge('created', edges[edges.length - 1]);
    }
    
    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }
  
  private extractEndpoint(hook: HookInfo): string | undefined {
    // Extract API endpoint from hook arguments
    // ...
  }
  
  private createLabel(hook: HookInfo): string {
    // Create label with type parameter if available
    // ...
  }
}
```


### Example 3: Custom Hook Processor (libraries/custom-hook.ts)

```typescript
/**
 * Fallback processor for custom hooks (not in any library)
 */
export class CustomHookProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'custom-hook',
    libraryName: 'custom',
    packagePatterns: [],
    hookNames: [/^use[A-Z]/], // Matches any hook starting with 'use' followed by uppercase
    priority: 0, // Lowest priority (fallback)
    description: 'Fallback processor for custom hooks'
  };
  
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Handle any hook that matches custom hook pattern and isn't handled by other processors
    return this.matchesHookPattern(hook.hookName) && !hook.category;
  }
  
  private matchesHookPattern(hookName: string): boolean {
    return this.metadata.hookNames.some(pattern => {
      if (typeof pattern === 'string') {
        return pattern === hookName;
      } else {
        return pattern.test(hookName);
      }
    });
  }
  
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    // Use heuristic-based classification
    // Create nodes based on variable types (data vs function)
    // ...
  }
}
```

## Data Models

### HookInfo Extension

Extend existing HookInfo to include library information:

```typescript
export interface HookInfo {
  // Existing fields
  hookName: string;
  category?: HookCategory;
  variables: string[];
  dependencies?: string[];
  // ... other existing fields
  
  // New fields for library support
  libraryName?: string;
  returnValueMappings?: Map<string, ReturnValueMapping>;
  variableTypes?: Map<string, 'function' | 'data'>;
}
```

### ProcessorResult

Result returned by processors:

```typescript
export interface ProcessorResult {
  nodes: DFDNode[];
  edges: DFDEdge[];
  subgraphs?: DFDSubgraph[];
  handled: boolean;
}
```

## Error Handling

### Processor Errors

```typescript
export class ProcessorError extends Error {
  constructor(
    public processorId: string,
    public hookName: string,
    message: string,
    public cause?: Error
  ) {
    super(`[${processorId}] Error processing ${hookName}: ${message}`);
    this.name = 'ProcessorError';
  }
}
```

### Error Recovery Strategy

1. **Processor Failure**: If a processor throws an error, log it and try the next matching processor
2. **No Processor Found**: Fall back to default processor (creates basic nodes)
3. **Partial Processing**: If a processor returns `handled: false`, try the next processor
4. **Validation Errors**: Validate processor results before adding to DFD

## Testing Strategy

### Unit Tests

1. **Processor Tests**: Test each processor in isolation
   - Mock ProcessorContext
   - Verify nodes/edges created
   - Test edge cases (missing data, invalid hooks)

2. **Registry Tests**: Test processor registration and lookup
   - Priority ordering
   - Library matching
   - Hook name matching

3. **Integration Tests**: Test full DFD building with processors
   - Use existing test components
   - Verify output matches expected DFD
   - Test processor combinations

### Test Structure

```typescript
describe('ReactLibraryProcessor', () => {
  let processor: ReactLibraryProcessor;
  let context: ProcessorContext;
  
  beforeEach(() => {
    processor = new ReactLibraryProcessor();
    context = createMockContext();
  });
  
  describe('useState', () => {
    it('should create data-store node for state variable', () => {
      const hook: HookInfo = {
        hookName: 'useState',
        variables: ['count', 'setCount'],
        // ...
      };
      
      const result = processor.process(hook, context);
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('data-store');
      expect(result.nodes[0].label).toBe('count');
    });
  });
});
```

## Migration Strategy

### Phase 1: Create Infrastructure
1. Create processor interfaces and types
2. Create ProcessorRegistry
3. Create ProcessorLogger
4. Set up directory structure (`libraries/`)

### Phase 2: Migrate React Hooks
1. Create `libraries/react.ts`
2. Extract useState logic → ReactLibraryProcessor.processUseState
3. Extract useReducer logic → ReactLibraryProcessor.processUseReducer
4. Extract useContext logic → ReactLibraryProcessor.processUseContext
5. Extract useImperativeHandle logic → ReactLibraryProcessor.processUseImperativeHandle
6. Test each migration

### Phase 3: Migrate Library Hooks
1. Create `libraries/swr.ts` (merge SWRHookHandler + adapter config)
2. Create `libraries/next.ts` (merge NextJSHookHandler + adapter config)
3. Create `libraries/custom-hook.ts` (fallback processor)
4. Remove old `third-party/` directory
5. Remove `config/library-adapters.json`

### Phase 4: Update DFD Builder
1. Replace hook processing logic with ProcessorRegistry calls
2. Remove all conditional checks for specific hooks
3. Clean up logging
4. Update tests

### Phase 5: Cleanup
1. Remove old library adapter system
2. Remove old hook handler classes
3. Update documentation
4. Verify all tests pass

## Logging Design

### Log Format

```
[ProcessorID] Action: Details
```

### Examples

```
[react] 🎯 Processing useState: count, setCount
[react]   ✅ Created data-store node: count (state_1)
[react]   📊 Result: 1 nodes, 0 edges

[swr] 🎯 Processing useSWR: data, error, isLoading
[swr]   ✅ Created server node: Server: /api/user (server_1)
[swr]   ✅ Created library-hook node: useSWR<User> (library_hook_1)
[swr]   ✅ Created edge: server_1 → library_hook_1 (fetches)
[swr]   📊 Result: 2 nodes, 1 edges

[custom-hook] 🎯 Processing useCounter: count, increment, decrement
[custom-hook]   ✅ Created data node: count (custom_hook_data_1)
[custom-hook]   ✅ Created function node: increment (custom_hook_function_1)
[custom-hook]   ✅ Created function node: decrement (custom_hook_function_2)
[custom-hook]   📊 Result: 3 nodes, 0 edges
```

### Log Levels

- **Start**: Processor invocation
- **Node**: Node creation/lookup
- **Edge**: Edge creation
- **Complete**: Processor result summary
- **Warn**: Non-fatal issues
- **Debug**: Detailed information (only when debug enabled)

## Performance Considerations

### Processor Lookup Optimization

1. **Two-Phase Lookup**:
   - Phase 1: O(1) exact match lookup for known hook names (useState, useSWR, etc.)
   - Phase 2: O(n) regex pattern matching for custom hooks (only if exact match fails)
2. **Index by Library**: O(1) lookup for library-specific processors
3. **Priority Queue**: Processors sorted by priority for fallback chain
4. **Caching**: Cache processor instances (no repeated instantiation)

This approach ensures that common hooks (React standard, popular libraries) have fast O(1) lookup, while custom hooks use regex matching only when needed.

### Lazy Loading

Processors can be lazy-loaded to reduce initial bundle size:

```typescript
// libraries/index.ts
export async function loadProcessor(libraryName: string): Promise<HookProcessor> {
  switch (libraryName) {
    case 'react':
      return (await import('./react')).ReactLibraryProcessor;
    case 'swr':
      return (await import('./swr')).SWRLibraryProcessor;
    // ...
  }
}
```

## Backward Compatibility

### Maintaining Existing Behavior

1. **Node IDs**: Use same ID generation pattern
2. **Node Types**: Keep existing node types (data-store, external-entity-input, process)
3. **Metadata**: Preserve existing metadata structure
4. **Edge Labels**: Keep existing edge labels (reads, writes, dispatch, etc.)

### Testing Compatibility

Run existing test suite against new implementation to ensure identical output:

```typescript
describe('Backward Compatibility', () => {
  it('should produce identical DFD for existing test components', () => {
    const oldDFD = buildDFDWithOldBuilder(component);
    const newDFD = buildDFDWithNewBuilder(component);
    
    expect(newDFD).toEqual(oldDFD);
  });
});
```
