# Development Guide

## Setup

1. Install dependencies from workspace root:
```bash
cd ../..  # Go to workspace root
npm install
```

2. Build analyzer package:
```bash
npm run --workspace @web-component-analyzer/analyzer build
```

## Running the Extension

### Option 1: VS Code (Recommended)

1. Open `packages/extension` folder in VS Code
2. Press F5 or Run > Start Debugging
3. This will:
   - Start watching both analyzer and extension
   - Launch Extension Development Host
   - Auto-rebuild on changes

### Option 2: Manual

```bash
# Terminal 1: Watch analyzer
cd ../analyzer
npm run dev

# Terminal 2: Watch extension
cd ../extension
npm run watch

# Then press F5 in VS Code
```

## Testing

```bash
# Run all tests
npm run test

# Run specific test
npm run test -- --grep "DFD"
```

## Building

```bash
# Build extension only
npm run build

# Build all packages (from workspace root)
cd ../..
npm run build --workspaces
```

## Packaging

```bash
# Prepare for publishing
npm run vscode:prepublish

# Create .vsix package
vsce package
```

## Debugging

- Set breakpoints in TypeScript files
- Use Debug Console in Extension Development Host
- Check Output panel > "Extension Host"

## Common Issues

### "Cannot find module '@web-component-analyzer/analyzer'"

Solution: Build the analyzer package first:
```bash
npm run --workspace @web-component-analyzer/analyzer build
```

### Changes not reflected

Solution: Make sure both watchers are running (check tasks.json)

### Type errors in analyzer

Solution: Rebuild analyzer with composite project:
```bash
cd ../analyzer
npm run build
```
