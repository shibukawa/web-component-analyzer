# Requirements Document

## Introduction

This specification defines the refactoring of the DFD builder to extract React-specific and third-party library hook processing logic into a pluggable processor architecture. Currently, special processing for hooks like `useContext`, `useReducer`, `useImperativeHandle`, custom hooks, and third-party libraries (SWR, Next.js) is hardcoded throughout the DFD builder, making it difficult to add new features without modifying core builder logic.

### Current Architecture Issues

The current system has several architectural problems:

1. **Hardcoded Special Processing**: React-specific logic (useContext, useReducer, useImperativeHandle) is embedded directly in dfd-builder.ts with conditional checks scattered throughout the code
2. **Dual Library Systems**: There are two separate systems for handling third-party libraries:
   - **Library Adapters** (JSON-based configuration in `library-adapters.json`) - defines return value mappings
   - **Library Handlers** (TypeScript classes like `SWRHookHandler`, `NextJSHookHandler`) - implements node/edge creation logic
3. **Tight Coupling**: The dfd-builder directly imports and uses library handlers, creating tight coupling
4. **Inconsistent Patterns**: React hooks use inline conditional logic while library hooks use handler classes
5. **Verbose Logging**: Debug logging is mixed with business logic, making the code hard to read
6. **Limited Extensibility**: Adding new hook types requires modifying multiple files (dfd-builder, hooks-analyzer, hook-registry)

### Goals

The goal is to create a unified, clean separation where:
- All special hook processing (React and third-party) uses the same processor architecture
- Processors can be registered and invoked without touching the main builder code
- Library adapters and handlers are unified into a single system
- Logging is clean, structured, and easy to trace during debugging

## Glossary

- **DFD Builder**: The core component that transforms ComponentAnalysis into Data Flow Diagram source data
- **Hook Processor**: A pluggable component that handles special processing for specific hook types
- **Component Analysis**: The analyzed structure of a React component including hooks, props, processes, and JSX
- **Library Handler**: Existing system for handling third-party library hooks (SWR, React Query, etc.)
- **Special Processing**: Custom logic for specific hook types that differs from standard hook handling
- **Processor Registry**: A central registry that manages and dispatches to appropriate hook processors

## Requirements

### Requirement 1: Pluggable Hook Processor Architecture

**User Story:** As a developer, I want to add support for new React hooks or third-party libraries without modifying the core DFD builder, so that the codebase remains maintainable and extensible.

#### Acceptance Criteria

1. WHEN a new hook type requires special processing, THE System SHALL allow registration of a processor without modifying dfd-builder.ts
2. WHEN the DFD builder encounters a hook, THE System SHALL delegate to the appropriate processor based on hook type
3. WHEN no specific processor is registered for a hook, THE System SHALL fall back to default processing
4. WHERE a processor is registered, THE System SHALL invoke the processor with complete hook information and builder context
5. WHEN multiple processors could handle a hook, THE System SHALL select the most specific processor based on priority rules

### Requirement 2: Extract React-Specific Hook Processing

**User Story:** As a developer, I want React-specific hook logic (useContext, useReducer, useImperativeHandle) separated from the core builder, so that React-specific concerns are isolated and the builder can potentially support other frameworks.

#### Acceptance Criteria

1. WHEN processing useContext hooks, THE System SHALL delegate to a dedicated UseContextProcessor
2. WHEN processing useReducer hooks, THE System SHALL delegate to a dedicated UseReducerProcessor
3. WHEN processing useImperativeHandle hooks, THE System SHALL delegate to a dedicated UseImperativeHandleProcessor
4. WHEN processing custom hooks, THE System SHALL delegate to a dedicated CustomHookProcessor
5. THE System SHALL remove all React-specific conditional logic from the main DFD builder class

### Requirement 3: Unified Third-Party Library Processing

**User Story:** As a developer, I want third-party library hooks (SWR, React Query, Next.js) to use the same processor architecture as React hooks, so that all special processing follows a consistent pattern.

#### Acceptance Criteria

