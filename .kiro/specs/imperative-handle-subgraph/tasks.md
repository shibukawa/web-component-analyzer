# Implementation Plan

- [x] 1. Enhance type definitions for exported handlers
  - Add `ExportedHandlerInfo` interface to `src/parser/types.ts`
  - Add `exportedHandlers` field to `ProcessInfo` interface
  - Add `parentProcessId` field to `ProcessInfo` interface
  - Add `'exported-handler'` to process type union
  - Add `'exported-handlers'` to `DFDSubgraph` type union
  - Add `parentProcessId` field to `DFDSubgraph` interface
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Create ImperativeHandleAnalyzer module
  - [x] 2.1 Create `src/analyzers/imperative-handle-analyzer.ts` file
    - Define `ImperativeHandleAnalyzer` interface
    - Implement `SWCImperativeHandleAnalyzer` class
    - Add source code and line tracking support
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 2.2 Implement factory function analysis
    - Implement `analyzeImperativeHandle()` method to extract factory function
    - Implement `findReturnedObject()` to handle arrow function with object expression
    - Implement `findReturnedObject()` to handle arrow function with block statement
    - Implement `findReturnedObject()` to handle regular function
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Implement method extraction
    - Implement `extractMethodDefinitions()` to iterate over object properties
    - Implement `extractMethodFromProperty()` to handle KeyValueProperty
    - Implement `extractMethodFromProperty()` to handle MethodProperty
    - Implement `getPropertyKey()` to extract method names
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.4, 5.5, 5.6_

  - [x] 2.4 Implement method body analysis
    - Implement `analyzeMethod()` to extract method information
    - Implement `extractParameters()` to get parameter names
    - Implement `analyzeFunctionBody()` to extract references and external calls
    - Implement `checkReturnsValue()` to detect return statements
    - Detect async methods from function properties
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4, 8.5_

  - [x] 2.5 Implement reference extraction
    - Reuse `extractReferencesFromExpression()` logic from ProcessAnalyzer
    - Reuse `extractReferencesFromBlockStatement()` logic from ProcessAnalyzer
    - Reuse `extractReferencesFromStatement()` logic from ProcessAnalyzer
    - Handle nested function calls and conditional logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3_

  - [x] 2.6 Implement external call detection
    - Reuse `handleCallExpression()` logic from ProcessAnalyzer
    - Reuse `getMemberExpressionName()` logic from ProcessAnalyzer
    - Reuse `isExternalCall()` logic from ProcessAnalyzer
    - Reuse `extractCallArguments()` logic from ProcessAnalyzer
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.7 Implement error handling
    - Add try-catch blocks for factory function extraction
    - Add try-catch blocks for method extraction
    - Add graceful fallback for invalid patterns
    - Add logging for analysis failures
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Enhance ProcessAnalyzer to use ImperativeHandleAnalyzer
  - [x] 3.1 Integrate ImperativeHandleAnalyzer into ProcessAnalyzer
    - Add `imperativeHandleAnalyzer` field to `SWCProcessAnalyzer` class
    - Initialize analyzer in constructor
    - Pass source code to analyzer via `setSourceCode()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Enhance useImperativeHandle extraction
    - Modify `extractProcessFromHook()` to detect useImperativeHandle
    - Call `imperativeHandleAnalyzer.analyzeImperativeHandle()` for useImperativeHandle
    - Include `exportedHandlers` in returned ProcessInfo
    - Add error handling with fallback to regular process
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.5_

  - [x] 3.3 Handle dependencies extraction for useImperativeHandle
    - Extract dependencies from third argument (index 2) instead of second
    - Validate that dependencies match references in exported handlers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Enhance DFDBuilder to create exported handler subgroups
  - [x] 4.1 Implement exported handlers subgroup creation
    - Modify `build()` method to detect useImperativeHandle with exportedHandlers
    - Implement `createExportedHandlersSubgroup()` method
    - Create parent useImperativeHandle process node
    - Create subgroup with type 'exported-handlers'
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Implement exported handler node creation
    - Implement `createExportedHandlerNode()` method
    - Set node type to 'process' with metadata indicating 'exported-handler'
    - Include parentProcessId in metadata
    - Include method signature information in metadata
    - Add nodes to subgroup elements
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.3 Implement data flow edge creation for exported handlers
    - Implement `createExportedHandlerEdges()` method
    - Create edges from state variables to handlers (reads)
    - Create edges from handlers to state setters (calls)
    - Create edges from props to handlers (reads)
    - Create edges from context to handlers (reads)
    - Create edges from handlers to external calls (calls)
    - Create edges from arguments to external calls (passes)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.4 Handle multiple useImperativeHandle hooks
    - Ensure unique IDs for multiple subgroups
    - Handle multiple exported handler subgroups in same component
    - _Requirements: 2.3, 9.3_

  - [x] 4.5 Maintain backward compatibility
    - Keep existing process node creation for useImperativeHandle without exportedHandlers
    - Ensure existing DFD structure is preserved
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5. Enhance SubgraphBuilder for exported handlers
  - [x] 5.1 Implement exported handlers subgraph building
    - Add `buildExportedHandlersSubgraph()` method
    - Create subgraph structure for visualization
    - Add handler nodes to subgraph elements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 Integrate with existing subgraph building
    - Call `buildExportedHandlersSubgraph()` when processing useImperativeHandle
    - Add exported handlers subgraphs to visualization data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Update visualization components
  - [x] 6.1 Enhance MermaidTransformer for exported handlers
    - Add support for 'exported-handlers' subgraph type
    - Generate Mermaid subgraph syntax for exported handlers
    - Include edges to/from exported handlers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.2 Enhance DataTransformer for vis.js
    - Add 'exported-handler' group configuration
    - Set visual styling for exported handler nodes
    - Configure hierarchical layout for subgroups
    - Include parentId in node data for grouping
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.3 Enhance HTMLContentGenerator
    - Add 'exported-handler' group styling
    - Configure colors and shapes for exported handlers
    - Update hierarchical layout configuration
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 7. Write unit tests for ImperativeHandleAnalyzer
  - Write test for arrow function with object expression
  - Write test for arrow function with block statement
  - Write test for regular function
  - Write test for method shorthand syntax
  - Write test for function expression properties
  - Write test for parameter extraction
  - Write test for async method detection
  - Write test for return value detection
  - Write test for empty factory function
  - Write test for non-object return value
  - Write test for reference extraction
  - Write test for external call detection
  - Write test for error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 8. Write integration tests for DFD generation
  - Write test for complete DFD with exported handlers
  - Write test for subgroup structure
  - Write test for handler nodes
  - Write test for data flow edges
  - Write test for multiple useImperativeHandle hooks
  - Write test for backward compatibility
  - Create test fixture component with useImperativeHandle
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 9. Write visualization tests
  - Write test for Mermaid diagram generation
  - Write test for vis.js data transformation
  - Write test for HTML content generation
  - Verify visual styling of exported handlers
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 10. Update documentation
  - Update README with useImperativeHandle visualization feature
  - Add examples of exported handlers visualization
  - Document configuration options
  - Add troubleshooting guide for common issues
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_
