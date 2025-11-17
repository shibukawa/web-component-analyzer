---
inclusion: always
---

# Third-Party Library Integration

## Library-Specific Implementation Location

All third-party library-specific implementations must be consolidated in:

```
packages/analyzer/src/libraries/
```

## Structure

Each library adapter should be a separate file:

```
packages/analyzer/src/libraries/
├── index.ts              # Registry and exports
├── registry.ts           # Library adapter registration
├── types.ts              # Common adapter types
├── react.ts              # React-specific hooks and patterns
├── next.ts               # Next.js routing and data fetching
├── swr.ts                # SWR data fetching
├── tanstack-query.ts     # TanStack Query
├── tanstack-router.ts    # TanStack Router
├── react-router.ts       # React Router
└── react-hook-form.ts    # React Hook Form
```

## Key Dependencies

### Parser & AST
- **@swc/core** (Node.js): Fast TypeScript/JavaScript parser
- **@swc/wasm-web** (Browser): WebAssembly version for web package

### Visualization
- **mermaid**: Diagram generation (v11.12.1+)
- **monaco-editor**: Code editor in web package

### VS Code Extension
- **@vscode/test-electron**: Testing framework
- **esbuild**: Bundler for extension code

### Web Package
- **React 18.3+**: UI framework
- **Vite 6+**: Build tool and dev server
- **SWR**: Data fetching (for examples)

## Guidelines

1. **Centralize library logic**: Keep all library-specific parsing, hook detection, and pattern recognition in `packages/analyzer/src/libraries/`

2. **Use the registry**: Register new library adapters in `registry.ts` for automatic discovery

3. **Follow adapter pattern**: Implement the common adapter interface defined in `types.ts`

4. **Avoid duplication**: Don't scatter library-specific code across analyzers or parsers

5. **Version compatibility**: Document minimum supported versions in adapter files 