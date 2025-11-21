# Requirements Document

## Introduction

The web-component-analyzer project currently has a critical issue where the analyzer package directly imports `@swc/core` for Vue and Svelte parsing, preventing the web package (browser environment) from functioning. The extension package uses `@swc/core` (Node.js) while the web package must use `@swc/wasm-web` (browser). This requirement document defines the changes needed to remove direct SWC dependencies from the analyzer package and implement dependency injection similar to the existing React parser implementation.

## Glossary

- **Analyzer Package**: The core analysis engine (`packages/analyzer`) that provides framework-agnostic parsing logic
- **Extension Package**: The VS Code extension (`packages/extension`) that runs in Node.js environment
- **Web Package**: The browser-based playground (`packages/web`) that runs in browser environment
- **SWC**: A TypeScript/JavaScript parser with two variants: `@swc/core` (Node.js) and `@swc/wasm-web` (browser)
- **Parser Function**: A function type that abstracts SWC parsing, allowing callers to provide their own SWC implementation
- **AST Analyzer**: A component that analyzes parsed Abstract Syntax Trees to extract component information
- **Dependency Injection**: A design pattern where dependencies are provided by the caller rather than imported directly

## Requirements

### Requirement 1: Remove Direct SWC Dependencies from Analyzer Package

**User Story:** As a developer, I want the analyzer package to be environment-agnostic, so that it can work in both Node.js and browser environments without bundling issues.

#### Acceptance Criteria

1. WHEN the analyzer package is built, THE Analyzer Package SHALL NOT import `@swc/core` directly in any Vue or Svelte parsing modules
2. WHEN the analyzer package is built, THE Analyzer Package SHALL NOT import `@swc/wasm-web` directly in any parsing modules
3. WHEN the analyzer package is built, THE Analyzer Package SHALL define `@swc/core` as a peer dependency rather than a direct dependency
4. WHEN Vue or Svelte parsing is performed, THE Analyzer Package SHALL receive parsed AST modules from the caller rather than performing parsing internally
5. WHEN the analyzer package is imported by the web package, THE Web Package SHALL successfully build without attempting to bundle `@swc/core`

### Requirement 2: Implement Parser Function Pattern for Vue

**User Story:** As a developer, I want Vue parsing to follow the same dependency injection pattern as React parsing, so that the implementation is consistent and maintainable.

#### Acceptance Criteria

1. WHEN creating a Vue parser, THE Extension Package SHALL provide a ParserFunction that uses `@swc/core` for script parsing
2. WHEN creating a Vue parser, THE Web Package SHALL provide a ParserFunction that uses `@swc/wasm-web` for script parsing
3. WHEN VueASTAnalyzer analyzes a component, THE VueASTAnalyzer SHALL receive a ParserFunction parameter in its constructor
4. WHEN VueASTAnalyzer needs to parse script setup content, THE VueASTAnalyzer SHALL use the provided ParserFunction instead of importing `@swc/core` directly
5. WHEN DefaultVueParser is instantiated, THE DefaultVueParser SHALL accept a ParserFunction parameter and pass it to VueASTAnalyzer

### Requirement 3: Implement Parser Function Pattern for Svelte

**User Story:** As a developer, I want Svelte parsing to follow the same dependency injection pattern as React parsing, so that the implementation is consistent and maintainable.

#### Acceptance Criteria

1. WHEN creating a Svelte parser, THE Extension Package SHALL provide a ParserFunction that uses `@swc/core` for script parsing
2. WHEN creating a Svelte parser, THE Web Package SHALL provide a ParserFunction that uses `@swc/wasm-web` for script parsing
3. WHEN SvelteASTAnalyzer analyzes a component, THE SvelteASTAnalyzer SHALL receive a ParserFunction parameter in its constructor
4. WHEN SvelteASTAnalyzer needs to parse script content, THE SvelteASTAnalyzer SHALL use the provided ParserFunction instead of importing `@swc/core` directly
5. WHEN DefaultSvelteParser is instantiated, THE DefaultSvelteParser SHALL accept a ParserFunction parameter and pass it to SvelteASTAnalyzer

### Requirement 4: Update Extension Package to Provide Node.js Parser

**User Story:** As a VS Code extension user, I want the extension to continue working with Vue and Svelte components, so that I can visualize component data flow diagrams.

#### Acceptance Criteria

1. WHEN the extension creates a Vue parser, THE Extension Package SHALL provide a ParserFunction that uses `@swc/core` parseSync
2. WHEN the extension creates a Svelte parser, THE Extension Package SHALL provide a ParserFunction that uses `@swc/core` parseSync
3. WHEN the extension parses a Vue component, THE Extension Package SHALL successfully generate a DFD using the Node.js parser
4. WHEN the extension parses a Svelte component, THE Extension Package SHALL successfully generate a DFD using the Node.js parser
5. WHEN the extension builds, THE Extension Package SHALL successfully compile without errors

### Requirement 5: Update Web Package to Provide Browser Parser

**User Story:** As a web playground user, I want to analyze Vue and Svelte components in my browser, so that I can test the analyzer without installing VS Code.

#### Acceptance Criteria

1. WHEN the web package creates a Vue parser, THE Web Package SHALL provide a ParserFunction that uses `@swc/wasm-web` parseSync
2. WHEN the web package creates a Svelte parser, THE Web Package SHALL provide a ParserFunction that uses `@swc/wasm-web` parseSync
3. WHEN the web package parses a Vue component, THE Web Package SHALL successfully generate a DFD using the browser parser
4. WHEN the web package parses a Svelte component, THE Web Package SHALL successfully generate a DFD using the browser parser
5. WHEN the web package builds with Vite, THE Web Package SHALL successfully build without attempting to bundle `@swc/core`
6. WHEN the web package runs in development mode, THE Web Package SHALL start without errors

### Requirement 6: Maintain Backward Compatibility

**User Story:** As a developer, I want existing tests and functionality to continue working, so that the refactoring does not break existing features.

#### Acceptance Criteria

1. WHEN acceptance tests are run, THE Analyzer Package SHALL pass all existing Vue component tests
2. WHEN acceptance tests are run, THE Analyzer Package SHALL pass all existing Svelte component tests
3. WHEN acceptance tests are run, THE Analyzer Package SHALL pass all existing React component tests
4. WHEN the extension is used with existing Vue components, THE Extension Package SHALL generate the same DFD output as before the refactoring
5. WHEN the extension is used with existing Svelte components, THE Extension Package SHALL generate the same DFD output as before the refactoring
