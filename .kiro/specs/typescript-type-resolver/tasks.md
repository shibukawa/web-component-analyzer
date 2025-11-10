# Implementation Plan

- [x] 1. Create TypeScript type resolution infrastructure
  - Create `src/services/type-resolver.ts` with `TypeResolver` class
  - Create `src/services/language-server-client.ts` with `LanguageServerClient` class
  - Create `src/services/type-classifier.ts` with `TypeClassifier` class
  - Define interfaces for `TypeQueryRequest`, `TypeQueryResult`, `TypeDefinition`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

- [x] 2. Implement LanguageServerClient for VS Code API integration
  - [x] 2.1 Implement `getTypeAtPosition` method using `vscode.languages` API
    - Use `vscode.commands.executeCommand` with TypeScript commands
    - Query hover information to extract type strings
    - Handle document loading with `vscode.workspace.openTextDocument`
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.2 Implement `getHoverInfo` method
    - Use `vscode.languages.getHover` API
    - Extract type information from hover markdown
    - Parse TypeScript type from hover content
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.3 Add error handling for Language Server failures
    - Handle Language Server unavailable scenario
    - Handle file not found errors
    - Handle TypeScript configuration errors
    - Return error results with descriptive messages
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 3. Implement TypeClassifier for function type detection
  - [x] 3.1 Implement basic function type detection
    - Detect arrow function types: `() => void`, `(arg: string) => number`
    - Detect `Function` type
    - Detect function keyword types: `function(arg: string): void`
    - _Requirements: 3.1, 3.2_
  
  - [x] 3.2 Implement named function type detection
    - Detect React event handler types: `MouseEventHandler`, `ChangeEventHandler`
    - Detect callback types: `Callback`, `Handler`
    - Use type name patterns to identify function types
    - _Requirements: 3.3_
  
  - [x] 3.3 Implement union type handling
    - Parse union types: `string | (() => void)`
    - Classify as function if any union member is a function
    - Handle complex union types with multiple function signatures
    - _Requirements: 3.4_
  
  - [x] 3.4 Implement callable interface detection
    - Detect interfaces with call signatures
    - Handle TypeScript callable object types
    - Support generic function types
    - _Requirements: 3.5_

- [x] 4. Implement TypeResolver orchestration
  - [x] 4.1 Implement `resolveType` method
    - Accept `TypeQueryRequest` with file path, position, prop name
    - Call `LanguageServerClient.getTypeAtPosition`
    - Pass type string to `TypeClassifier`
    - Return `TypeQueryResult` with function classification
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 4.2 Implement `resolveTypes` batch method
    - Accept array of `TypeQueryRequest`
    - Process multiple type queries
    - Return array of `TypeQueryResult`
    - _Requirements: 1.1_
  
  - [x] 4.3 Add error handling and logging
    - Log errors when Language Server queries fail
    - Include error details in `TypeQueryResult`
    - Handle timeout scenarios gracefully
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Integrate TypeResolver with PropsAnalyzer
  - [x] 5.1 Update `PropsAnalyzer` to use `TypeResolver`
    - Inject `TypeResolver` into `PropsAnalyzer` constructor
    - Extract prop positions from AST
    - Create `TypeQueryRequest` for each prop
    - _Requirements: 1.1_
  
  - [x] 5.2 Update `PropInfo` interface with type metadata
    - Add `isFunction` boolean field
    - Add `typeString` optional field
    - Update existing prop extraction to include type info
    - _Requirements: 1.3, 1.4_
  
  - [x] 5.3 Call TypeResolver during prop analysis
    - Query types for all props after AST extraction
    - Merge type results with prop information
    - Handle props without type information gracefully
    - _Requirements: 1.1, 1.2_

- [x] 6. Update DFDBuilder to use type information
  - [x] 6.1 Modify edge creation logic
    - Check `prop.isFunction` when creating edges
    - Create `function-call` edges for function props
    - Create `data-flow` edges for value props
    - _Requirements: 1.3, 1.4_
  
  - [x] 6.2 Add type information to DFD nodes
    - Include `typeString` in node metadata
    - Display type information in visualization
    - Handle missing type information in UI
    - _Requirements: 1.2_

- [x] 7. Add framework-specific type support
  - [x] 7.1 Implement React-specific type handling
    - Recognize React event handler types (`MouseEventHandler`, etc.)
    - Support `React.FC` and `React.ComponentType` prop types
    - Handle custom hook return types
    - Support `forwardRef` and `useImperativeHandle` patterns
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 7.2 Implement Vue-specific type handling
    - Support Vue 3 `defineProps` with TypeScript
    - Recognize Pinia store actions and getters
    - Support `emit` function types
    - Handle Vue SFC `<script setup>` syntax
    - _Requirements: 7.1, 7.2_
  
  - [x] 7.3 Implement Svelte-specific type handling
    - Support Svelte component prop types
    - Recognize Svelte store subscriptions
    - Support event dispatcher types
    - Handle Svelte's reactive declarations
    - _Requirements: 7.1, 7.2_

- [ ]* 8. Write unit tests for TypeClassifier
  - Test arrow function type detection
  - Test named function type detection (MouseEventHandler, etc.)
  - Test union type handling
  - Test callable interface detection
  - Test edge cases: `any`, `unknown`, `never`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 9. Write unit tests for LanguageServerClient
  - Mock VS Code API responses
  - Test successful type queries
  - Test error scenarios (Language Server unavailable, file not found)
  - Test TypeScript configuration errors
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.4_

- [ ]* 10. Write integration tests
  - Test React component with typed props
  - Test Vue component with Pinia store
  - Test Svelte component with stores
  - Test custom hook return values
  - Test error handling with missing type information
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4_

- [ ]* 11. Create acceptance test samples
  - Create `examples/react-vite/src/components/005-CustomComponentProps.tsx`
  - Create `examples/vue-vite/src/components/005-PiniaStoreProps.vue`
  - Create `examples/svelte-vite/src/components/005-StoreProps.svelte`
  - Add YAML specifications for each sample
  - Verify parser correctly identifies function vs value props
  - _Requirements: 1.3, 1.4, 7.1, 7.2_

**Note:** Configuration support (task 8) has been removed as the type resolution feature is always enabled by default.
