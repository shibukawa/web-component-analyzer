# Requirements Document

## Introduction

This feature adds Vue 3 framework support to the web-component-analyzer extension, focusing specifically on the script setup syntax. The system will parse Vue Single File Components (SFC) and generate Data Flow Diagrams (DFD) that visualize component structure, including props, reactive state, computed properties, composables, lifecycle hooks, and template rendering. The implementation will also support popular Vue 3 ecosystem libraries including Pinia for state management and Vue Router for routing.

## Glossary

- **Parser**: The component that analyzes Vue SFC source code and extracts structural information
- **DFD**: Data Flow Diagram - a visual representation of data movement through a component
- **SFC**: Single File Component - Vue's file format containing template, script, and style sections
- **Script Setup**: Vue 3 syntactic sugar for Composition API using <script setup> tag
- **Composition API**: Vue 3 component definition style using reactive primitives (ref, reactive, computed)
- **Analyzer**: The system component that processes parsed AST to identify Vue-specific patterns
- **External Entity Input**: DFD element representing data entering the component (props, inject, route params)
- **External Entity Output**: DFD element representing data leaving the component (template rendering, emits, provide)
- **Data Store**: DFD element representing internal state (data, ref, reactive, computed)
- **Process**: DFD element representing transformations (methods, functions, watchers, lifecycle hooks)

## Requirements

### Requirement 1

**User Story:** As a developer using Vue 3 with script setup, I want the analyzer to parse Vue SFC files, so that I can visualize my Vue components in the same way React components are visualized

#### Acceptance Criteria

1. WHEN a Vue SFC file with .vue extension is opened, THE Parser SHALL extract the <script setup> section content
2. WHEN the script setup section uses TypeScript, THE Parser SHALL parse it using the SWC TypeScript parser
3. WHEN the script setup section uses JavaScript, THE Parser SHALL parse it using the SWC JavaScript parser
4. THE Parser SHALL extract the template section for template analysis
5. THE Parser SHALL identify top-level bindings as component exports available to the template

### Requirement 2

**User Story:** As a developer using Vue 3 script setup, I want the analyzer to detect my component's props, reactive state, computed properties, and functions, so that I can see how data flows through my component

#### Acceptance Criteria

1. WHEN a component uses defineProps(), THE Analyzer SHALL create External Entity Input nodes for each prop with correct data types
2. WHEN a component uses defineProps with TypeScript generic syntax, THE Analyzer SHALL extract prop types from the type parameter
3. WHEN a component uses ref() or reactive(), THE Analyzer SHALL create Data Store nodes for each reactive variable
4. WHEN a component uses computed(), THE Analyzer SHALL create Data Store nodes with type "computed"
5. WHEN a component defines functions, THE Analyzer SHALL create Process nodes for each function

### Requirement 3

**User Story:** As a developer using Vue 3 composables, I want the analyzer to detect my composable usage and lifecycle hooks, so that I can understand my component's reactive data flow

#### Acceptance Criteria

1. WHEN a component calls composables (functions starting with "use"), THE Analyzer SHALL create Process nodes for composable calls
2. WHEN a component uses onMounted, onUpdated, or other lifecycle hooks, THE Analyzer SHALL create Process nodes for each hook
3. WHEN a composable returns reactive values, THE Analyzer SHALL create Data Store nodes for returned values
4. WHEN a component imports and uses custom composables, THE Analyzer SHALL create Process nodes for custom composable calls
5. WHEN lifecycle hooks access reactive data, THE Analyzer SHALL create data flows from data stores to lifecycle processes

### Requirement 4

**User Story:** As a developer, I want the analyzer to detect Vue-specific patterns like watchers and emits, so that I can see reactive dependencies and component communication

#### Acceptance Criteria

1. WHEN a component uses watch or watchEffect, THE Analyzer SHALL create Process nodes with type "watcher"
2. WHEN a component uses defineEmits(), THE Analyzer SHALL create External Entity Output nodes for each emit
3. WHEN a component calls emit functions, THE Analyzer SHALL create data flows from the triggering process to the emit output
4. WHEN a component uses provide/inject, THE Analyzer SHALL create appropriate External Entity Input nodes for inject and External Entity Output nodes for provide
5. WHEN a watcher depends on reactive data, THE Analyzer SHALL create data flows from the watched data store to the watcher process

### Requirement 5

**User Story:** As a developer, I want the analyzer to parse Vue templates and detect data bindings, so that I can see how my data is rendered in the UI

#### Acceptance Criteria

1. WHEN a template uses mustache syntax {{ variable }}, THE Analyzer SHALL create External Entity Output nodes with type "template"
2. WHEN a template uses v-bind or : directive, THE Analyzer SHALL create data flows from the bound data to template output
3. WHEN a template uses v-on or @ directive, THE Analyzer SHALL create data flows from template to event handler processes
4. WHEN a template uses v-model, THE Analyzer SHALL create bidirectional data flows between data store and template
5. WHEN a template uses v-if, v-for, or v-show, THE Analyzer SHALL create data flows from conditional data to template output

### Requirement 6

**User Story:** As a developer, I want acceptance tests for Vue components, so that I can verify the parser correctly handles Vue patterns

#### Acceptance Criteria

1. THE system SHALL support .mmd reference files for Vue components in the examples/vue-vite directory
2. WHEN acceptance tests run, THE system SHALL compare generated DFD output against .mmd reference files
3. THE system SHALL provide test coverage for script setup patterns (defineProps, ref, reactive, computed, functions)
4. THE system SHALL provide test coverage for composables and lifecycle hooks
5. THE system SHALL provide test coverage for Vue-specific features (watchers, emits, provide/inject, template directives)

### Requirement 7

**User Story:** As a developer, I want the Vue parser to integrate with the existing analyzer architecture, so that Vue components work seamlessly with the extension

#### Acceptance Criteria

1. THE Parser SHALL use the same DFD output format as the React parser
2. THE Parser SHALL register with the analyzer's framework detection system
3. WHEN a .vue file is analyzed, THE system SHALL automatically select the Vue parser
4. THE Parser SHALL reuse existing type classification and data flow logic where applicable
5. THE Parser SHALL output DFD structures compatible with the Mermaid transformer

### Requirement 8

**User Story:** As a developer using Vue Router, I want the analyzer to detect routing composables and navigation, so that I can see how my component interacts with the router

#### Acceptance Criteria

1. WHEN a component uses useRoute composable, THE Analyzer SHALL create External Entity Input nodes for route params and query
2. WHEN a component uses useRouter composable, THE Analyzer SHALL create library hook nodes for router access
3. WHEN a component calls router.push or router.replace, THE Analyzer SHALL create data flows from the calling process to router navigation
4. WHEN a component accesses route.params or route.query, THE Analyzer SHALL create data flows from route input to consuming processes
5. WHEN a component uses onBeforeRouteUpdate or onBeforeRouteLeave, THE Analyzer SHALL create Process nodes for navigation guards

### Requirement 9

**User Story:** As a developer using Pinia, I want the analyzer to detect store usage and state access, so that I can see how my component interacts with global state

#### Acceptance Criteria

1. WHEN a component uses useStore composable from Pinia, THE Analyzer SHALL create library hook nodes for store access
2. WHEN a component accesses store state properties, THE Analyzer SHALL create External Entity Input nodes for each accessed state property
3. WHEN a component accesses store getters, THE Analyzer SHALL create External Entity Input nodes with type "computed" for each getter
4. WHEN a component calls store actions, THE Analyzer SHALL create Process nodes for action calls
5. WHEN a component uses storeToRefs, THE Analyzer SHALL create data flows from store state to local reactive references
