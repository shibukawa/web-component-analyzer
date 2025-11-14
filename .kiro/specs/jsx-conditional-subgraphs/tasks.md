# Implementation Plan

- [x] 1. Add type definitions for JSX structure and subgraphs
  - Add ConditionalBranch, JSXStructure, JSXElementStructure, JSXAttributeReference, and DFDSubgraph types to src/parser/types.ts
  - Add optional structure and rootSubgraph fields to JSXInfo interface
  - Update JSXElementInfo to include attributeReferences field
  - _Requirements: 1.1, 2.1, 6.1_

- [x] 2. Implement Conditional Structure Extractor
- [x] 2.1 Create ConditionalStructureExtractor class
  - Create new file src/analyzers/conditional-extractor.ts
  - Implement extractStructure method to recursively analyze JSX AST
  - Implement analyzeElement method to extract tag name and dependencies
  - _Requirements: 1.2, 4.1, 4.2_

- [x] 2.2 Implement conditional expression analysis
  - Implement analyzeConditional method for ternary operators
  - Implement analyzeConditional method for logical AND (&&) operators
  - Implement analyzeConditional method for logical OR (||) operators
  - Implement extractConditionVariables to extract variables from condition expressions
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 3.1_

- [x] 2.3 Implement loop expression analysis
  - Detect .map() call expressions in JSX
  - Extract array variable being mapped
  - Extract loop variable from arrow function parameter
  - Create ConditionalBranch with type 'loop'
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 2.4 Implement attribute reference extraction
  - Implement extractAttributeReferences method
  - Extract attribute name and referenced variable for each JSX attribute
  - Handle inline arrow functions in attributes
  - Handle complex expressions in attribute values
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.5 Implement display dependency extraction
  - Implement extractDisplayDependencies method
  - Extract variables from JSX expression containers in content
  - Handle nested expressions
  - _Requirements: 5.1, 5.3_

- [ ]* 2.6 Write unit tests for ConditionalStructureExtractor
  - Test simple conditional (logical AND)
  - Test ternary operator
  - Test nested conditionals
  - Test .map() loop detection
  - Test element with display dependencies
  - Test element with attribute references
  - Test mixed content (elements + conditionals)
  - _Requirements: All from section 2_

- [x] 3. Implement Subgraph Builder
- [x] 3.1 Create SubgraphBuilder class
  - Create new file src/analyzers/subgraph-builder.ts
  - Implement buildRootSubgraph method
  - Implement buildSubgraph recursive method
  - _Requirements: 1.1, 1.3_

- [x] 3.2 Implement conditional subgraph building
  - Implement buildConditionalSubgraph method
  - Generate condition labels from ConditionExpression
  - Handle ternary true/false branches
  - Handle logical AND/OR branches
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 3.3 Implement loop subgraph building
  - Create loop subgraphs with "{loop}" label
  - Detect nested loops with no intermediate content
  - Merge nested loops into single subgraph
  - _Requirements: 9.1, 9.3, 9.4_

- [x] 3.4 Implement element node building
  - Implement buildElementNode method
  - Check if element should be included (has dependencies or is in conditional)
  - Create DFD node for JSX element
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 3.5 Implement subgraph filtering
  - Implement filterEmptySubgraphs method
  - Remove subgraphs with no elements after filtering
  - Remove elements with no dependencies outside conditionals
  - Remove top-level wrapper elements with no dependencies
  - _Requirements: 1.4, 1.5, 10.1, 10.2, 10.3, 10.4_

- [ ]* 3.6 Write unit tests for SubgraphBuilder
  - Test root subgraph creation
  - Test conditional subgraph creation
  - Test loop subgraph creation
  - Test nested loop merging
  - Test element node creation
  - Test empty subgraph filtering
  - Test nested subgraph structure
  - Test condition label generation
  - _Requirements: All from section 3_

- [x] 4. Enhance JSX Analyzer integration
- [x] 4.1 Integrate ConditionalStructureExtractor into SWCJSXAnalyzer
  - Import ConditionalStructureExtractor in src/analyzers/jsx-analyzer.ts
  - Instantiate extractor in SWCJSXAnalyzer constructor
  - Call extractStructure in analyzeJSX method
  - Add structure field to returned JSXInfo
  - _Requirements: 1.1, 1.2_

