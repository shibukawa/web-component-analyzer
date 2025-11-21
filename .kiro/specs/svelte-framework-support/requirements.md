# Requirements Document

## Introduction

This feature adds Svelte 5 framework support to the web-component-analyzer extension, focusing specifically on the new runes API. The system will parse Svelte Single File Components (SFC) and generate Data Flow Diagrams (DFD) that visualize component structure, including props, reactive state, computed values, stores, lifecycle hooks, and template rendering. The implementation will maximize code reuse from the existing Vue parser infrastructure and share common parsing logic where applicable.

## Glossary

- **Parser**: The component that analyzes Svelte SFC source code and extracts structural information
- **DFD**: Data Flow Diagram - a visual representation of data movement through a component
- **SFC**: Single File Component - Svelte's file format containing script, markup, and style sections
- **Runes**: Svelte 5's new reactive primitives ($state, $derived, $effect, $props)
- **Analyzer**: The system component that processes parsed AST to identify Svelte-specific patterns
- **Shared Parser Infrastructure**: Common code reused from Vue parser for SFC extraction and AST analysis
- **External Entity Input**: DFD element representing data entering the component (props, context, store subscriptions)
- **External Entity Output**: DFD element representing data leaving the component (markup rendering, events, store updates)
- **Data Store**: DFD element representing internal state (let variables, reactive declarations)
- **Process**: DFD element representing transformations (functions, reactive statements, lifecycle hooks)
- **Store**: Svelte's reactive state management primitive (writable, readable, derived)

## Requirements

### Requirement 1

**User Story:** As a developer using Svelte 5, I want the analyzer to parse Svelte SFC files, so that I can visualize my Svelte components in the same way React and Vue components are visualized

#### Acceptance Criteria

1. WHEN a Svelte SFC file with .svelte extension is opened, THE Parser SHALL extract the <script> section content using shared SFC extraction logic from Vue parser
2. WHEN the script section uses TypeScript (lang="ts"), THE Parser SHALL parse it using the SWC TypeScript parser
3. WHEN the script section uses JavaScript, THE Parser SHALL parse it using the SWC JavaScript parser
4. THE Parser SHALL extract the markup section for template analysis using shared template extraction logic
5. THE Parser SHALL reuse Vue's AST traversal infrastructure where applicable

### Requirement 2

**User Story:** As a developer using Svelte 5 runes, I want the analyzer to detect my component's props, reactive state, and computed values, so that I can see how data flows through my component

#### Acceptance Criteria

1. WHEN a component uses $props() rune, THE Analyzer SHALL create External Entity Input nodes for each prop with correct data types
2. WHEN a component uses $state() rune, THE Analyzer SHALL create Data Store nodes for each reactive state variable
3. WHEN a component uses $derived() rune, THE Analyzer SHALL create Data Store nodes with type "computed"
4. WHEN a component uses $effect() rune, THE Analyzer SHALL create Process nodes for reactive side effects
5. WHEN a component defines functions, THE Analyzer SHALL create Process nodes for each function

### Requirement 3

**User Story:** As a developer using Svelte 5 stores, I want the analyzer to detect my store subscriptions and updates, so that I can understand my component's reactive data flow

#### Acceptance Criteria

1. WHEN a component imports from 'svelte/store', THE Analyzer SHALL detect store usage using shared library detection logic
2. WHEN a component uses $store auto-subscription syntax, THE Analyzer SHALL create External Entity Input nodes for store subscriptions
3. WHEN a component calls store.set() or store.update(), THE Analyzer SHALL create data flows from the calling process to store output
4. WHEN a component uses derived stores, THE Analyzer SHALL create Data Store nodes with type "derived"
5. WHEN a component creates local stores with writable() or readable(), THE Analyzer SHALL create Data Store nodes for local stores

### Requirement 4

**User Story:** As a developer using Svelte 5, I want the analyzer to detect lifecycle patterns and event dispatching, so that I can see component lifecycle and communication

#### Acceptance Criteria

