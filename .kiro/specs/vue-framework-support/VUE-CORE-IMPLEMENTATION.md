# Vue Core Library Adapter Implementation

## Overview

This document describes the implementation of the Vue core library adapter for handling Vue 3's provide/inject pattern and custom composables.

## Implementation Details

### File Created

- `packages/analyzer/src/libraries/vue.ts` - Vue core library processor

### Features Implemented

1. **Provide Pattern Support**
   - Creates External Entity Output nodes for `provide()` calls
   - Tracks provided keys for dependency injection
   - Example: `provide('theme', theme)` → External Entity Output node

2. **Inject Pattern Support**
   - Creates External Entity Input nodes for `inject()` calls
   - Tracks injected values from ancestor components
   - Example: `const theme = inject('theme')` → External Entity Input node

3. **Custom Composables Support**
   - Handles composables matching the pattern `use[A-Z]\w+`
   - Separates data values from function values using type classification
   - Creates appropriate nodes based on return value types:
     - Data values → External Entity Input nodes (composable-data category)
     - Function values → External Entity Output nodes (composable-function category)
   - Falls back to treating all values as data when type classification is unavailable

### Processor Configuration

- **ID**: `vue`
- **Library Name**: `vue`
- **Package Patterns**: `['vue']`
- **Hook Names**: `['provide', 'inject', /^use[A-Z]\w+$/]`
- **Priority**: 90 (higher than custom hooks, lower than specific libraries)

### Integration

The processor is registered in `packages/analyzer/src/libraries/index.ts` and is automatically available through the global processor registry.

## Node Types Created

### Provide
- **Type**: `external-entity-output`
- **Category**: `provide-inject`
- **Metadata**: 
  - `isProvide: true`
  - `providedKeys: string[]`

### Inject
- **Type**: `external-entity-input`
- **Category**: `provide-inject`
- **Metadata**:
  - `isInject: true`
  - `variableName: string`

### Custom Composables (Data)
- **Type**: `external-entity-input`
- **Category**: `composable-data`
- **Metadata**:
  - `isCustomComposable: true`
  - `subgraph: '{hookName}-input'`

### Custom Composables (Functions)
- **Type**: `external-entity-output`
- **Category**: `composable-function`
- **Metadata**:
  - `isCustomComposable: true`
  - `subgraph: '{hookName}-output'`

## Testing

Two test scripts were created to verify the implementation:

1. **test-vue-core-processor.mjs** - Tests individual processor methods
   - Tests provide hook processing
   - Tests inject hook processing
   - Tests custom composable processing with type classification

2. **test-vue-core-registry.mjs** - Tests processor registration
   - Verifies processor is registered in the global registry
   - Tests processor lookup for provide, inject, and custom composables
   - Confirms correct priority ordering

### Test Results

All tests pass successfully:
- ✅ Provide creates External Entity Output nodes
- ✅ Inject creates External Entity Input nodes
- ✅ Custom composables separate data and function values
- ✅ Processor is registered with priority 90
- ✅ Processor is correctly found for all hook types

## Requirements Satisfied

This implementation satisfies the following requirements from the Vue Framework Support spec:

- **Requirement 4.4**: Provide/inject pattern support
  - Creates External Entity Input nodes for inject
  - Creates External Entity Output nodes for provide

- **Requirement 3.3**: Custom composables that return reactive values
  - Handles composables matching the `use[A-Z]\w+` pattern
  - Creates appropriate nodes based on return value types

- **Requirement 3.4**: Custom composable imports and usage
  - Detects custom composables through pattern matching
  - Creates Process nodes for custom composable calls

## Usage Example

```vue
<script setup lang="ts">
import { provide, inject } from 'vue';
import { useCounter } from './composables/useCounter';

// Provide a value to descendants
const theme = 'dark';
provide('theme', theme);

// Inject a value from ancestors
const userSettings = inject('userSettings');

// Use custom composable
const { count, increment, decrement } = useCounter();
</script>
```

This will generate:
- 1 External Entity Output node for `provide('theme', theme)`
- 1 External Entity Input node for `inject('userSettings')`
- 3 nodes for `useCounter()`:
  - 1 External Entity Input node for `count` (data)
  - 2 External Entity Output nodes for `increment` and `decrement` (functions)

## Next Steps

The Vue core library adapter is now complete and ready for integration with the Vue AST analyzer. The next task is to integrate the Vue analyzer with the DFD builder (Task 12).
