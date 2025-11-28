# Examples Structure

## Overview

The `examples/` directory contains sample projects for testing and demonstrating the web-component-analyzer extension across various frontend frameworks.

## Directory Layout

```
examples/
├── react-vite/          # React + Vite sample
├── vue-vite/            # Vue + Vite sample
├── svelte-vite/         # Svelte + Vite sample
├── lit-vite/            # Lit + Vite sample
└── vanilla-vite/        # Vanilla JS + Vite sample
```

## Sample Project Requirements

- **Build Tool**: Vite (no SSR required)
- **Purpose**: Demonstrate web component analysis capabilities
- **Scope**: Client-side only, development builds
- **Size**: Keep minimal - focus on component examples

## Creating New Samples

When adding a new framework sample:

1. Use Vite as the build tool
2. Name directory as `{framework}-vite/`
3. Include basic web components for testing
4. Add a README.md explaining the sample
5. Keep dependencies minimal

## Common Commands (per sample)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Testing with Extension

Each sample project should be openable in VS Code to test the web-component-analyzer extension's DFD generation capabilities.
