# Web Component Analyzer - VS Code Extension

VS Code extension for visualizing component Data Flow Diagrams (DFD).

## Features

- Analyze React/Vue/Svelte components
- Generate interactive DFD visualizations
- Real-time updates on file changes
- Mermaid diagram rendering in webview

## Usage

1. Open a component file (`.tsx`, `.jsx`, `.vue`)
2. Run command: "Show Component DFD" (Cmd+Shift+D / Ctrl+Shift+D)
3. View the DFD in the webview panel

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
