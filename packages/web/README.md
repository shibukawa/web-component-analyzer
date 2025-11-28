# @web-component-analyzer/web

A browser-based web application for analyzing and visualizing React, Vue.js, and Svelte components through interactive Data Flow Diagrams (DFD). Paste your component code or select from sample components to see real-time visualization of data flow between props, state, processes, and outputs.

## Features

- **Multi-Framework Support**: Analyze React and Vue 3 components
  - React: Functional components with hooks
  - Vue 3: Composition API with `<script setup>` syntax
- **Real-Time Visualization**: See DFD updates as you type with 300ms debouncing
- **Interactive Code Editor**: Monaco Editor with syntax highlighting and IntelliSense
- **Mermaid Diagrams**: Professional flowchart visualization with theme-aware styling
- **URL-Based Sharing**: Share component code via compressed URLs
- **Themed Interface**: Light mode (Easter theme) and dark mode (Halloween theme) with seasonal decorations
- **No Installation Required**: Run entirely in the browser, no backend needed
- **Sample Components**: 15+ example components demonstrating different patterns (React hooks, Vue composables, etc.)

## Live Demo

🚀 **[Try it now](https://[your-username].github.io/web-component-analyzer/)**

Visit the deployed application at: `https://[your-username].github.io/web-component-analyzer/`

## Screenshots

### Light Theme (Easter)
![Light Theme Screenshot](./docs/screenshots/light-theme.png)
*Light mode with Easter-themed decorations (eggs, bunnies) and pastel colors*

### Dark Theme (Halloween)
![Dark Theme Screenshot](./docs/screenshots/dark-theme.png)
*Dark mode with Halloween-themed decorations (bats, pumpkins) and spooky colors*

## How to Use

### Quick Start

1. **Visit the application** at the GitHub Pages URL
2. **Select a sample component** from the dropdown menu to see example visualizations
3. **Or paste your own code** into the editor on the left
4. **View the DFD** in the visualization pane on the right

### Selecting Sample Components

- Click the **Sample Component** dropdown in the editor pane
- Samples are grouped by framework (REACT, VUE, SVELTE)
- Select any sample to load it into the editor
- The framework badge shows the current component type

### Editing Code

- Type or paste component code directly into the Monaco editor
- Syntax highlighting works for TypeScript, JSX, Vue, and Svelte
- The diagram updates automatically after you stop typing (300ms delay)
- Use Ctrl/Cmd + Z for undo, Ctrl/Cmd + Shift + Z for redo

### Sharing Components

1. Click the **🔗 Share** button in the header
2. The URL is automatically copied to your clipboard
3. Share the URL with others - they'll see your exact component code
4. URLs use gzip compression to keep links short

### Switching Themes

- Click the **🌙/☀️** button in the header to toggle between light and dark mode
- The app detects your system preference on first load
- Your theme choice is saved in browser localStorage
- Each theme includes seasonal decorations that don't interfere with functionality

### Understanding the Diagram

The DFD visualization shows:

- **External Entities (Input)**: Props, context, and initial state (rounded rectangles)
- **Processes**: Functions, event handlers, and effects (rectangles)
- **Data Stores**: State variables, refs, and computed values (open rectangles)
- **External Entities (Output)**: Template rendering and function calls (rounded rectangles)
- **Data Flows**: Arrows showing how data moves between elements

### Responsive Layout

- **Desktop (≥768px)**: Split-pane layout with editor on left, diagram on right
- **Mobile (<768px)**: Stacked layout with editor above, diagram below
- Both panes scroll independently for large content

## Supported Component Patterns

### React
- **Props**: Component inputs with TypeScript types
- **State**: `useState`, `useReducer`
- **Computed Values**: `useMemo`, `useCallback`
- **Effects**: `useEffect`, `useLayoutEffect`, `useInsertionEffect`
- **Context**: `useContext`, `createContext`
- **Refs**: `useRef`, `useImperativeHandle`
- **Event Handlers**: `onClick`, `onChange`, etc.
- **Conditional Rendering**: Ternary operators, logical AND
- **Loops**: `map()`, `filter()`
- **Third-Party Libraries**: React Router, SWR, TanStack Query, Zustand, Jotai, MobX, Apollo, RTK Query, tRPC

### Vue 3
- **Props**: `defineProps()` with TypeScript generics or object syntax
- **State**: `ref()`, `reactive()`, `computed()`
- **Composables**: Custom composables and built-in Vue composables
- **Lifecycle**: `onMounted`, `onUpdated`, `onUnmounted`, etc.
- **Watchers**: `watch()`, `watchEffect()`
- **Emits**: `defineEmits()` with event definitions
- **Template Directives**: `v-bind`/`:`, `v-on`/`@`, `v-model`, `v-if`, `v-show`, `v-for`
- **Provide/Inject**: Dependency injection pattern
- **Vue Router**: `useRoute()`, `useRouter()`, navigation guards
- **Pinia**: `useStore()`, `storeToRefs()`, store actions

For comprehensive Vue 3 documentation, see [Vue 3 Support Guide](../../docs/vue-support.md).

## Development

### Prerequisites

- Node.js 22.x
- npm 10.x (bundled with Node 22)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

**Note:** The `dev` script automatically extracts TypeScript type definitions from npm packages before starting Vite. The generated file `src/config/type-definitions.ts` is auto-generated and should not be edited manually.

### Build

```bash
# Build for production
npm run build
```

Output will be in `dist/` directory, ready for deployment to GitHub Pages.

**Note:** The `prebuild` script automatically runs before building to ensure type definitions are up-to-date.

### Type Definitions

The Monaco Editor provides accurate TypeScript IntelliSense and type checking for popular frontend libraries through an extensible type definition system. Type definitions are extracted from npm packages at build time and bundled into the application, eliminating the need for runtime CDN fetches.

#### How It Works

1. **Configuration** (`src/config/type-config.json`): Declares which libraries to support
2. **Build-Time Extraction** (`scripts/extract-types.ts`): Extracts `.d.ts` files from `node_modules`
3. **Bundled Output** (`src/config/type-definitions.ts`): Auto-generated file with all type definitions
4. **Runtime Registration** (`src/utils/type-registry.ts`): Registers types with Monaco on initialization

#### Currently Supported Libraries

- **React** - Full React 18+ type definitions including hooks, JSX, and runtime
- **SWR** - Data fetching library with React hooks

#### Adding New Library Support

To add type definitions for a new library:

1. **Install the type package:**
   ```bash
   npm install -D @types/library-name
   # or if the package includes types:
   npm install library-name
   ```

2. **Add configuration** to `src/config/type-config.json`:
   ```json
   {
     "name": "library-name",
     "packageName": "@types/library-name",
     "entryPoint": "index.d.ts",
     "virtualPath": "file:///node_modules/@types/library-name/index.d.ts",
     "enabled": true,
     "dependencies": []
   }
   ```

3. **Extract and test:**
   ```bash
   npm run extract-types
   npm run dev
   ```

4. **Verify** in the editor that imports work without type errors

For detailed instructions, see [scripts/README.md](./scripts/README.md).

#### Manual Type Extraction

To manually regenerate type definitions:

```bash
npm run extract-types

# With verbose logging:
npm run extract-types -- --verbose

# Custom paths:
npm run extract-types -- --config path/to/config.json --output path/to/output.ts
```

#### Configuration Schema

Each library in `type-config.json` requires:

- `name`: Unique identifier (e.g., "react")
- `packageName`: npm package name (e.g., "@types/react")
- `entryPoint`: Main `.d.ts` file (e.g., "index.d.ts")
- `virtualPath`: Monaco virtual path (e.g., "file:///node_modules/@types/react/index.d.ts")
- `enabled`: Whether to include in bundle
- `additionalFiles`: (Optional) Extra `.d.ts` files to include
- `dependencies`: (Optional) Libraries that must load first

#### Performance Notes

- Type definitions are bundled at build time (no runtime fetching)
- Registration happens during Monaco initialization (~50-200ms for 2-3 libraries)
- Bundle size impact: ~500KB for React, ~100KB for SWR
- Only enabled libraries are included in the bundle

### Linting

```bash
# Run ESLint
npm run lint
```

## Deployment

This application is configured for automatic deployment to GitHub Pages via GitHub Actions.

For detailed deployment instructions and repository configuration, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Technology Stack

- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 6.0+
- **Code Editor**: Monaco Editor
- **Diagram Rendering**: Mermaid.js 11.12+
- **Styling**: CSS Modules with CSS custom properties
- **Analyzer**: @web-component-analyzer/analyzer package
- **Compression**: CompressionStream API (gzip)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

Requires support for:
- CompressionStream/DecompressionStream APIs
- ES2022 features
- CSS custom properties

## Contributing

Contributions are welcome! Please see the main repository README for development workflow and guidelines.

## License

MIT
