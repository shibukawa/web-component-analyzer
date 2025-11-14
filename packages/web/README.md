# @web-component-analyzer/web

A browser-based web application for analyzing and visualizing React, Vue.js, and Svelte components through interactive Data Flow Diagrams (DFD). Paste your component code or select from sample components to see real-time visualization of data flow between props, state, processes, and outputs.

## Features

- **Multi-Framework Support**: Analyze React, Vue.js, and Svelte components
- **Real-Time Visualization**: See DFD updates as you type with 300ms debouncing
- **Interactive Code Editor**: Monaco Editor with syntax highlighting and IntelliSense
- **Mermaid Diagrams**: Professional flowchart visualization with theme-aware styling
- **URL-Based Sharing**: Share component code via compressed URLs
- **Themed Interface**: Light mode (Easter theme) and dark mode (Halloween theme) with seasonal decorations
- **No Installation Required**: Run entirely in the browser, no backend needed
- **Sample Components**: 10+ example components demonstrating different patterns

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

The analyzer recognizes and visualizes:

- **Props/Properties**: Component inputs and their types
- **State Management**: useState, reactive, writable stores
- **Computed Values**: useMemo, computed properties, derived stores
- **Effects**: useEffect, watchEffect, onMount
- **Event Handlers**: onClick, @click, on:click
- **Context**: useContext, provide/inject, context API
- **Refs**: useRef, ref, bind:this
- **Conditional Rendering**: if/else, ternary operators, v-if, {#if}
- **Loops**: map, v-for, {#each}

## Development

### Prerequisites

- Node.js 22.x
- pnpm 9.x

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
pnpm run build
```

Output will be in `dist/` directory, ready for deployment to GitHub Pages.

### Linting

```bash
# Run ESLint
pnpm run lint
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
