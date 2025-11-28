## Monorepo Structure

This project uses npm workspaces to manage multiple packages:

```
packages/
├── analyzer/          # Core parsing and analysis logic (platform-independent)
├── extension/         # VS Code extension
└── web/              # Web application (GitHub Pages)
```

## Getting Started

### Prerequisites

- Node.js 22.x (with npm 10+)

### Installation

```bash
npm install
```

### Development

```bash
# Build all packages
npm run build --workspaces

# Watch mode for all packages
npm run dev --workspaces --if-present

# Run linter
npm run lint --workspaces --if-present

# Run tests
npm run test --workspaces --if-present
```

### Package-specific Commands

```bash
# Build analyzer only
npm run --workspace @web-component-analyzer/analyzer build

# Build extension only
npm run --workspace web-component-analyzer build

# Build web app only
npm run --workspace @web-component-analyzer/web build

# Start web dev server
npm run --workspace @web-component-analyzer/web dev
```

## Packages

### @web-component-analyzer/analyzer

Core parsing and analysis logic for React and Vue 3 components. Platform-independent TypeScript library.

- AST parsing using SWC
- Component analysis (props, state, hooks, composables, etc.)
- DFD data generation
- Support for React hooks and Vue 3 Composition API
- Third-party library adapters (Vue Router, Pinia, React Router, SWR, TanStack Query, etc.)

### web-component-analyzer (extension)

VS Code extension that provides:

- Command palette integration
- Webview-based DFD visualization
- Real-time component analysis
- Mermaid diagram rendering

### @web-component-analyzer/web

Browser-based web application for analyzing React and Vue 3 components:

- **Interactive Code Editor**: Monaco Editor with syntax highlighting
- **Real-Time Visualization**: See DFD updates as you type
- **Sample Components**: 10+ examples demonstrating different patterns (React hooks, Vue composables, etc.)
- **Framework Support**: React (JSX/TSX) and Vue 3 (SFC with `<script setup>`)
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

`vsce package` expects a single-package workspace. To keep npm workspaces for development while producing a clean package, use the helper script that vendors the analyzer into a temporary folder:

```bash
# From repo root
./scripts/package-extension.sh

# Result: web-component-analyzer-<version>.vsix placed in repo root
```

The script performs these steps for you:

1. Builds `@web-component-analyzer/analyzer` so the `dist/` artifacts are current.
2. Copies both `packages/extension` and `packages/analyzer` into a temporary workspace-free directory.
3. Rewrites the extension's dependency graph to point at the vendored analyzer copy (no pnpm/npm workspace symlinks).
4. Runs `npm install` and `vsce package` inside the temporary directory, then copies the generated `.vsix` back to the repository root.

You can keep the temporary directory for debugging by setting `WCA_KEEP_PACKAGE_TEMP=1` before running the script. Additional `vsce package` flags may be passed through as arguments, e.g. `./scripts/package-extension.sh --target darwin-arm64`.
