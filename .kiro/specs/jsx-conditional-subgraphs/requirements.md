# Requirements Document

## Introduction

This feature enhances the JSX analyzer to properly decompose conditional JSX rendering into nested subgraphs within the DFD visualization. The system shall create hierarchical subgraph structures that accurately represent conditional branches, with proper data flow edges from state/stores to the conditional subgraphs and from stores/handlers to the JSX elements within those subgraphs.

## Glossary

- **JSX Analyzer**: The component of the Parser System that analyzes JSX/TSX syntax trees to extract rendering structure
- **DFD (Data Flow Diagram)**: A visual representation showing how data flows through a component
- **Subgraph**: A nested grouping in the DFD that represents a logical section of JSX output
- **Conditional Subgraph**: A subgraph representing JSX that is conditionally rendered based on a boolean expression
- **Data Flow Edge**: A connection in the DFD showing data moving from one element to another
- **External Entity Output**: A DFD element representing rendered output or side effects
- **Data Store**: A DFD element representing internal state (useState, useReducer, etc.)
- **Process**: A DFD element representing event handlers or computations

## Requirements

### Requirement 1: Nested Subgraph Structure

**User Story:** As a developer analyzing a component with conditional rendering, I want to see JSX output organized into nested subgraphs, so that I can understand the hierarchical structure of conditional branches.

#### Acceptance Criteria

1. WHEN the JSX Analyzer encounters a root JSX return statement, THE JSX Analyzer SHALL create a top-level subgraph labeled "JSX Output"
2. WHEN the JSX Analyzer encounters a conditional expression (ternary operator or logical AND), THE JSX Analyzer SHALL create a nested subgraph within the parent subgraph
3. WHEN the JSX Analyzer encounters nested conditional expressions, THE JSX Analyzer SHALL create multiple levels of nested subgraphs reflecting the nesting depth
4. WHEN a subgraph contains no JSX elements with data dependencies, THE JSX Analyzer SHALL omit that subgraph from the output
5. WHEN a JSX element has no data dependencies and is not within a conditional branch, THE JSX Analyzer SHALL omit that element from the subgraph

### Requirement 2: Conditional Subgraph Labeling

**User Story:** As a developer reviewing a DFD, I want conditional subgraphs to be clearly labeled with their condition, so that I can understand what triggers each branch.

#### Acceptance Criteria

1. WHEN the JSX Analyzer creates a subgraph for a conditional expression, THE JSX Analyzer SHALL label the subgraph with "{condition}" format
2. WHEN the condition references a variable or expression, THE JSX Analyzer SHALL include a simplified representation of that condition in the label
3. WHEN the condition is a ternary operator, THE JSX Analyzer SHALL create separate subgraphs for the true and false branches with appropriate labels
4. WHEN the condition is a logical AND operator, THE JSX Analyzer SHALL create a single subgraph for the truthy branch

### Requirement 3: Data Flow from Conditions to Subgraphs

**User Story:** As a developer analyzing data flow, I want to see edges from state/stores to conditional subgraphs, so that I can understand what data controls the visibility of each section.

#### Acceptance Criteria

1. WHEN a conditional subgraph depends on a Data Store, THE JSX Analyzer SHALL create a data flow edge from that Data Store to the conditional subgraph
2. WHEN a conditional subgraph depends on multiple Data Stores, THE JSX Analyzer SHALL create separate data flow edges from each Data Store to the conditional subgraph
3. WHEN a conditional expression references a computed value or Process output, THE JSX Analyzer SHALL create a data flow edge from that Process to the conditional subgraph
4. WHEN a nested conditional depends on additional conditions, THE JSX Analyzer SHALL create data flow edges from the relevant Data Stores to the nested subgraph

### Requirement 4: JSX Element Representation

**User Story:** As a developer examining component output, I want to see individual JSX elements within subgraphs, so that I can understand what is being rendered in each conditional branch.

#### Acceptance Criteria

1. WHEN the JSX Analyzer encounters a JSX element with data dependencies, THE JSX Analyzer SHALL create a node representing that element within the appropriate subgraph
2. WHEN a JSX element is a standard HTML tag, THE JSX Analyzer SHALL label the node with the tag name (e.g., "input", "button", "p")
3. WHEN a JSX element contains only text with no JSX expressions, THE JSX Analyzer SHALL label the node as "text"
4. WHEN a JSX element has no data dependencies and is within a conditional branch, THE JSX Analyzer SHALL include the element node in the subgraph
5. WHEN a subgraph would be empty after filtering elements without dependencies, THE JSX Analyzer SHALL omit that subgraph

### Requirement 5: Data Flow from Stores to JSX Elements

**User Story:** As a developer tracing data usage, I want to see edges from state/stores to JSX elements that display that data, so that I can understand how data is rendered.

#### Acceptance Criteria

