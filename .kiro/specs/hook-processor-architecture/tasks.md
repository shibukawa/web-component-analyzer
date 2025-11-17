w# Implementation Plan

## Phase 1: Create Core Infrastructure

- [x] 1. Create processor type definitions and interfaces
  - Create `packages/analyzer/src/libraries/types.ts` with HookProcessor, ProcessorMetadata, ProcessorContext, ProcessorResult interfaces
  - Support both string and RegExp in hookNames array
  - Include ProcessorLogger interface for structured logging
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement ProcessorRegistry
  - Create `packages/analyzer/src/libraries/registry.ts`
  - Implement two-phase lookup (exact match O(1), then regex O(n))
  - Support priority-based processor ordering
  - Index processors by library name and exact hook names
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1_

- [x] 3. Implement ProcessorLogger
  - Create `packages/analyzer/src/libraries/logger.ts`
  - Implement structured logging with processor-specific prefixes
  - Support log levels: start, node, edge, complete, warn, debug
  - Use emoji prefixes for visual clarity (🎯, ✅, 📊, ⚠️)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4. Create libraries directory structure
  - Create `packages/analyzer/src/libraries/` directory
  - Create `packages/analyzer/src/libraries/index.ts` for exports and registry initialization
  - Remove old `packages/analyzer/src/third-party/` directory (after migration)
  - _Requirements: 3.1.1, 3.1.2_

## Phase 2: Migrate React Standard Hooks

- [x] 5. Create React library processor
  - Create `packages/analyzer/src/libraries/react.ts`
  - Implement ReactLibraryProcessor class with metadata
  - Set up hook name array: ['useState', 'useReducer', 'useContext', 'useImperativeHandle', 'useEffect', 'useLayoutEffect', 'useCallback', 'useMemo', 'useRef']
  - Set priority to 100 (high priority for built-in hooks)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1.1_

- [x] 5.1 Extract and migrate useState processing
  - Extract useState logic from dfd-builder.ts createStateNode method
  - Implement processUseState method in ReactLibraryProcessor
  - Handle read-write pair pattern [value, setValue]
  - Create data-store node with proper metadata
  - Handle initial value from props
  - _Requirements: 2.1, 7.1, 7.2, 7.3_

- [x] 5.2 Extract and migrate useReducer processing
  - Extract useReducer logic from dfd-builder.ts createStateNode method
  - Implement processUseReducer method in ReactLibraryProcessor
  - Handle state properties from destructuring
  - Use reducer function name as label
  - Create data-store node with isReducer metadata
  - _Requirements: 2.2, 7.1, 7.2, 7.3_

- [x] 5.3 Extract and migrate useContext processing
  - Extract useContext logic from dfd-builder.ts createContextNode method
  - Implement processUseContext method in ReactLibraryProcessor
  - Separate data values from function values using variableTypes
  - Create external-entity-input nodes for data
  - Create external-entity-output nodes for functions
  - _Requirements: 2.1, 7.1, 7.2, 7.3_

- [x] 5.4 Extract and migrate useImperativeHandle processing
  - Extract useImperativeHandle logic from dfd-builder.ts createProcessNodes method
  - Implement processUseImperativeHandle method in ReactLibraryProcessor
  - Create exported handlers subgroup
  - Handle exported handler nodes
  - _Requirements: 2.4, 7.1, 7.2, 7.3_

- [ ]* 5.5 Write unit tests for React processor
  - Test useState processing with various patterns
  - Test useReducer with state properties
  - Test useContext with data/function separation
  - Test useImperativeHandle with exported handlers
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 5.6 Integrate React processor into DFD Builder
  - Update `packages/analyzer/src/parser/dfd-builder.ts` createHookNodes method
  - Add processor registry initialization in constructor
  - Implement processHookWithRegistry method to use processor for React hooks
  - Keep fallback to old methods for non-React hooks temporarily
  - Add ProcessorContext creation with utilities (generateNodeId, findNodeByVariable, createServerNode)
  - _Requirements: 1.1, 1.2, 1.3, 2.5, 5.5_

