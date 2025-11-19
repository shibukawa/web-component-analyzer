# Implementation Plan

- [x] 1. Create EventHandlerUsageAnalyzer component
  - Create new file `packages/analyzer/src/services/event-handler-usage-analyzer.ts`
  - Implement `EventHandlerUsageAnalyzer` class with `analyze()` method
  - Implement `isEventHandlerAttribute()` method to detect event handler patterns (onClick, onChange, etc.)
  - Implement usage map building from `JSXAttributeReference[]` array
  - Handle direct references (`onClick={f}`) and arrow function wrappers (`onClick={() => f()}`)
  - Handle member expressions (`onClick={store.increment}`)
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ]* 1.1 Write unit tests for EventHandlerUsageAnalyzer
  - Test direct reference detection
  - Test arrow function wrapper detection
  - Test member expression detection
  - Test multiple usage contexts for same variable
  - Test non-event-handler attributes
  - _Requirements: 1.1, 1.2, 2.2_

- [x] 2. Define TypeScript interfaces for event handler usage
  - Add `EventHandlerUsageMap` interface to `packages/analyzer/src/parser/types.ts`
  - Add `EventHandlerUsageInfo` interface
  - Add `EventHandlerUsageContext` interface
  - Export interfaces from types file
  - _Requirements: 4.1, 4.3_

- [x] 3. Enhance TypeClassifier with usage information
  - Add `classifyWithUsage()` method to `TypeClassifier` class in `packages/analyzer/src/services/type-classifier.ts`
  - Accept `EventHandlerUsageInfo` as optional parameter
  - Use event handler usage as classification signal when type inference is unavailable
  - Prioritize type information over usage patterns when both available
  - Maintain backward compatibility with existing `classify()` method
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [ ]* 3.1 Write unit tests for enhanced TypeClassifier
  - Test classification with event handler usage information
  - Test fallback to type-based classification
  - Test priority when both type and usage information available
  - Test backward compatibility with existing classify() method
  - _Requirements: 2.2, 4.1, 4.2_

- [x] 4. Integrate EventHandlerUsageAnalyzer into DFD Builder
  - Import `EventHandlerUsageAnalyzer` in `packages/analyzer/src/parser/dfd-builder.ts`
  - Call analyzer during DFD construction to build usage map
  - Pass usage information to `TypeClassifier.classifyWithUsage()` when classifying variables
  - Update edge creation logic to use enhanced classification
  - Ensure correct edge direction: `JSX_element --[onClick: f]--> process_node`
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 4.3, 4.4_

- [ ]* 4.1 Write integration tests for DFD Builder
  - Test end-to-end flow from JSX analysis to DFD construction
  - Test correct edge direction generation
  - Test with Zustand selectors and other store patterns
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3_

- [x] 5. Create acceptance test components
  - Create `examples/react-vite/src/components/170-EventHandler-DirectReference.tsx` with simple onClick using function variable
  - Create `examples/react-vite/src/components/171-EventHandler-ArrowFunction.tsx` with onClick using arrow function
  - Create `examples/react-vite/src/components/172-Zustand-EventHandler.tsx` with event handler using Zustand selector
  - Create `examples/react-vite/src/components/173-EventHandler-MixedUsage.tsx` with variable used in both event handler and data contexts
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1_

- [x] 6. Generate and validate acceptance test references
  - Run analyzer on test components to generate DFD output
  - Create corresponding `.mmd` files with expected Mermaid diagrams
  - Verify correct edge directions in generated diagrams
  - Run acceptance tests to validate implementation
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3_

- [ ] 7. Add configuration flag for disabling name-based heuristics
  - Add `DISABLE_NAME_HEURISTICS` environment variable support in `packages/analyzer/src/analyzers/process-analyzer.ts`
  - Modify `isEventHandlerName()` method to check flag before applying heuristics
  - Document configuration option in code comments
  - _Requirements: 5.1, 5.4_

- [ ] 8. Validate heuristic removal with acceptance tests
  - Run all acceptance tests with `DISABLE_NAME_HEURISTICS=true`
  - Compare DFD output with and without name-based heuristics
  - Document differences in test results
  - Verify that event handler-based detection produces identical or better results
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 9. Remove name-based heuristics if validation passes
  - Remove `isEventHandlerName()` method from `process-analyzer.ts` if test results are identical
  - Remove related name pattern matching logic
  - Update code comments to document the change
  - Run all acceptance tests to ensure no regressions
  - _Requirements: 5.3, 5.4_
