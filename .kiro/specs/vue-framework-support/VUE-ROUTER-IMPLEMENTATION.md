# Vue Router Library Adapter Implementation

## Overview

Implemented a complete Vue Router library adapter that handles Vue Router composables and navigation guards in Vue 3 components.

## Implementation Details

### File Created
- `packages/analyzer/src/libraries/vue-router.ts` - Main Vue Router processor implementation

### Supported Composables

#### 1. `useRoute()`
- **Type**: External Entity Input
- **Purpose**: Access current route information
- **DFD Node**: Creates an external-entity-input node
- **Metadata**: Includes `routeProperties` array with accessible properties:
  - `params` - Route parameters
  - `query` - Query parameters
  - `path` - Current path
  - `name` - Route name
  - `hash` - URL hash
  - `fullPath` - Full URL path
  - `matched` - Matched route records
  - `meta` - Route metadata

#### 2. `useRouter()`
- **Type**: Process (Navigation)
- **Purpose**: Access router instance for navigation
- **DFD Nodes**: Creates two nodes:
  1. Process node for the router
  2. External Entity Output node for URL navigation
- **Edge**: Creates data flow from router to URL: Output
- **Metadata**: Includes `routerMethods` array with navigation methods:
  - `push` - Navigate to new route
  - `replace` - Replace current route
  - `go` - Navigate by history offset
  - `back` - Go back in history
  - `forward` - Go forward in history

#### 3. `onBeforeRouteUpdate()`
- **Type**: Process (Navigation Guard)
- **Purpose**: Lifecycle hook called when route updates
- **DFD Nodes**: Creates two nodes:
  1. Process node for the guard
  2. External Entity Input node for route information
- **Edge**: Creates data flow from Route: Input to guard
- **Metadata**: Marked as `isNavigationGuard: true`

#### 4. `onBeforeRouteLeave()`
- **Type**: Process (Navigation Guard)
- **Purpose**: Lifecycle hook called before leaving route
- **DFD Nodes**: Creates two nodes:
  1. Process node for the guard
  2. External Entity Input node for route information
- **Edge**: Creates data flow from Route: Input to guard
- **Metadata**: Marked as `isNavigationGuard: true`

## Architecture

### Processor Pattern
The Vue Router processor follows the standard HookProcessor interface:

```typescript
export class VueRouterLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'vue-router',
    libraryName: 'vue-router',
    packagePatterns: ['vue-router'],
    hookNames: ['useRoute', 'useRouter', 'onBeforeRouteUpdate', 'onBeforeRouteLeave'],
    priority: 50
  };

  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean;
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult;
}
```

### Integration
The processor is registered in `packages/analyzer/src/libraries/index.ts`:

```typescript
import { VueRouterLibraryProcessor } from './vue-router.js';

function registerDefaultProcessors(registry: ProcessorRegistry): void {
  // ... other processors
  registry.register(new VueRouterLibraryProcessor());
}
```

### Data Flow

#### useRoute() Flow
```
Route: Input (External Entity) → useRoute (Library Hook) → Component Logic
```

#### useRouter() Flow
```
Component Logic → useRouter (Library Hook) → URL: Output (External Entity)
```

#### Navigation Guard Flow
```
Route: Input (External Entity) → onBeforeRouteUpdate/Leave (Process) → Navigation Decision
```

## Example Usage

```vue
<script setup lang="ts">
import { useRoute, useRouter, onBeforeRouteUpdate, onBeforeRouteLeave } from 'vue-router';

// Access current route information
const route = useRoute();
console.log(route.params.id);
console.log(route.query.search);

// Access router for navigation
const router = useRouter();

const goToHome = () => {
  router.push('/');
};

// Navigation guards
onBeforeRouteUpdate((to, from) => {
  console.log('Route updating');
});

onBeforeRouteLeave((to, from) => {
  return confirm('Leave this page?');
});
</script>
```

## DFD Output

For the example above, the processor generates:

1. **useRoute Node**
   - Type: external-entity-input
   - Label: "useRoute"
   - Properties: route.params, route.query, etc.

2. **useRouter Node**
   - Type: process
   - Label: "useRouter"
   - Properties: router.push, router.replace, etc.

3. **URL: Output Node**
   - Type: external-entity-output
   - Label: "URL: Output"
   - Connected from useRouter

4. **onBeforeRouteUpdate Node**
   - Type: process
   - Label: "onBeforeRouteUpdate"
   - Category: lifecycle

5. **onBeforeRouteLeave Node**
   - Type: process
   - Label: "onBeforeRouteLeave"
   - Category: lifecycle

6. **Route: Input Nodes**
   - Type: external-entity-input
   - Label: "Route: Input"
   - Connected to navigation guards

## Testing

An example Vue component demonstrating Vue Router usage has been created:
- `examples/vue-example-router.vue`

This component demonstrates:
- Accessing route parameters and query strings
- Router navigation methods
- Navigation guards

## Requirements Satisfied

✅ 8.1: useRoute composable creates External Entity Input nodes for route.params and route.query
✅ 8.2: useRouter composable creates library hook nodes for router access
✅ 8.3: Router navigation calls (push, replace) create data flows to URL: Output
✅ 8.4: Route.params and route.query access creates data flows from route input
✅ 8.5: Navigation guards (onBeforeRouteUpdate, onBeforeRouteLeave) create Process nodes

## Next Steps

The Vue Router processor is now fully integrated and will automatically be used when:
1. A Vue component imports from 'vue-router'
2. The component uses any of the supported composables
3. The DFD builder processes the component's hooks

The processor will be used in conjunction with:
- Task 10: Pinia library adapter (for state management)
- Task 11: Vue core library adapter (for provide/inject)
- Task 12: DFD builder integration (already complete via processor registry)