- [ ]* 4.2 Write integration tests for JSX Analyzer
  - Test JSX analysis with conditionals produces structure
  - Test JSX analysis with loops produces structure
  - Test JSX analysis with nested conditionals
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Enhance DFD Builder with subgraph support
- [x] 5.1 Integrate SubgraphBuilder into DFDBuilder
  - Import SubgraphBuilder in src/parser/dfd-builder.ts
  - Instantiate builder in buildDFD method
  - Call buildRootSubgraph if JSX structure exists
  - Store rootSubgraph in JSXInfo
  - _Requirements: 1.1_

- [x] 5.2 Implement condition edge creation
  - Implement buildConditionEdges method
  - Create edges from condition variables to conditional subgraphs
  - Label edges as "controls visibility"
  - Create edges from array variables to loop subgraphs
  - Label loop edges as "iterates over"
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.4, 8.5, 9.2_

- [x] 5.3 Implement attribute reference edge creation
  - Implement buildAttributeReferenceEdges method
  - Use TypeClassifier to determine if referenced variable is function or data
  - For function variables: create edge labeled with attribute name
  - For data variables: create edge labeled as "display"
  - Skip edges for constants or undefined variables
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.2, 8.3_

- [x] 5.4 Implement display edge creation
  - Implement buildDisplayEdges method
  - Create edges from stores to JSX elements for content variables
  - Label edges as "display"
  - _Requirements: 5.1, 5.2, 5.3, 8.1_

- [x] 5.5 Implement helper methods
  - Implement collectElementNodes to recursively collect nodes from subgraph tree
  - Implement findNodeByVariable to locate nodes by variable name
  - Implement classifyVariable using TypeClassifier
  - _Requirements: 7.1_

- [ ]* 5.6 Write unit tests for enhanced DFD Builder
  - Test condition edge creation
  - Test loop edge creation
  - Test attribute reference edge creation with functions
  - Test attribute reference edge creation with data
  - Test display edge creation
  - Test edge creation with nested subgraphs
  - _Requirements: All from section 5_

- [x] 6. Update visualization layer
- [x] 6.1 Update data-transformer to handle subgraphs
  - Modify src/visualization/data-transformer.ts to process DFDSubgraph structures
  - Transform nested subgraphs into visualization format
  - Preserve subgraph hierarchy
  - _Requirements: 1.1, 1.3_

- [x] 6.2 Update mermaid-transformer to render subgraphs
  - Modify src/visualization/mermaid-transformer.ts to generate Mermaid subgraph syntax
  - Render nested subgraphs with proper indentation
  - Add subgraph labels
  - _Requirements: 1.1, 2.1_

- [ ]* 6.3 Write integration tests for visualization
  - Test data transformation with subgraphs
  - Test Mermaid generation with nested subgraphs
  - Test visualization with conditional subgraphs
  - Test visualization with loop subgraphs
  - _Requirements: All from section 6_

- [x] 7. Create acceptance tests
- [x] 7.1 Create acceptance test for conditional rendering
  - Create examples/react-vite/src/components/001-ConditionalRendering.tsx
  - Add YAML specification for conditional subgraphs
  - Include test for ternary operator
  - Include test for logical AND operator
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [x] 7.2 Create acceptance test for loop rendering
  - Create examples/react-vite/src/components/002-LoopRendering.tsx
  - Add YAML specification for loop subgraphs
  - Include test for .map() with simple elements
  - Include test for nested .map() (should merge)
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 7.3 Create acceptance test for attribute references
  - Create examples/react-vite/src/components/003-AttributeReferences.tsx
  - Add YAML specification for attribute reference edges
  - Include test for event handler attributes
  - Include test for data attributes
  - Include test for custom component attributes
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_

- [x] 7.4 Test with existing components
  - Test AuthConsumer component analysis
  - Verify 3 conditional subgraphs created (isLoading, !isAuthenticated, isAuthenticated)
  - Verify condition edges from state variables
  - Verify attribute reference edges to input and button elements
  - Test DataDashboard component if it has conditionals
  - _Requirements: All requirements_

- [x] 8. Documentation and cleanup
- [x] 8.1 Update README with subgraph feature
  - Document conditional subgraph visualization
  - Document loop subgraph visualization
  - Add examples of expected output
  - _Requirements: N/A_

- [ ]* 8.2 Add inline code documentation
  - Add JSDoc comments to new classes and methods
  - Document type definitions
  - Add usage examples in comments
  - _Requirements: N/A_