1. WHEN a component uses $effect() rune for lifecycle behavior, THE Analyzer SHALL create Process nodes for effects
2. WHEN a component uses onMount or onDestroy (legacy support), THE Analyzer SHALL create Process nodes for each lifecycle hook
3. WHEN a component uses createEventDispatcher, THE Analyzer SHALL create External Entity Output nodes for dispatched events
4. WHEN a component calls dispatch(), THE Analyzer SHALL create data flows from the triggering process to the event output
5. WHEN effects access reactive data, THE Analyzer SHALL create data flows from data stores to effect processes

### Requirement 5

**User Story:** As a developer, I want the analyzer to parse Svelte markup and detect data bindings, so that I can see how my data is rendered in the UI

#### Acceptance Criteria

1. WHEN markup uses curly brace syntax {variable}, THE Analyzer SHALL create External Entity Output nodes with type "template"
2. WHEN markup uses bind: directive, THE Analyzer SHALL create bidirectional data flows between data store and template
3. WHEN markup uses on: directive, THE Analyzer SHALL create data flows from template to event handler processes
4. WHEN markup uses class: or style: directives, THE Analyzer SHALL create data flows from bound data to template output
5. WHEN markup uses {#if}, {#each}, or {#await} blocks, THE Analyzer SHALL create data flows from conditional data to template output

### Requirement 6

**User Story:** As a developer, I want acceptance tests for Svelte components, so that I can verify the parser correctly handles Svelte patterns

#### Acceptance Criteria

1. THE system SHALL support .mmd reference files for Svelte components in the examples/svelte-vite directory
2. WHEN acceptance tests run, THE system SHALL compare generated DFD output against .mmd reference files
3. THE system SHALL provide test coverage for basic patterns (export let props, let state, reactive declarations, functions)
4. THE system SHALL provide test coverage for stores and lifecycle hooks
5. THE system SHALL provide test coverage for Svelte-specific features (event dispatching, context, markup directives)

### Requirement 7

**User Story:** As a developer, I want the Svelte parser to integrate with the existing analyzer architecture and maximize code reuse, so that Svelte components work seamlessly with the extension

#### Acceptance Criteria

1. THE Parser SHALL use the same DFD output format as the React and Vue parsers
2. THE Parser SHALL register with the analyzer's framework detection system
3. WHEN a .svelte file is analyzed, THE system SHALL automatically select the Svelte parser
4. THE Parser SHALL reuse Vue's SFC extraction logic by creating a shared SFC parser utility
5. THE Parser SHALL reuse existing type classification, data flow logic, and library detection infrastructure
6. THE Parser SHALL output DFD structures compatible with the Mermaid transformer

### Requirement 8

**User Story:** As a developer using SvelteKit, I want the analyzer to detect routing and navigation patterns, so that I can see how my component interacts with the router

#### Acceptance Criteria

1. WHEN a component imports from '$app/stores', THE Analyzer SHALL detect SvelteKit store usage
2. WHEN a component uses $page store, THE Analyzer SHALL create External Entity Input nodes for page data, params, and url
3. WHEN a component uses goto() from '$app/navigation', THE Analyzer SHALL create data flows from the calling process to navigation output
4. WHEN a component uses beforeNavigate or afterNavigate, THE Analyzer SHALL create Process nodes for navigation lifecycle hooks
5. WHEN a component accesses $page.params or $page.url, THE Analyzer SHALL create data flows from page input to consuming processes

### Requirement 9

**User Story:** As a developer using custom stores, I want the analyzer to detect store patterns and subscriptions, so that I can see how my component interacts with application state

#### Acceptance Criteria

1. WHEN a component imports stores from local files, THE Analyzer SHALL detect custom store usage
2. WHEN a component uses $customStore auto-subscription, THE Analyzer SHALL create External Entity Input nodes for each subscribed store
3. WHEN a component manually subscribes with store.subscribe(), THE Analyzer SHALL create data flows from store to subscription callback
4. WHEN a component creates derived stores with derived(), THE Analyzer SHALL create Data Store nodes showing derivation dependencies
5. WHEN a component updates stores, THE Analyzer SHALL create data flows from the updating process to store output