- [x] 5.6.1 Create ProcessorContext utilities
  - Extract generateNodeId, findNodeByVariable, createServerNode as context utilities
  - Create ProcessorLogger instance for each processor invocation
  - Pass analysis, nodes, edges to context
  - _Requirements: 5.5, 4.1_

- [x] 5.6.2 Update createHookNodes to use processor for React hooks
  - Check if hook is React hook (useState, useReducer, useContext, useImperativeHandle, useRef)
  - Call processHookWithRegistry for React hooks
  - Collect nodes and edges from ProcessorResult
  - Keep existing logic for other hooks (library adapters, custom hooks)
  - _Requirements: 1.1, 1.2, 2.5_

- [x] 5.6.3 Handle processor errors and fallback
  - Wrap processor calls in try-catch
  - Log processor errors with context
  - Fall back to old methods if processor fails
  - Ensure no breaking changes to existing functionality
  - _Requirements: 1.5, 7.4_

- [x] 5.7 Remove old React hook processing methods
  - Remove createStateNode method (useState, useReducer, useRef logic)
  - Remove createContextNode method (useContext logic)
  - Remove createContextNodeLegacy method
  - Remove useImperativeHandle special handling in createProcessNodes
  - Clean up React-specific comments and logging
  - _Requirements: 2.5, 3.5_

- [x] 5.8 Verify React hook processing with existing tests
  - Run existing test suite to verify no regressions
  - Test with example components using useState, useReducer, useContext
  - Verify DFD output matches previous behavior
  - Fix any issues found during testing
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 3: Migrate Third-Party Library Hooks

- [x] 6. Create SWR library processor
  - Create `packages/analyzer/src/libraries/swr.ts`
  - Merge logic from `third-party/swr.ts` (SWRHookHandler)
  - Merge configuration from `config/library-adapters.json` (swr section)
  - Implement consolidated node creation for useSWR, useSWRMutation, useSWRConfig
  - Handle Server node creation for data fetching
  - Set priority to 50
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.1.1, 3.1.2, 3.1.4_

- [x] 6.1 Implement useSWR processing
  - Create consolidated library-hook node
  - Extract API endpoint from arguments
  - Create Server node with endpoint
  - Create edge from Server to hook node
  - Handle return value mappings (data, error, isLoading, mutate)
  - _Requirements: 3.1, 3.2, 7.1, 7.2_

- [x] 6.2 Implement useSWRMutation processing
  - Create consolidated library-hook node
  - Handle mutation-specific properties (trigger, isMutating)
  - Create edge to Server node (mutates)
  - _Requirements: 3.1, 3.2, 7.1, 7.2_

- [x] 6.3 Implement useSWRConfig processing
  - Create consolidated library-hook node
  - Handle global mutate and cache properties
  - Create generic Server node if needed
  - _Requirements: 3.1, 3.2, 7.1, 7.2_

- [ ]* 6.4 Write unit tests for SWR processor
  - Test useSWR with endpoint extraction
  - Test useSWRMutation with Server edge
  - Test useSWRConfig with generic Server
  - _Requirements: 7.1, 7.2_

- [x] 7. Create Next.js library processor
  - Create `packages/analyzer/src/libraries/next.ts`
  - Merge logic from `third-party/next.ts` (NextJSHookHandler)
  - Merge configuration from `config/library-adapters.json` (next/navigation section)
  - Implement URL node sharing logic (singleton pattern)
  - Handle useRouter, usePathname, useSearchParams, useParams
  - Set priority to 50
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.1.1, 3.1.2, 3.1.4_

- [x] 7.1 Implement Next.js hook processing
  - Create or reuse URL input/output nodes
  - Create consolidated hook nodes with labelSuffix
  - Handle reset logic for new components
  - _Requirements: 3.1, 3.2, 7.1, 7.2_

- [ ]* 7.2 Write unit tests for Next.js processor
  - Test URL node sharing across multiple hooks
  - Test reset functionality
  - Test all Next.js hooks (useRouter, usePathname, etc.)
  - _Requirements: 7.1, 7.2_

- [ ] 8. Create custom hook processor (fallback)
  - Create `packages/analyzer/src/libraries/custom-hook.ts`
  - Implement CustomHookProcessor with regex pattern `/^use[A-Z]/`
  - Use heuristic-based classification (variableTypes)
  - Separate data values from function values
  - Set priority to 0 (lowest, fallback)
  - _Requirements: 2.1, 3.1.3, 6.1, 6.2, 6.3_