1. WHEN a JSX element displays a value from a Data Store, THE JSX Analyzer SHALL create a data flow edge labeled "display" from that Data Store to the JSX element
2. WHEN a JSX element uses a value from a Data Store in multiple ways, THE JSX Analyzer SHALL create separate data flow edges for each usage type
3. WHEN a JSX element references multiple Data Stores, THE JSX Analyzer SHALL create separate data flow edges from each Data Store to the JSX element
4. WHEN a JSX element displays a computed value, THE JSX Analyzer SHALL create a data flow edge from the Process that computes the value to the JSX element

### Requirement 6: JSX Attribute Reference Extraction

**User Story:** As a developer understanding component interactions, I want the system to extract all attribute references from JSX elements, so that subsequent analysis can determine data flow patterns.

#### Acceptance Criteria

1. WHEN a JSX element has an attribute that references a variable or expression, THE JSX Analyzer SHALL record the attribute name and the referenced variable
2. WHEN a JSX element has multiple attributes with variable references, THE JSX Analyzer SHALL record each attribute reference separately
3. WHEN an attribute references an inline arrow function, THE JSX Analyzer SHALL record the attribute reference with a generated identifier for the inline function
4. WHEN an attribute references a constant value, THE JSX Analyzer SHALL record the attribute reference (subsequent phases may filter it out)
5. WHEN an attribute value is a complex expression, THE JSX Analyzer SHALL extract all variables referenced in that expression

### Requirement 7: Attribute Reference Edge Creation

**User Story:** As a developer viewing a DFD, I want to see edges from variables to JSX elements based on attribute references, so that I can understand how data and event handlers flow to the UI.

#### Acceptance Criteria

1. WHEN the DFD Builder processes an attribute reference to a variable, THE DFD Builder SHALL use the Type Classifier to determine if the variable is a function or data
2. WHEN an attribute references a function variable, THE DFD Builder SHALL create an edge from that variable to the JSX element labeled with the attribute name
3. WHEN an attribute references a data variable, THE DFD Builder SHALL create an edge from that variable to the JSX element labeled as "display"
4. WHEN an attribute references a constant or undefined variable, THE DFD Builder SHALL omit creating an edge for that reference
5. WHEN a JSX element has multiple attribute references, THE DFD Builder SHALL create separate edges for each valid reference

### Requirement 8: Edge Type Differentiation

**User Story:** As a developer analyzing interactions, I want different types of data flow to be visually distinguishable, so that I can quickly identify display vs. interaction patterns.

#### Acceptance Criteria

1. WHEN creating a data flow edge for displaying data in JSX content, THE DFD Builder SHALL label the edge as "display"
2. WHEN creating a data flow edge for a function attribute reference, THE DFD Builder SHALL label the edge with the attribute name (e.g., "onClick", "onChange", "onCustomEvent")
3. WHEN creating a data flow edge for a data attribute reference, THE DFD Builder SHALL label the edge as "display"
4. WHEN creating a data flow edge from a condition to a subgraph, THE DFD Builder SHALL label the edge as "controls visibility"
5. WHEN creating a data flow edge from an array to a loop subgraph, THE DFD Builder SHALL label the edge as "iterates over"

### Requirement 9: Loop Rendering Support

**User Story:** As a developer analyzing components with list rendering, I want to see .map loops represented as subgraphs, so that I can understand how arrays are rendered.

#### Acceptance Criteria

1. WHEN the JSX Analyzer encounters a .map() call expression in JSX, THE JSX Analyzer SHALL create a loop subgraph labeled "{loop}"
2. WHEN a loop subgraph depends on an array Data Store, THE JSX Analyzer SHALL create a data flow edge from that Data Store to the loop subgraph
3. WHEN nested .map() calls have no intermediate JSX elements between them, THE JSX Analyzer SHALL merge the nested loops into a single "{loop}" subgraph
4. WHEN a loop body contains JSX elements with data dependencies, THE JSX Analyzer SHALL include those elements within the loop subgraph
5. WHEN a loop variable is used in JSX elements, THE JSX Analyzer SHALL track that as a data dependency within the loop scope

### Requirement 10: Empty Subgraph Elimination

**User Story:** As a developer viewing a DFD, I want to see only meaningful subgraphs, so that the diagram is not cluttered with empty or trivial sections.

#### Acceptance Criteria

1. WHEN a conditional branch contains no JSX elements with data dependencies, THE JSX Analyzer SHALL omit the subgraph for that branch
2. WHEN a JSX element has no data dependencies and is not within a conditional branch, THE JSX Analyzer SHALL omit that element from the output
3. WHEN all elements within a subgraph are filtered out, THE JSX Analyzer SHALL omit the entire subgraph
4. WHEN a top-level JSX element (like a wrapper div) has no data dependencies, THE JSX Analyzer SHALL omit that element but preserve its children
