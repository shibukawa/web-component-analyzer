# Technology Stack

## Core Technologies

- **Language**: TypeScript (strict mode enabled)
- **Platform**: VS Code Extension API (v1.105.0+)
- **Runtime**: Node.js 22.x
- **Package Manager**: pnpm

## Build System

- **Compiler**: TypeScript 5.9.3
- **Module System**: Node16
- **Target**: ES2022
- **Output Directory**: `out/`
- **Source Directory**: `src/`

## Code Quality Tools

- **Linter**: ESLint 9.36.0 with TypeScript plugin
- **Testing**: Mocha with @vscode/test-electron

## Common Commands

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile

# Watch mode for development
pnpm run watch

# Run linter
pnpm run lint

# Run tests
pnpm run test

# Prepare for publishing
pnpm run vscode:prepublish
```

## TypeScript Configuration

- Strict type checking enabled
- Source maps generated for debugging
- ES2022 lib and target

## AI Assistant Guidelines

### Using Serena Tools

When editing files in this project, prefer Serena MCP tools for cost-efficient operations:

- **mcp_serena_find_symbol**: Locate code symbols without reading entire files
- **mcp_serena_replace_symbol_body**: Replace function/class bodies efficiently
- **mcp_serena_insert_after_symbol**: Add new code after existing symbols
- **mcp_serena_insert_before_symbol**: Add new code before existing symbols
- **mcp_serena_rename_symbol**: Rename symbols across the codebase

These tools minimize token usage by targeting specific code sections rather than reading/writing entire files.
