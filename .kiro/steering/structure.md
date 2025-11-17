# Project Structure

## Monorepo Layout

This is a pnpm workspace monorepo with three main packages:

```
.
├── packages/
│   ├── analyzer/          # Core analysis engine (shared library)
│   ├── extension/         # VS Code extension
│   └── web/              # Web-based playground
├── examples/             # Sample projects for testing
│   └── react-vite/       # React + Vite examples with acceptance tests
├── .kiro/               # Kiro AI assistant configuration
│   ├── hooks/           # Agent hooks
│   ├── specs/           # Feature specifications
│   └── steering/        # AI steering rules
├── .vscode/             # VS Code workspace settings
├── docs/                # Documentation
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root package.json
```

## Package: analyzer

Core analysis engine shared by extension and web packages.

```
packages/analyzer/
├── src/
│   ├── analyzers/       # Component analyzers (props, hooks, processes, JSX)
│   ├── libraries/       # Third-party library adapters (React Hook Form, SWR, etc.)
│   ├── parser/          # AST parsing and DFD building
│   ├── services/        # Type classification, library detection
│   ├── third-party/     # Legacy library handlers (being migrated to libraries/)
│   ├── utils/           # Utility functions
│   └── index.ts         # Public API
├── dist/                # Compiled output (gitignored)
└── package.json         # Package manifest
```

### Key Directories in analyzer

- **analyzers/**: Component analysis logic
  - `props-analyzer.ts`: Extract component props
  - `hooks-analyzer.ts`: Detect and classify hooks
  - `process-analyzer.ts`: Extract event handlers and functions
  - `jsx-analyzer.ts`: Analyze JSX structure
  - `conditional-extractor.ts`: Extract conditional rendering and JSX attributes
  - `subgraph-builder.ts`: Build JSX element hierarchy

- **libraries/**: Third-party library adapters (NEW - centralized location)
  - `index.ts`: Registry and exports
  - `registry.ts`: Library adapter registration
  - `types.ts`: Common adapter types
  - `react-hook-form.ts`: React Hook Form adapter
  - `swr.ts`: SWR data fetching adapter
  - `tanstack-query.ts`: TanStack Query adapter
  - `next.ts`: Next.js routing and data fetching
  - And more...

- **parser/**: AST parsing and DFD generation
  - `ast-analyzer.ts`: Main AST analysis orchestrator
  - `dfd-builder.ts`: Build DFD nodes and edges from analysis
  - `types.ts`: Type definitions for analysis results

- **services/**: Shared services
  - `type-classifier.ts`: Classify variables as function/data
  - `library-detector.ts`: Detect active third-party libraries

## Package: extension

VS Code extension that provides DFD visualization in the editor.

```
packages/extension/
├── src/
│   ├── extension.ts     # Extension entry point
│   ├── services/        # Extension services
│   ├── visualization/   # Webview and diagram rendering
│   ├── utils/           # Utility functions
│   └── test/           # Tests including acceptance tests
│       └── acceptance/  # Mermaid-based acceptance tests
├── out/                # Compiled output (gitignored)
├── media/              # Static assets (mermaid.min.js)
└── package.json        # Extension manifest
```

## Package: web

Web-based playground for testing the analyzer without VS Code.

```
packages/web/
├── src/
│   ├── components/     # React components
│   ├── services/       # Web-specific services
│   ├── hooks/          # React hooks
│   ├── contexts/       # React contexts
│   ├── config/         # Configuration
│   ├── theme/          # Styling
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── dist/              # Build output (gitignored)
└── package.json       # Package manifest
```

## Examples Directory

Sample projects for testing and demonstrating the analyzer.

```
examples/
└── react-vite/
    ├── src/
    │   └── components/  # Test components with acceptance tests
    │       ├── 001-SimpleProps.tsx
    │       ├── 001-SimpleProps.mmd  # Expected Mermaid output
    │       ├── 150-ReactHookForm-BasicForm.tsx
    │       └── 150-ReactHookForm-BasicForm.mmd
    └── package.json
```

### Acceptance Test Convention

Test files use a three-digit numeric prefix: `{number}-{DescriptiveName}.{ext}`

Each component has a corresponding `.mmd` file with the expected Mermaid diagram output.

## Key Files

- **pnpm-workspace.yaml**: Defines workspace packages
- **packages/analyzer/src/index.ts**: Public API for analyzer package
- **packages/extension/src/extension.ts**: VS Code extension entry point
- **packages/web/src/main.tsx**: Web playground entry point

## Conventions

- All source code in `src/` directories
- Compiled output goes to `out/` or `dist/` directories (gitignored)
- Tests in `src/test/` directories
- Extension commands prefixed with: `web-component-analyzer.*`
- Third-party library adapters centralized in `packages/analyzer/src/libraries/`
- Acceptance tests use `.mmd` files for expected output validation