1. WHEN processing library hooks with adapters, THE System SHALL use the processor architecture instead of inline conditional logic
2. WHEN a library hook is encountered, THE System SHALL delegate to a LibraryHookProcessor
3. THE System SHALL merge the dual library adapter/handler system into a unified processor-based approach
4. THE System SHALL maintain backward compatibility with existing library adapter JSON configurations
5. THE System SHALL remove hardcoded library-specific logic from the main builder
6. THE System SHALL allow library adapters to optionally specify custom processor classes for complex behavior

### Requirement 3.1: Self-Contained Processor Modules

**User Story:** As a developer, I want each processor to be a self-contained module with its configuration and logic in one place, so that I can understand and modify hook behavior without hunting through multiple files.

#### Acceptance Criteria

1. WHEN creating a processor, THE System SHALL allow configuration (hook names, return patterns) and implementation (node/edge creation) in the same file
2. THE System SHALL eliminate the need for separate JSON configuration files for library adapters
3. THE System SHALL support both simple declarative processors (for basic hooks) and complex imperative processors (for hooks with special logic)
4. WHEN a processor is imported, THE System SHALL make it immediately available after registration
5. THE System SHALL provide clear migration path from current JSON adapters + handler classes to unified processor modules

### Requirement 4: Clean Logging and Debugging

**User Story:** As a developer debugging DFD generation, I want clear logging that shows which processors are invoked and what they produce, so that I can quickly trace issues to specific processors.

#### Acceptance Criteria

1. WHEN a processor is invoked, THE System SHALL log the processor name and hook being processed
2. WHEN a processor creates nodes or edges, THE System SHALL log the count and types of elements created
3. WHEN a processor completes, THE System SHALL log a summary of its actions
4. THE System SHALL use consistent log prefixes for each processor type
5. THE System SHALL remove verbose legacy logging from the main builder
6. WHEN debugging is enabled, THE System SHALL provide detailed processor execution traces

### Requirement 5: Processor Interface Contract

**User Story:** As a developer creating a new processor, I want a clear interface contract that defines what inputs I receive and what outputs I must produce, so that I can implement processors correctly.

#### Acceptance Criteria

1. THE System SHALL define a HookProcessor interface with required methods
2. WHEN a processor is invoked, THE System SHALL provide hook information, component analysis, and builder utilities
3. WHEN a processor completes, THE System SHALL return created nodes, edges, and any subgraphs
4. THE System SHALL validate processor outputs before integrating them into the DFD
5. THE System SHALL provide utility functions for common processor operations (node ID generation, node lookup, edge creation)

### Requirement 6: Processor Registration and Discovery

**User Story:** As a developer, I want processors to be self-contained modules that I can import and register, so that adding new hook support is as simple as creating a processor file and registering it.

#### Acceptance Criteria

1. WHEN a processor module is created, THE System SHALL allow it to contain both configuration and implementation logic
2. WHEN a processor is imported, THE System SHALL provide a simple registration API to activate it
3. THE System SHALL support multiple processors for the same hook type with different priorities
4. THE System SHALL allow processors to declare which hooks they handle through metadata
5. THE System SHALL validate processor registrations to prevent conflicts
6. WHEN adding a new library, THE System SHALL require only creating a processor file and adding one registration call

### Requirement 7: Backward Compatibility

**User Story:** As a user of the DFD analyzer, I want the refactoring to maintain existing functionality, so that my existing components continue to generate correct DFDs.

#### Acceptance Criteria

1. WHEN processing any existing test component, THE System SHALL produce identical DFD output before and after refactoring
2. THE System SHALL maintain all existing node types and metadata structures
3. THE System SHALL maintain all existing edge types and labels
4. THE System SHALL maintain all existing subgraph structures
5. THE System SHALL pass all existing unit tests without modification

### Requirement 8: Performance Considerations

**User Story:** As a user analyzing large components, I want the processor architecture to have minimal performance overhead, so that DFD generation remains fast.

#### Acceptance Criteria

1. WHEN selecting a processor, THE System SHALL use efficient lookup mechanisms (O(1) or O(log n))
2. THE System SHALL cache processor instances to avoid repeated instantiation
3. THE System SHALL avoid unnecessary processor invocations for hooks that don't need special processing
4. WHEN processing multiple hooks, THE System SHALL batch operations where possible
5. THE System SHALL maintain or improve current DFD generation performance
