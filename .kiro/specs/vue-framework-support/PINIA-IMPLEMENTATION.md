# Pinia Library Processor Implementation

## Overview

The Pinia library processor has been implemented to support Pinia state management in Vue 3 components. This processor handles Pinia store composables and creates appropriate DFD nodes and edges.

## Implementation Details

### File Location
- `packages/analyzer/src/libraries/pinia.ts`

### Supported Patterns

#### 1. useXxxStore Pattern
The processor detects Pinia store composables that follow the `useXxxStore` naming pattern:

```vue
<script setup>
const store = useCounterStore();
const userStore = useUserStore();
</script>
```

**DFD Output:**
- Creates an `external-entity-input` node for the store
- Classifies destructured properties as either:
  - **Data properties** (state/getters): Variables that don't look like actions
  - **Process properties** (actions): Variables that look like actions (e.g., `increment`, `fetchData`)

#### 2. Property Classification
The processor uses heuristic-based classification to determine if a property is data or an action:
- Properties with action-like names (e.g., `increment`, `fetch`, `update`) → Process properties
- Other properties → Data properties (state/getters)

### Node Structure

```typescript
{
  id: 'library_hook_X',
  label: 'useCounterStore',
  type: 'external-entity-input',
  metadata: {
    category: 'library-hook',
    hookName: 'useCounterStore',
    libraryName: 'pinia',
    isLibraryHook: true,
    isPiniaStore: true,
    properties: ['store'],
    dataProperties: [],      // State and getters
    processProperties: [],   // Actions
    propertyMetadata: { ... }
  }
}
```

### Registration
The processor is registered in `packages/analyzer/src/libraries/index.ts` with:
- **Priority**: 80 (higher than custom hooks, lower than specific libraries)
- **Package patterns**: `['pinia']`
- **Hook names**: `/^use\w+Store$/`, `'storeToRefs'`

## Known Limitations

### storeToRefs Detection
The `storeToRefs` function is currently **not detected** by the composables analyzer because:

1. The Vue composables analyzer only detects functions starting with "use"
2. `storeToRefs` doesn't follow this pattern
3. It's a utility function, not a composable

**Example that won't be fully processed:**
```vue
<script setup>
const store = useCounterStore();
const { count, doubleCount } = storeToRefs(store);  // Not detected
</script>
```

**Workaround:**
The store itself is still detected, and the destructured properties from `storeToRefs` will be treated as local variables in the template analysis.

**Future Enhancement:**
To fully support `storeToRefs`, the Vue composables analyzer would need to be extended to detect additional Pinia-specific functions beyond the "use" prefix pattern.

## Testing

A test script has been created at `test-pinia-processor.mjs` to verify the processor functionality:

```bash
node test-pinia-processor.mjs
```

**Test Results:**
- ✅ Detects `useXxxStore` pattern
- ✅ Creates external-entity-input node
- ✅ Classifies properties correctly
- ✅ Registers with processor registry
- ⚠️ `storeToRefs` not detected (known limitation)

## Example Usage

### Input Vue Component
```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script setup lang="ts">
import { useCounterStore } from './stores/counter';

const store = useCounterStore();

function increment() {
  store.increment();
}
</script>
```

### DFD Output
- **Node**: `useCounterStore` (external-entity-input)
  - Library: pinia
  - Properties: `['store']`
- **Edge**: From `useCounterStore` to template output for `store` usage

## Requirements Coverage

| Requirement | Status | Notes |
|------------|--------|-------|
| 9.1: Detect useStore pattern | ✅ Complete | Detects `useXxxStore` pattern |
| 9.2: Create library hook nodes | ✅ Complete | Creates external-entity-input nodes |
| 9.3: Create input nodes for state | ✅ Complete | Via dataProperties metadata |
| 9.4: Create input nodes for getters | ✅ Complete | Via dataProperties metadata |
| 9.5: Create process nodes for actions | ✅ Complete | Via processProperties metadata |
| 9.6: Handle storeToRefs | ⚠️ Partial | Processor exists but not detected by analyzer |

## Future Improvements

1. **Extend Composables Analyzer**: Add support for detecting non-"use" functions like `storeToRefs`
2. **Type-based Classification**: Use TypeScript type information to better classify state vs actions
3. **Store Definition Analysis**: Analyze Pinia store definitions to extract exact state/getter/action lists
4. **Data Flow Tracking**: Create explicit edges for `storeToRefs` conversions
