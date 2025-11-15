# Implementation Plan

- [x] 1. Create type configuration system
  - Create `packages/web/src/config/type-config.json` with initial React configuration
  - Define TypeScript interfaces for configuration schema in `packages/web/src/types/type-config.ts`
  - Add validation logic for configuration file
  - _Requirements: 2.2, 5.1, 5.2_

- [x] 2. Implement type extractor build script
  - [x] 2.1 Create base extractor script structure
    - Create `packages/web/scripts/extract-types.ts` with main function
    - Implement configuration loading from `type-config.json`
    - Add command-line argument parsing for options
    - _Requirements: 3.1, 3.4_

  - [x] 2.2 Implement type file extraction logic
    - Add function to locate package in `node_modules`
    - Implement `.d.ts` file reading and concatenation
    - Handle `additionalFiles` from configuration
    - Resolve relative imports within type definitions
    - _Requirements: 1.4, 3.1, 3.3_

  - [x] 2.3 Implement dependency resolution
    - Add topological sort for dependency ordering
    - Detect and handle circular dependencies
    - Validate that all dependencies are configured
    - _Requirements: 2.4, 5.3_

  - [x] 2.4 Generate bundled output file
    - Create template for `type-definitions.ts` output
    - Format type definitions as string constants
    - Write generated file to `packages/web/src/config/type-definitions.ts`
    - Add file header with generation timestamp and warning
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Create type registry runtime system
  - [x] 3.1 Implement TypeRegistry class
    - Create `packages/web/src/utils/type-registry.ts`
    - Implement `MonacoTypeRegistry` class with initialization logic
    - Add topological sort for runtime dependency ordering
    - Implement duplicate registration prevention
    - _Requirements: 2.1, 2.3, 4.1_

  - [x] 3.2 Implement Monaco registration logic
    - Add `registerType` method to register single type definition
    - Add `registerAll` method to register all definitions
    - Implement dependency-first registration order
    - Add error handling for registration failures
    - _Requirements: 1.1, 1.2, 4.1_

  - [x] 3.3 Add registry query methods
    - Implement `isRegistered` to check registration status
    - Implement `getRegisteredLibraries` to list registered libraries
    - Add getter for accessing type definitions
    - _Requirements: 2.3_

- [x] 4. Refactor Monaco configuration to use type registry
  - [x] 4.1 Update monaco-types.ts
    - Import `typeDefinitions` from generated file
    - Import `MonacoTypeRegistry` class
    - Replace hardcoded type strings with registry initialization
    - Remove old React/Vue/Svelte type string constants
    - _Requirements: 1.1, 1.4, 2.1_

  - [x] 4.2 Update TypeScript compiler options
    - Ensure compiler options support all registered libraries
    - Configure JSX settings for React
    - Set appropriate module resolution
    - _Requirements: 1.3_

  - [x] 4.3 Add initialization logging
    - Log registered libraries on successful initialization
    - Log errors for failed registrations
    - Add performance timing logs
    - _Requirements: 4.1_

- [x] 5. Integrate build script into build process
  - [x] 5.1 Update package.json scripts
    - Add `prebuild` script to run type extractor
    - Update `dev` script to run extractor before Vite
    - Add `extract-types` standalone script
    - _Requirements: 3.1, 3.3_

  - [x] 5.2 Install required dependencies
    - Add `tsx` for running TypeScript scripts
    - Add any required Node.js type packages
    - Update `package.json` with new devDependencies
    - _Requirements: 3.1_

  - [x] 5.3 Add generated file to .gitignore
    - Add `packages/web/src/config/type-definitions.ts` to .gitignore
    - Document in README that file is auto-generated
    - _Requirements: 3.1_

- [x] 6. Add React type definitions
  - [x] 6.1 Configure React in type-config.json
    - Add React library configuration with correct package name
    - Specify entry point as `index.d.ts`
    - Add essential additional files (global.d.ts, jsx-runtime.d.ts)
    - Set enabled to true
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 6.2 Install React type packages
    - Ensure `@types/react` is in dependencies or devDependencies
    - Verify correct version compatibility
    - _Requirements: 1.4_

  - [x] 6.3 Test React types in editor
    - Run build script to generate type definitions
    - Start dev server and open editor
    - Test `import React from 'react'` shows no errors
    - Test React hooks IntelliSense (useState, useEffect, etc.)
    - Test JSX type checking
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Add support for additional libraries (SWR example)
  - [x] 7.1 Add SWR configuration
    - Add SWR entry to type-config.json
    - Specify React as dependency
    - Set enabled to true
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 7.2 Install SWR types
    - Add `@types/swr` or `swr` package (includes types)
    - Verify installation
    - _Requirements: 2.2_

  - [x] 7.3 Test SWR types in editor
    - Rebuild to include SWR types
    - Test `import useSWR from 'swr'` shows no errors
    - Test SWR hook IntelliSense
    - Verify React dependency is loaded first
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 8. Documentation and cleanup
  - [x] 8.1 Document type configuration system
    - Add README in `packages/web/scripts/` explaining extractor
    - Document configuration schema in type-config.json
    - Add examples for adding new libraries
    - _Requirements: 2.2, 5.4_

  - [x] 8.2 Add inline code documentation
    - Add JSDoc comments to TypeRegistry class
    - Document extractor script functions
    - Add comments to generated file template
    - _Requirements: 2.3_

  - [x] 8.3 Update main README
    - Document the type definition system
    - Explain how to add new library support
    - List currently supported libraries
    - _Requirements: 2.2, 5.4_