- [ ]* 8.1 Write unit tests for custom hook processor
  - Test regex pattern matching
  - Test heuristic classification
  - Test data/function separation
  - _Requirements: 7.1, 7.2_

## Phase 4: Update DFD Builder

- [ ] 9. Refactor DFD Builder to use ProcessorRegistry
  - Update `packages/analyzer/src/parser/dfd-builder.ts`
  - Replace createHookNodes method with processor-based approach
  - Initialize ProcessorRegistry in constructor
  - Register all processors (React, SWR, Next.js, custom-hook)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5, 3.5_

- [ ] 9.1 Implement hook processing orchestration
  - For each hook, call registry.findProcessor()
  - Call processor.process() with context
  - Collect nodes and edges from ProcessorResult
  - Handle processor errors gracefully
  - Fall back to next processor if handled: false
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 9.2 Remove old hook processing logic
  - Remove createStateNode method
  - Remove createContextNode method
  - Remove createContextNodeLegacy method
  - Remove createCustomHookNode method
  - Remove buildNodesFromLibraryHook method
  - Remove all hook-specific conditional logic
  - _Requirements: 2.5, 3.5_

- [ ] 9.3 Clean up logging
  - Remove verbose console.log statements
  - Keep only high-level orchestration logs
  - Rely on ProcessorLogger for detailed logs
  - _Requirements: 4.5, 4.6_

- [ ] 9.4 Update utility methods
  - Keep generateNodeId, findNodeByVariable, createServerNode as utilities
  - Pass these to ProcessorContext
  - Ensure processors can access all necessary utilities
  - _Requirements: 5.5_

## Phase 5: Cleanup and Migration

- [ ] 10. Remove old library adapter system
  - Delete `packages/analyzer/src/config/library-adapters.json`
  - Delete `packages/analyzer/src/utils/library-adapters.ts`
  - Delete `packages/analyzer/src/utils/library-adapter-types.ts`
  - Delete `packages/analyzer/src/utils/README-library-adapters.md`
  - Update imports in other files
  - _Requirements: 3.1.2, 3.1.5_

- [ ] 11. Remove old third-party handler system
  - Delete `packages/analyzer/src/third-party/` directory
  - Remove LibraryHookHandler interface
  - Remove LibraryHandlerRegistry
  - Update imports in dfd-builder and other files
  - _Requirements: 3.1.2, 3.1.5_

- [ ] 12. Update hook registry
  - Update `packages/analyzer/src/utils/hook-registry.ts`
  - Remove library adapter integration
  - Keep only category-based classification for backward compatibility
  - Simplify getHookCategory method
  - _Requirements: 3.4, 7.3_

- [ ] 13. Update exports
  - Update `packages/analyzer/src/index.ts`
  - Export processor types and registry
  - Remove old adapter exports
  - _Requirements: 6.1, 6.4_

## Phase 6: Testing and Validation

- [ ]* 14. Run existing test suite
  - Run all existing unit tests
  - Verify no regressions
  - Fix any failing tests
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 15. Add integration tests
  - Test full DFD building with processors
  - Test processor priority and fallback
  - Test error handling
  - Test with existing example components
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 16. Performance testing
  - Measure DFD generation time before and after
  - Verify O(1) lookup for common hooks
  - Verify no performance degradation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 17. Backward compatibility validation
  - Compare DFD output for all test components
  - Verify identical node IDs, types, and metadata
  - Verify identical edge labels and connections
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 7: Documentation

- [ ]* 18. Update documentation
  - Document processor architecture in README
  - Add guide for creating new processors
  - Document migration from old system
  - Add examples of custom processors
  - _Requirements: 6.1, 6.6, 3.1.5_

- [ ]* 19. Add inline documentation
  - Add JSDoc comments to all processor interfaces
  - Document ProcessorContext utilities
  - Document logging conventions
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 20. Create migration guide
  - Document how to migrate from library adapters to processors
  - Provide examples of before/after code
  - List breaking changes (if any)
  - _Requirements: 3.1.5_
