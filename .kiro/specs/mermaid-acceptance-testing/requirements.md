# Requirements Document: Mermaid-Based Acceptance Testing

## Introduction

The current acceptance testing approach uses embedded YAML specifications within component files. This creates maintenance overhead and makes it difficult to visually verify expected DFD outputs. This feature introduces a cleaner acceptance testing system where `.mmd` (Mermaid) files serve as the source of truth for expected parser output, allowing developers to see exactly what the parser should produce and easily update expectations when parser behavior changes.

## Glossary

- **Mermaid Diagram**: A JavaScript-based diagramming and charting tool that uses a simple markdown-inspired syntax to create diagrams
- **DFD (Data Flow Diagram)**: A visual representation showing how data flows through a component
- **Parser**: The code analysis engine that extracts component structure and generates DFD data
- **Acceptance Test**: An automated test that validates parser output against expected specifications
- **Test Component**: A React component file (`.tsx`) used for testing parser capabilities
- **Reference Diagram**: A `.mmd` file containing the expected Mermaid output for a test component

## Requirements

### Requirement 1: Mermaid Reference File Structure

**User Story:** As a test maintainer, I want to store expected Mermaid diagrams alongside test components, so that I can easily see and update expected parser output.

#### Acceptance Criteria

1. WHEN a test component file exists at `examples/react-vite/src/components/{number}-{Name}.tsx`, THE system SHALL support a corresponding reference file at `examples/react-vite/src/components/{number}-{Name}.mmd`
2. WHERE the `.mmd` file contains valid Mermaid flowchart syntax, THE system SHALL parse and validate the Mermaid syntax
3. WHILE a test component is being analyzed, THE system SHALL generate Mermaid output from the parser
4. WHEN comparing parser output to reference files, THE system SHALL normalize both outputs to handle formatting variations

### Requirement 2: Test Execution and Comparison

**User Story:** As a developer, I want to run acceptance tests that compare parser output against Mermaid reference files, so that I can validate parser correctness.

#### Acceptance Criteria

1. WHEN running acceptance tests, THE system SHALL scan `examples/react-vite/src/components/` for test components with matching `.mmd` files
2. WHEN a test component has a corresponding `.mmd` file, THE system SHALL parse the component and generate Mermaid output
3. WHEN comparing outputs, THE system SHALL normalize both the generated and reference Mermaid diagrams to handle whitespace and formatting differences
4. WHEN a test passes, THE system SHALL report success with the test name and component file
5. IF a test fails, THEN THE system SHALL report detailed differences between expected and actual output

### Requirement 3: Test Discovery and Organization

**User Story:** As a test maintainer, I want tests to be automatically discovered based on file naming conventions, so that I don't need to manually register each test.

#### Acceptance Criteria

1. WHEN scanning the components directory, THE system SHALL identify test files matching the pattern `{number}-{Name}.tsx`
2. WHERE a corresponding `.mmd` file exists, THE system SHALL treat it as an acceptance test
3. WHILE discovering tests, THE system SHALL maintain the numeric prefix order for consistent test execution
4. WHEN tests are discovered, THE system SHALL group them by framework (React, Vue, Svelte, etc.)

### Requirement 4: Test Failure Reporting

**User Story:** As a developer, I want clear, actionable error messages when tests fail, so that I can quickly identify and fix parser issues.

#### Acceptance Criteria

1. IF a test fails due to missing elements, THEN THE system SHALL report which DFD elements are missing from the parser output
2. IF a test fails due to extra elements, THEN THE system SHALL report which unexpected elements were generated
3. IF a test fails due to edge differences, THEN THE system SHALL show the differences in data flows
4. WHEN reporting failures, THE system SHALL include the file path and line numbers where applicable

### Requirement 5: Mermaid Output Normalization

**User Story:** As a test framework, I want to normalize Mermaid output to handle formatting variations, so that tests are robust to whitespace and style changes.

#### Acceptance Criteria

1. WHEN normalizing Mermaid diagrams, THE system SHALL remove extra whitespace and blank lines
2. WHEN normalizing, THE system SHALL handle different quote styles (single vs double quotes)
3. WHILE normalizing, THE system SHALL preserve the semantic structure of the diagram
4. WHEN comparing normalized outputs, THE system SHALL identify structural differences in nodes and edges

### Requirement 6: Test Execution Integration

**User Story:** As a developer, I want to run acceptance tests as part of the standard test suite, so that parser regressions are caught early.

#### Acceptance Criteria

1. WHEN running `pnpm run test`, THE system SHALL execute acceptance tests alongside other tests
2. WHERE acceptance tests are defined, THE system SHALL report results in the standard test output format
3. WHILE running tests, THE system SHALL support filtering by test name or component number
4. WHEN all tests pass, THE system SHALL exit with success code 0
5. IF any test fails, THEN THE system SHALL exit with non-zero code and report failures

