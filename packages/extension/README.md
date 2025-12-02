# Web Component Analyzer - VS Code Extension

VS Code extension for visualizing component Data Flow Diagrams (DFD).

## Features

- **Framework Support**: Analyze React, Vue 3, and Svelte 5 components
- **Interactive Visualization**: Generate DFD diagrams with Mermaid
- **Real-time Updates**: Automatic refresh on file changes
- **Theme Support**: Automatic detection and rendering of diagrams with light, dark, and high-contrast themes matching your VS Code preferences
- **Rich Analysis**: 
  - React: Props, hooks, context, state management
  - Vue 3: Props, reactive state, composables, lifecycle hooks, template directives
  - Svelte 5: Props, runes (`$state`, `$derived`), stores, events, reactive statements
- **Library Support**: Vue Router, Pinia, React Router, SWR, TanStack Query, Zustand, and more

## Usage

1. Open a component file (`.tsx`, `.jsx`, `.vue`)
2. Run command: "Show Component DFD" (Cmd+Shift+D / Ctrl+Shift+D)
3. View the DFD in the webview panel

### Theme Support

The extension automatically detects and applies your VS Code theme preference to the DFD diagrams:

- **Light Theme**: Diagrams render with light colors for comfortable viewing in bright environments
- **Dark Theme**: Diagrams render with dark colors for comfortable viewing in low-light environments
- **High-Contrast Theme**: Diagrams render with high-contrast colors for improved accessibility

Theme changes are applied automatically when you switch VS Code themes—no manual refresh required. The diagram structure and layout remain unchanged; only the colors update to match your theme preference.

### Supported File Types

- **React**: `.tsx`, `.jsx` files with functional components
- **Vue 3**: `.vue` files with `<script setup>` syntax (Composition API)
- **Svelte 5**: `.svelte` files using runes-based syntax or legacy `$:` reactivity

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

### Example: Svelte 5 Component

```svelte
<script lang="ts">
  export let initialCount: number = 0;
  const count = $state(initialCount);

  function increment() {
    count.set(count.get() + 1);
  }
</script>

<div>
  <p>Count: {$derived count.get()}</p>
  <button on:click={increment}>Increment</button>
</div>
```

Svelte-specific capabilities include rune tracking, store resolution, and event wiring in the generated DFD.

## Development

This extension is part of a monorepo. See the root README for setup instructions.

### Building

```bash
# From workspace root
npm run --workspace web-component-analyzer build

# Or from this directory
npm run build
```

### Testing

```bash
npm run test
```

### Packaging

```bash
npm run vscode:prepublish
vsce package
```

## Architecture

The extension uses the `@web-component-analyzer/analyzer` package for core parsing logic, keeping the extension code focused on VS Code integration.
