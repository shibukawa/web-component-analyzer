# Implementation Plan

- [x] 1. Update VueASTAnalyzer to accept ParserFunction
  - Modify constructor to accept `parserFn: ParserFunction` parameter
  - Store `parserFn` as instance variable
  - Update `parseScriptSetup()` method to use `this.parserFn` instead of direct `@swc/core` import
  - Remove `import { parseSync } from '@swc/core'` statement
  - Handle `ParseResult` error cases appropriately
  - _Requirements: 1.1, 1.2, 2.3, 2.4_

- [x] 2. Update SvelteASTAnalyzer to accept ParserFunction
  - Modify constructor to accept `parserFn: ParserFunction` parameter
  - Store `parserFn` as instance variable
  - Update `analyzeSvelteSFC()` method to use `this.parserFn` instead of direct `@swc/core` import
  - Remove `import { parseSync } from '@swc/core'` statement
  - Handle `ParseResult` error cases appropriately
  - _Requirements: 1.1, 1.2, 3.3, 3.4_

- [x] 3. Update DefaultVueParser to pass ParserFunction to analyzer
  - Modify constructor to accept `parserFn: ParserFunction` parameter
  - Store `parserFn` as instance variable
  - Update `loadAnalyzer()` method to pass `parserFn` to `VueASTAnalyzer` constructor
  - Update `createVueParser()` factory function signature to accept `parserFn`
  - _Requirements: 2.5_

- [x] 4. Update DefaultSvelteParser to pass ParserFunction to analyzer
  - Modify constructor to accept `parserFn: ParserFunction` parameter
  - Store `parserFn` as instance variable
  - Update `loadAnalyzer()` method to pass `parserFn` to `SvelteASTAnalyzer` constructor
  - Update `createSvelteParser()` factory function signature to accept `parserFn`
  - _Requirements: 3.5_

- [x] 5. Update createParser() helper function
  - Modify `createParser()` function in `packages/analyzer/src/parser/index.ts`
  - Pass `parserFn` parameter to `createVueParser()` call
  - Pass `parserFn` parameter to `createSvelteParser()` call
  - Ensure all three frameworks (React, Vue, Svelte) use consistent pattern
  - _Requirements: 1.1, 2.5, 3.5_

- [x] 6. Update extension package to provide Node.js parser for Vue/Svelte
  - Verify `parseWithSWC()` function exists in `packages/extension/src/utils/node-parser.ts`
  - Update `packages/extension/src/visualization/dfd-visualizer-service.ts` to import `parseWithSWC`
  - Pass `parseWithSWC` to `createVueParser()` calls
  - Pass `parseWithSWC` to `createSvelteParser()` calls
  - Update any other extension files that create Vue/Svelte parsers
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 7. Update web package to provide browser parser for Vue/Svelte
  - Create or update browser parser function in `packages/web/src/services/analyzer.ts`
  - Ensure parser function uses `@swc/wasm-web` instead of `@swc/core`
  - Pass browser parser function to `createVueParser()` calls
  - Pass browser parser function to `createSvelteParser()` calls
  - Update any other web files that create Vue/Svelte parsers
  - _Requirements: 5.1, 5.2_

- [x] 8. Update analyzer package.json dependencies
  - Move `@swc/core` from `dependencies` to `peerDependencies` in `packages/analyzer/package.json`
  - Ensure `@swc/wasm-web` is not listed as a dependency
  - Verify package builds successfully
  - _Requirements: 1.3_

- [x] 9. Verify extension package builds and runs
  - Run `pnpm run compile` in extension package
  - Fix any TypeScript compilation errors
  - Test extension with Vue component files
  - Test extension with Svelte component files
  - Verify DFD generation works correctly
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 10. Verify web package builds and runs
  - Run `pnpm run build` in web package
  - Verify Vite does not attempt to bundle `@swc/core`
  - Run `pnpm run dev` to start development server
  - Test web app with Vue component samples
  - Test web app with Svelte component samples
  - Verify DFD generation works correctly in browser
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 1.5_

- [x] 11. Run acceptance tests to verify backward compatibility
  - Run `pnpm run test` in root directory
  - Verify all Vue acceptance tests pass
  - Verify all Svelte acceptance tests pass
  - Verify all React acceptance tests pass
  - Fix any test failures
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
