# @web-component-analyzer/analyzer

Core parsing and analysis library for frontend component DFD generation.

## Features

- Platform-independent TypeScript library
- AST parsing using SWC
- Support for React, Vue, Svelte components
- Extracts props, state, hooks, and data flows
- Generates DFD source data

## Installation

```bash
npm install @web-component-analyzer/analyzer
```

## Usage

```typescript
import { createReactParser } from '@web-component-analyzer/analyzer';

const parser = createReactParser();
const dfdData = await parser.parse(sourceCode, filePath);

console.log(dfdData.nodes);
console.log(dfdData.edges);
```

## API

See TypeScript definitions for full API documentation.
