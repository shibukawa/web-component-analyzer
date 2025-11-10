# Requirements Document

## Introduction

This feature adds TypeScript type resolution capabilities to the web-component-analyzer extension. It enables accurate determination of whether props passed to custom components are functions or values by querying the TypeScript Language Server for type information.

## Glossary

- **Language Server**: The TypeScript Language Server that provides type information and code intelligence
- **Type Resolver**: The component that queries the Language Server for type information
- **Prop Type**: The TypeScript type of a component prop (function, string, number, object, etc.)
- **Custom Component**: A user-defined component in any framework (React, Vue, Svelte, etc.)
- **Type Query**: A request to the Language Server to get type information for a specific symbol
- **Framework-Agnostic**: Design that works across multiple frontend frameworks (React, Vue, Svelte, Lit, etc.)

## Requirements

### Requirement 1: Type Resolution Service

**User Story:** As a developer, I want the analyzer to accurately determine prop types using TypeScript's type system, so that function props are correctly identified in the DFD across all supported frameworks.

#### Acceptance Criteria

1. WHEN the analyzer encounters a prop passed to a custom component, THE Type Resolver SHALL query the TypeScript Language Server for the prop's type definition
2. WHEN the Language Server returns type information, THE Type Resolver SHALL parse the type to determine if it is a function type
3. IF the type is a function signature (arrow function, function type, or callable), THEN THE Type Resolver SHALL classify the prop as a function
4. IF the type is not a function signature, THEN THE Type Resolver SHALL classify the prop as a value
5. WHERE the Language Server is unavailable or returns an error, THE Type Resolver SHALL fall back to heuristic-based classification
6. THE Type Resolver SHALL work with React, Vue, Svelte, and other framework component definitions

### Requirement 2: VS Code API Integration

**User Story:** As a developer, I want the extension to use VS Code's built-in TypeScript support, so that type resolution works seamlessly without additional configuration.

#### Acceptance Criteria

1. THE Type Resolver SHALL use the VS Code `vscode.languages` API to access TypeScript language features
2. THE Type Resolver SHALL use `vscode.workspace.openTextDocument` to load source files for type queries
3. THE Type Resolver SHALL use `vscode.commands.executeCommand` with TypeScript commands to retrieve type information
4. WHEN a TypeScript project has a `tsconfig.json`, THE Type Resolver SHALL respect the project's TypeScript configuration
5. WHERE multiple TypeScript versions are available, THE Type Resolver SHALL use the workspace's configured TypeScript version

### Requirement 3: Function Type Detection

**User Story:** As a developer, I want all function-like types to be correctly identified, so that event handlers, callbacks, and render props are properly classified in the DFD.

#### Acceptance Criteria

1. WHEN a prop type is `() => void` or similar arrow function, THE Type Resolver SHALL classify it as a function
2. WHEN a prop type is `Function` or `(...args: any[]) => any`, THE Type Resolver SHALL classify it as a function
3. WHEN a prop type is a named function type like `MouseEventHandler`, THE Type Resolver SHALL classify it as a function
4. WHEN a prop type is a union including function types (e.g., `string | (() => void)`), THE Type Resolver SHALL classify it as a function
5. WHEN a prop type is an interface with a call signature, THE Type Resolver SHALL classify it as a function

### Requirement 4: Performance and Timeout Handling

**User Story:** As a developer, I want type resolution to complete quickly, so that analyzing components doesn't cause noticeable delays.

#### Acceptance Criteria

1. THE Type Resolver SHALL complete type queries within 2000ms per component analysis
2. WHEN a type query takes longer than 500ms, THE Type Resolver SHALL log a performance warning
3. THE Type Resolver SHALL limit concurrent Language Server queries to 5 simultaneous requests
4. WHERE type resolution takes longer than 2000ms, THE Type Resolver SHALL timeout and fall back to heuristic-based classification
5. THE Type Resolver SHALL batch multiple type queries for the same file when possible

### Requirement 5: Error Handling and Fallback

**User Story:** As a developer, I want the analyzer to continue working even when type information is unavailable, so that analysis doesn't fail on edge cases.

#### Acceptance Criteria

1. WHEN the Language Server is not available, THE Type Resolver SHALL fall back to heuristic-based classification
2. WHEN a type query fails or times out, THE Type Resolver SHALL log the error and use heuristic classification
3. WHEN analyzing JavaScript files without type annotations, THE Type Resolver SHALL use heuristic classification
4. THE Type Resolver SHALL provide a configuration option to disable Language Server integration and use only heuristics
5. WHEN type resolution fails, THE Type Resolver SHALL include a warning in the analysis results indicating reduced accuracy

### Requirement 6: Heuristic Fallback Strategy

**User Story:** As a developer, I want reasonable prop classification even without type information, so that the analyzer works on JavaScript projects and edge cases across all frameworks.

#### Acceptance Criteria

1. WHEN a prop name matches the pattern `on[A-Z].*` or `handle[A-Z].*`, THE Type Resolver SHALL classify it as a function
2. WHEN a prop is used with event attributes (onClick, onChange, @click, on:click, etc.) on native elements, THE Type Resolver SHALL classify it as a function
3. WHEN a prop value is an arrow function or function expression, THE Type Resolver SHALL classify it as a function
4. WHEN a prop name matches `set[A-Z].*`, `toggle[A-Z].*`, `increment`, `decrement`, `update[A-Z].*`, THE Type Resolver SHALL classify it as a function
5. WHERE none of the heuristic patterns match, THE Type Resolver SHALL classify the prop as a value

### Requirement 7: Framework-Specific Type Support

**User Story:** As a developer using various frontend frameworks, I want the type resolver to understand framework-specific patterns, so that state management and data flow are correctly analyzed.

#### Acceptance Criteria

1. WHEN analyzing Vue components with Pinia stores, THE Type Resolver SHALL recognize store actions as functions
2. WHEN analyzing Svelte components with stores, THE Type Resolver SHALL recognize store update functions
3. WHEN analyzing React components with custom hooks, THE Type Resolver SHALL recognize returned functions from hooks
4. THE Type Resolver SHALL support TypeScript definitions from popular state management libraries (Redux, Zustand, Jotai, Pinia, etc.)
5. WHERE framework-specific type definitions are unavailable, THE Type Resolver SHALL fall back to generic type resolution
