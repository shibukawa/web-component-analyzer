# Vue Advanced Acceptance Test Components

This directory contains advanced Vue 3 acceptance test components that validate the parser's ability to handle complex Vue patterns.

## Test Components

### 006-Emits.vue
Tests `defineEmits()` functionality:
- Multiple emit definitions with different signatures
- Emit calls from event handlers
- State updates triggering emits
- Template event bindings

**Key Patterns:**
- `defineEmits<{ ... }>()` with TypeScript generics
- `emit('eventName', payload)` calls
- Event handler functions that emit events

### 007-VueRouter.vue
Tests Vue Router integration:
- `useRoute()` for accessing route parameters and query
- `useRouter()` for programmatic navigation
- Navigation guard hooks (`onBeforeRouteUpdate`, `onBeforeRouteLeave`)
- Route parameter and query access in template

**Key Patterns:**
- `route.params`, `route.query`, `route.path` access
- `router.push()`, `router.back()` navigation
- Navigation guard lifecycle hooks

### 008-Pinia.vue
Tests Pinia store integration:
- Multiple store usage (`useCounterStore`, `useUserStore`)
- `storeToRefs()` for reactive state extraction
- Store action calls
- Store state and getter access

**Key Patterns:**
- `useXxxStore()` composable pattern
- `storeToRefs()` for state destructuring
- Store action method calls
- Store state and getter bindings in template

### 009-TemplateBindings.vue
Tests comprehensive template directive support:
- Mustache syntax `{{ variable }}`
- `v-bind` / `:` attribute bindings
- `v-on` / `@` event bindings
- `v-model` two-way binding
- `v-if`, `v-show` conditional rendering
- `v-for` list rendering

**Key Patterns:**
- All major Vue template directives
- Computed properties in template
- Event handler bindings
- Bidirectional data flow with v-model

### 010-Watchers.vue
Tests Vue watchers and reactive effects:
- `watch()` with single ref
- `watch()` with multiple refs
- `watch()` with getter function
- `watchEffect()` for automatic dependency tracking
- `watchEffect()` with cleanup function

**Key Patterns:**
- Different watch signatures
- Watcher callbacks modifying state
- Automatic dependency tracking
- Cleanup logic in watchers

### 011-ControlStructures.vue
Tests Vue control structures with subgraphs:
- `v-if` / `v-else-if` / `v-else` conditional rendering chains
- `v-for` list rendering with arrays
- `v-for` with computed properties (flattened matrix)
- Combined `v-if` and `v-for` (filtered lists)
- Multiple conditional branches showing different states

**Key Patterns:**
- Conditional rendering subgraphs for v-if/v-else-if/v-else
- Loop iteration subgraphs for v-for
- Data flows from state to conditional subgraphs
- Data flows from arrays to loop subgraphs
- Event handlers modifying state that controls visibility
- Computed properties used in v-for loops

## Expected DFD Elements

Each test component has a corresponding `.mmd` file that defines the expected Mermaid diagram output. The diagrams should include:

1. **External Entity Inputs**: Props, route params, store state
2. **Data Stores**: `ref()`, `reactive()`, `computed()` state
3. **Processes**: Event handlers, watchers, lifecycle hooks, store actions
4. **External Entity Outputs**: Template rendering, emits
5. **Data Flows**: Connections between all elements

## Running Tests

```bash
# Run all Vue acceptance tests
npm run test -- --grep "vue"

# Run specific test
npm run test -- --grep "006-Emits"

# Update reference files when output is correct
npm run test -- --update-refs
```

## Test Development Workflow

1. Create component with Vue patterns to test
2. Generate initial `.mmd` file with expected DFD structure
3. Run tests to see parser output
4. Iterate on parser implementation
5. Update `.mmd` file when output is correct

## Notes

- These tests focus on advanced Vue 3 patterns and ecosystem libraries
- All components use `<script setup>` syntax
- TypeScript is used for type safety
- Tests are designed to be minimal and focused on specific patterns
