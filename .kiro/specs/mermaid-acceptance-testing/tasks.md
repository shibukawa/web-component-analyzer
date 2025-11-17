# Implementation Plan: Mermaid-Based Acceptance Testing

- [x] 1. Implement Mermaid normalizer utility
  - Create `packages/extension/src/test/acceptance/mermaid-normalizer.ts` to normalize Mermaid diagrams
  - Implement whitespace normalization (collapse spaces, remove blank lines)
  - Implement quote style normalization (convert to consistent format)
  - Implement comment removal
  - Implement style/class definition removal
  - Extract core elements (nodes, edges, subgraphs) into normalized sets
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement Mermaid comparator
  - Create `packages/extension/src/test/acceptance/mermaid-comparator.ts` to compare normalized diagrams
  - Implement comparison logic to find missing nodes, edges, and subgraphs
  - Implement logic to find extra elements in generated output
  - Generate human-readable diff reports showing differences
  - _Requirements: 2.3, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Implement test discovery
  - Create `packages/extension/src/test/acceptance/test-discovery.ts` to scan components directory
  - Implement file scanning for `{number}-{Name}.tsx` pattern
  - Implement matching of `.mmd` reference files
  - Implement test case grouping by framework
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Implement main test runner
  - Create `packages/extension/src/test/acceptance/mermaid-acceptance-test.ts` to orchestrate test execution
  - Implement test discovery integration
  - Implement component parsing using existing analyzer
  - Implement Mermaid generation from DFD data
  - Implement comparison workflow
  - Implement test result reporting with pass/fail status
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 5. Integrate with test framework
  - Update `packages/extension/package.json` test script to include acceptance tests
  - Create test entry point that runs acceptance tests alongside existing tests
  - Implement CLI filtering support for running specific tests by name or number
  - Implement proper exit codes (0 for success, non-zero for failures)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 6. Create reference Mermaid files for existing test components
  - Generate `.mmd` files for each numbered test component (001-ConditionalRendering, 002-LoopRendering, etc.)
  - Run parser against each component to generate expected output
  - Validate generated Mermaid diagrams are semantically correct
  - Place `.mmd` files alongside corresponding `.tsx` files
  - _Requirements: 1.1, 3.1, 3.2_

- [ ]* 7. Write unit tests for Mermaid utilities
  - Create tests for normalizer with whitespace and quote variations
  - Create tests for comparator with missing/extra element scenarios
  - Verify error handling for invalid Mermaid syntax
  - _Requirements: 2.3, 4.1, 4.2, 4.3_

- [ ]* 8. Write integration tests for acceptance test runner
  - Create end-to-end tests with sample components
  - Verify test discovery finds all test pairs
  - Verify test execution and result reporting
  - Test error scenarios (missing files, parsing failures)
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 6.1, 6.2_

