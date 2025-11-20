# Change Log

All notable changes to the "web-component-analyzer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

#### Vue 3 Framework Support
- **Vue 3 Composition API**: Full support for `<script setup>` syntax with TypeScript and JavaScript
- **Props Analysis**: Detect `defineProps()` with TypeScript generic and object syntax
- **Reactive State**: Analyze `ref()`, `reactive()`, and `computed()` declarations
- **Composables**: Detect composable usage (functions starting with "use")
- **Lifecycle Hooks**: Support for `onMounted`, `onUpdated`, `onUnmounted`, and other lifecycle hooks
- **Event Emits**: Analyze `defineEmits()` and track emit calls
- **Watchers**: Detect `watch()` and `watchEffect()` patterns
- **Template Analysis**: Parse Vue templates and extract data bindings
  - Mustache syntax `{{ variable }}`
  - `v-bind` / `:` directive bindings
  - `v-on` / `@` event bindings
  - `v-model` two-way binding
  - `v-if`, `v-show`, `v-for` conditional and list rendering

#### Vue Ecosystem Libraries
- **Vue Router**: Support for `useRoute()`, `useRouter()`, and navigation guards
- **Pinia**: Support for `useStore()`, `storeToRefs()`, and store actions
- **Provide/Inject**: Detect Vue's dependency injection pattern

#### Documentation
- Added comprehensive [Vue 3 Support Guide](docs/vue-support.md)
- Updated README with Vue support information
- Added Vue example components with acceptance tests

#### Testing
- Added 5 Vue acceptance test components (006-010)
- Implemented Mermaid-based acceptance testing for Vue components
- Added Vue-specific error handling and validation

### Changed
- Extended framework detection to recognize `.vue` files
- Updated DFD builder to handle Vue-specific node types
- Enhanced type resolver to work with Vue SFC structure

### Technical Details
- **Parser**: `vue-sfc-parser.ts` for extracting script setup and template sections
- **Analyzer**: `vue-ast-analyzer.ts` implementing Vue-specific AST analysis
- **Specialized Analyzers**: 
  - `vue-props-analyzer.ts` for props detection
  - `vue-state-analyzer.ts` for reactive state
  - `vue-composables-analyzer.ts` for composables and lifecycle
  - `vue-emits-analyzer.ts` for event emits
  - `vue-template-analyzer.ts` for template directives
- **Library Adapters**: 
  - `vue-router.ts` for routing integration
  - `pinia.ts` for state management
  - `vue.ts` for core Vue patterns

## [0.1.0] - Initial Release

### Added
- Initial release with React support
- Data Flow Diagram (DFD) visualization
- VS Code extension with webview panel
- Web playground application
- Support for React hooks and third-party libraries