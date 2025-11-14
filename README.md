# Web Component Analyzer

Visualize the internal structure of frontend components through Data Flow Diagrams (DFD).

## Monorepo Structure

This project uses pnpm workspaces to manage multiple packages:

```
packages/
├── analyzer/          # Core parsing and analysis logic (platform-independent)
├── extension/         # VS Code extension
└── web/              # Web application (GitHub Pages)
```

## Getting Started

### Prerequisites

- Node.js 22.x
- pnpm 9.x

### Installation

```bash
pnpm install
```

### Development

```bash
# Build all packages
pnpm build

# Watch mode for all packages
pnpm dev

# Run linter
pnpm lint

# Run tests
pnpm test
```

### Package-specific Commands

```bash
# Build analyzer only
pnpm --filter @web-component-analyzer/analyzer run build

# Build extension only
pnpm --filter web-component-analyzer run build

# Build web app only
pnpm --filter @web-component-analyzer/web run build

# Start web dev server
pnpm --filter @web-component-analyzer/web run dev
```

## Packages

### @web-component-analyzer/analyzer

Core parsing and analysis logic for React/Vue/Svelte components. Platform-independent TypeScript library.

- AST parsing using SWC
- Component analysis (props, state, hooks, etc.)
- DFD data generation

### web-component-analyzer (extension)

VS Code extension that provides:

- Command palette integration
- Webview-based DFD visualization
- Real-time component analysis
- Mermaid diagram rendering

### @web-component-analyzer/web

Browser-based web application for analyzing React, Vue.js, and Svelte components:

- **Interactive Code Editor**: Monaco Editor with syntax highlighting
- **Real-Time Visualization**: See DFD updates as you type
- **Sample Components**: 10+ examples demonstrating different patterns
- **URL Sharing**: Share component code via compressed URLs
- **Themed Interface**: Light (Easter) and dark (Halloween) modes with decorations
- **No Installation**: Runs entirely in the browser

**🚀 [Try the Live Demo](https://[your-username].github.io/web-component-analyzer/)**

Deployed to GitHub Pages with automatic deployment via GitHub Actions.

## Development Workflow

1. Make changes to `packages/analyzer` for core logic
2. Test in `packages/extension` for VS Code integration
3. Test in `packages/web` for web UI

Changes to the analyzer package are automatically reflected in both extension and web packages through workspace references.

## Publishing

### VS Code Extension

```bash
cd packages/extension
pnpm run vscode:prepublish
vsce package
```

### Web Application

GitHub Actions automatically deploys to GitHub Pages on push to main branch.

## License

MIT
