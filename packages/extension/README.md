# Web Component Analyzer - VS Code Extension

VS Code extension for visualizing component Data Flow Diagrams (DFD).

## Features

- **Framework Support**: Analyze React and Vue 3 components
- **Interactive Visualization**: Generate DFD diagrams with Mermaid
- **Real-time Updates**: Automatic refresh on file changes
- **Rich Analysis**: 
  - React: Props, hooks, context, state management
  - Vue 3: Props, reactive state, composables, lifecycle hooks, template directives
- **Library Support**: Vue Router, Pinia, React Router, SWR, TanStack Query, Zustand, and more

## Usage

1. Open a component file (`.tsx`, `.jsx`, `.vue`)
2. Run command: "Show Component DFD" (Cmd+Shift+D / Ctrl+Shift+D)
3. View the DFD in the webview panel

### Supported File Types

- **React**: `.tsx`, `.jsx` files with functional components
- **Vue 3**: `.vue` files with `<script setup>` syntax (Composition API)

### Example: React Component

```tsx
import { useState } from 'react';

export function Counter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Example: Vue 3 Component

```vue
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  initialCount?: number;
}>();

const count = ref(props.initialCount ?? 0);

function increment() {
  count.value++;
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

For comprehensive Vue 3 support documentation, see [Vue 3 Support Guide](../../docs/vue-support.md).

## Development

This extension is part of a monorepo. See the root README for setup instructions.

### Building

```bash
# From workspace root
pnpm --filter web-component-analyzer run build

# Or from this directory
pnpm run build
```

### Testing

```bash
pnpm run test
```

### Packaging

```bash
pnpm run vscode:prepublish
vsce package
```

## Architecture

The extension uses the `@web-component-analyzer/analyzer` package for core parsing logic, keeping the extension code focused on VS Code integration.
