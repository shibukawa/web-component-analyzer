# Requirements Document

## Introduction

This feature enhances the analyzer's ability to detect functions that cannot be identified through TypeScript type inference alone. By analyzing JSX event handler usage patterns (onClick, onChange, etc.), the analyzer will correctly classify variables as functions and generate accurate data flow diagrams showing the proper direction: from JSX elements to event handlers, rather than incorrectly showing data binding from handlers to elements.

## Glossary

- **Analyzer**: The web-component-analyzer system that parses component code and generates DFD
- **Event Handler Attribute**: JSX attributes that handle events (e.g., onClick, onChange, onSubmit)
- **Function Variable**: A variable that holds a function reference but may not be typed as a function in TypeScript
- **Data Flow Direction**: The direction of data flow in the DFD, showing which element triggers which process
- **Type Classifier**: The service responsible for determining whether a variable is a function or data
- **DFD Builder**: The component that constructs data flow diagram nodes and edges

## Requirements

### Requirement 1

**User Story:** As a developer analyzing components with dynamically typed functions, I want the analyzer to detect functions used in event handlers, so that the DFD shows correct data flow direction from UI elements to event handlers.

#### Acceptance Criteria

1. WHEN a variable is referenced in an event handler attribute (onClick, onChange, etc.), THE Analyzer SHALL classify that variable as a function
2. WHEN a variable is called within an arrow function in an event handler attribute, THE Analyzer SHALL classify that variable as a function
3. WHEN a function variable is detected through event handler usage, THE DFD Builder SHALL create a data flow edge from the JSX element to the function process
4. THE Analyzer SHALL NOT create incorrect binding edges from function variables to JSX elements

### Requirement 2

**User Story:** As a developer using Zustand or other state management libraries, I want functions from store selectors to be correctly identified, so that event handlers show proper data flow in the DFD.

#### Acceptance Criteria

1. WHEN a function is obtained from a Zustand selector or similar store, THE Analyzer SHALL detect its usage in event handlers
2. WHEN the function type cannot be inferred from TypeScript types, THE Analyzer SHALL use event handler usage as a classification signal
3. THE Analyzer SHALL support common event handler patterns including direct reference (onClick={f}) and arrow function wrappers (onClick={() => f()})

### Requirement 3

**User Story:** As a developer reviewing DFD output, I want to see accurate data flow direction for event handlers, so that I can understand which UI elements trigger which processes.

#### Acceptance Criteria

1. THE DFD Builder SHALL create edges with format: JSX_element --[eventName: functionName]--> process_node
2. THE DFD Builder SHALL NOT create edges with format: process_node --[binds]--> JSX_element for event handler functions
3. WHEN multiple event handlers reference the same function, THE DFD Builder SHALL create separate edges for each event handler usage
4. THE DFD Builder SHALL include the event name (onClick, onChange, etc.) in the edge label

### Requirement 4

**User Story:** As a developer maintaining the analyzer codebase, I want event handler function detection to integrate with existing type classification logic, so that the system remains maintainable and consistent.

#### Acceptance Criteria

1. THE Type Classifier SHALL accept event handler usage information as input for classification decisions
2. THE Type Classifier SHALL prioritize event handler usage signals when TypeScript type inference is unavailable
3. THE Analyzer SHALL collect event handler usage information during JSX analysis phase
4. THE Analyzer SHALL pass event handler usage information to the Type Classifier before DFD construction

### Requirement 5

**User Story:** As a developer maintaining the analyzer codebase, I want to reduce reliance on name-based heuristic function detection, so that the system is more robust and less prone to false positives.

#### Acceptance Criteria

1. WHEN event handler-based function detection is implemented, THE Analyzer SHALL support a configuration option to disable name-based heuristic detection
2. WHEN name-based heuristics are disabled, THE Analyzer SHALL run all acceptance tests to verify output consistency
3. IF acceptance test results are identical with and without name-based heuristics, THEN THE Analyzer SHALL remove the name-based heuristic detection logic from the codebase
4. THE Analyzer SHALL document which heuristic patterns were replaced by event handler-based detection
