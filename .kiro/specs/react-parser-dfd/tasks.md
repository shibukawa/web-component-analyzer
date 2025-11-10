# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Install `@swc/core` package for AST parsing
  - Create directory structure: `src/parser/`, `src/analyzers/`, `src/utils/`
  - Define TypeScript interfaces in `src/parser/types.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement AST Parser with SWC
  - Create `src/parser/ast-parser.ts` with `ASTParser` interface
  - Implement `parseSourceCode()` method using SWC's `parseSync()`
  - Configure SWC options for TypeScript and JSX support
  - Handle file extension detection (.tsx, .ts, .jsx, .js)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement Props Analyzer
  - Create `src/analyzers/props-analyzer.ts`
  - Extract props from functional component parameters
  - Handle destructured props syntax
  - Extract TypeScript type annotations
  - Resolve interface and type definitions for props
  - Extract props from class components
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Implement Hook Registry
  - Create `src/utils/hook-registry.ts` with `HookRegistry` interface
  - Define `HookCategory` type
  - Pre-register React built-in hooks (useState, useEffect, useContext, etc.)
  - Pre-register third-party hooks (useSWR, useQuery, useAtom, useStore, useSelector, useForm, useNavigate, useFormState)
  - Implement `getHookCategory()` and `registerHook()` methods
  - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3_

- [x] 5. Implement Hooks Analyzer
  - Create `src/analyzers/hooks-analyzer.ts`
  - Identify hook calls in AST (CallExpression nodes)
  - Extract variable names from destructuring assignments
  - Extract dependencies arrays from hook calls
  - Detect read-write pair patterns ([value, setValue])
  - Classify useContext based on variable patterns (read-only, read-write, function-only)
  - Use Hook Registry to categorize hooks
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3_

- [x] 6. Implement Process Analyzer
  - Create `src/analyzers/process-analyzer.ts`
  - Identify useEffect, useCallback, useMemo hooks
  - Extract event handler functions (arrow functions and function declarations)
  - Extract custom functions defined in component
  - Analyze variable references within functions
  - Detect external function calls (e.g., api.sendData, logger.log)
  - Distinguish internal vs external function calls
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6.1 Extract inline callbacks from JSX
  - Traverse JSX attributes to find inline arrow functions and function expressions
  - Extract inline callbacks from event handlers (onClick, onChange, etc.)
  - Analyze variable references within inline callbacks
  - Generate process nodes for inline callbacks
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Implement JSX Analyzer
  - Create `src/analyzers/jsx-analyzer.ts`
  - Identify JSX return statements in functional components
  - Identify render method return in class components
  - Implement JSX simplification algorithm
  - Replace text content with {TEXT} placeholders
  - Replace expressions with {VAR:variableName} placeholders
  - Maintain JSX hierarchy structure
  - Extract placeholder information with variable references
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8. Implement AST Analyzer
  - Create `src/parser/ast-analyzer.ts` with `ASTAnalyzer` interface
  - Implement AST traversal using visitor pattern
  - Identify React component definitions (functional and class)
  - Extract component name
  - Coordinate calls to Props, Hooks, Process, and JSX analyzers
  - Return `ComponentAnalysis` object
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 9. Implement DFD Builder
  - Create `src/parser/dfd-builder.ts` with `DFDBuilder` interface
  - Create nodes for props (external-entity-input)
  - Create nodes for useContext based on classification
  - Create nodes for data fetching hooks (external-entity-input)
  - Create nodes for state hooks (data-store)
  - Create nodes for state management hooks (data-store)
  - Create nodes for form hooks (data-store)
  - Create nodes for routing hooks (external-entity-input)
  - Create nodes for server actions (external-entity-input)
  - Create nodes for processes (useEffect, useCallback, useMemo, handlers, functions)
  - Create nodes for external function calls (external-entity-output)
  - Create nodes for JSX output (external-entity-output)
  - Infer edges from external entities to processes
  - Infer edges from processes to data stores
  - Infer edges from data stores to processes
  - Infer edges from processes to external outputs
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Fix useState node generation
  - Modify `createStateNode()` to only create nodes for state variables (e.g., `count`)
  - Do not create separate nodes for setter functions (e.g., `setCount`)
  - Setter functions should only be used for edge inference
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 9.2 Add edges from data stores to JSX output
  - Implement edge inference from state variables to JSX output
  - Check JSX placeholders for references to state variables
  - Create edges: data-store → JSX output when state is displayed
  - _Requirements: 6.4, 6.5_

- [x] 9.3 Add edges for inline callback processes
  - Create edges from JSX output to inline callback processes
  - Create edges from inline callback processes to data stores (when calling setters)
  - Handle the flow: JSX → inline callback → state update
  - _Requirements: 6.4, 6.5_

- [x] 10. Implement Error Handler
  - Create `src/utils/error-handler.ts` with `ParserErrorHandler` class
  - Handle syntax errors with descriptive messages
  - Handle component not found scenarios
  - Implement timeout protection (5 seconds)
  - Return partial results on timeout
  - Log error details for debugging
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 11. Implement Main Parser
  - Create `src/parser/index.ts` with `ReactParser` interface
  - Implement `parse()` method coordinating all components
  - Integrate AST Parser, AST Analyzer, and DFD Builder
  - Apply timeout protection
  - Handle errors gracefully
  - Return `DFDSourceData` with nodes, edges, and errors
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 12. Integrate parser with VS Code extension
  - Update `src/extension.ts` to import ReactParser
  - Modify command handler to use ReactParser
  - Pass source code and file path to parser
  - Handle parser errors and display to user
  - Pass DFD data to webview for visualization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 13. Create test fixtures
  - Create `src/test/fixtures/` directory
  - Create `simple-functional.tsx` with basic functional component
  - Create `with-hooks.tsx` with useState and useEffect
  - Create `class-component.tsx` with class component
  - Create `complex-component.tsx` for timeout testing
  - Create `with-context.tsx` with various useContext patterns
  - _Requirements: All_

- [ ]* 13.1 Create third-party library test fixtures
  - Create `with-third-party.tsx` with useSWR and useAtom
  - Create `with-form.tsx` with React Hook Form
  - Create `with-router.tsx` with React Router hooks
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3_

- [x] 14. Write unit tests for AST Parser
  - Test parsing valid TypeScript files
  - Test parsing valid JavaScript files
  - Test handling syntax errors
  - Test .tsx and .jsx file support
  - Test SWC configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 15. Write unit tests for Props Analyzer
  - Test extracting props from functional components
  - Test extracting props from class components
  - Test handling destructured props
  - Test resolving TypeScript types
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 16. Write unit tests for Hooks Analyzer
  - Test identifying React built-in hooks
  - Test extracting variable names
  - Test extracting dependencies
  - Test detecting read-write pairs
  - Test classifying useContext patterns
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_

- [ ]* 16.1 Write unit tests for third-party hooks
  - Test identifying third-party data fetching hooks
  - Test identifying third-party state management hooks
  - Test identifying form management hooks
  - Test identifying routing hooks
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3_

- [x] 17. Write unit tests for Process Analyzer
  - Test identifying useEffect, useCallback, useMemo
  - Test extracting event handlers
  - Test extracting custom functions
  - Test analyzing variable references
  - Test detecting external function calls
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 17.1 Write unit tests for inline callback extraction
  - Test extracting inline arrow functions from JSX attributes
  - Test extracting inline callbacks from onClick, onChange, etc.
  - Test analyzing variable references within inline callbacks
  - Test detecting setter function calls within inline callbacks
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 18. Write unit tests for JSX Analyzer
  - Test simplifying JSX elements
  - Test replacing text with placeholders
  - Test replacing expressions with variable placeholders
  - Test maintaining hierarchy
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 19. Write unit tests for DFD Builder
  - Test creating correct node types
  - Test inferring edges from variable references
  - Test generating vis.js compatible data
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 19.1 Write unit tests for useState node generation fix
  - Test that useState only creates node for state variable (e.g., `count`)
  - Test that setter functions (e.g., `setCount`) do not create separate nodes
  - Test that setter functions are still used for edge inference
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 19.2 Write unit tests for data store to JSX edges
  - Test edge creation from state variables to JSX output
  - Test detection of state variable references in JSX placeholders
  - Test multiple state variables displayed in JSX
  - _Requirements: 6.4, 6.5_

- [ ] 19.3 Write unit tests for inline callback edges
  - Test edge creation from JSX to inline callback processes
  - Test edge creation from inline callbacks to data stores
  - Test complete flow: JSX → callback → state update
  - _Requirements: 6.4, 6.5_

- [ ] 20. Write integration tests
  - Test end-to-end parsing of simple components
  - Test error handling scenarios
  - Test timeout scenarios
  - Test with test fixtures
  - _Requirements: All_

- [ ]* 20.1 Write integration tests for third-party libraries
  - Test with third-party hook components
  - Test with React Hook Form components
  - Test with React Router components
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3_

- [x] 21. Add useImperativeHandle support
  - [x] 21.1 Update hook registry to include useImperativeHandle
    - Add useImperativeHandle to React built-in hooks with category 'ref'
    - _Requirements: 3.1, 3.2_
  
  - [x] 21.2 Update Process Analyzer to extract useImperativeHandle
    - Modify `extractProcessFromHook()` to handle useImperativeHandle
    - Extract the factory function that returns the imperative handle object
    - Extract dependencies array from useImperativeHandle
    - Create process node with type 'useImperativeHandle'
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 21.3 Update type definitions for useImperativeHandle
    - Add 'useImperativeHandle' to ProcessInfo type union
    - Ensure ProcessInfo supports useImperativeHandle metadata
    - _Requirements: 4.1_
  
  - [x] 21.4 Write unit tests for useImperativeHandle extraction
    - Test extracting useImperativeHandle as a process
    - Test extracting dependencies from useImperativeHandle
    - Test processes calling imperative handle methods (in useEffect, useCallback)
    - Test ref.current.method() call patterns
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 22. Add custom hooks support (depends on typescript-type-resolver spec completion)
  - [x] 22.1 Integrate TypeResolver for custom hook analysis
    - Import TypeResolver from typescript-type-resolver spec
    - Query type information for custom hook return values
    - Classify returned values as functions or data using type information
    - Handle custom hooks without type information gracefully
    - _Requirements: 3.1, 3.2, 4.1_
  
  - [x] 22.2 Update Hooks Analyzer to classify custom hook return values
    - Detect custom hook calls (hooks not in registry)
    - Extract destructured return values from custom hooks
    - Use TypeResolver to classify each return value as function or data
    - Store classification metadata with hook information
    - _Requirements: 3.1, 3.2, 4.1_
  
  - [x] 22.3 Update DFD Builder to create unified nodes for custom hooks
    - Create single data-store node for custom hook (similar to useState)
    - Include only data values in the node (e.g., `count`, `value`)
    - Exclude function values from node creation (e.g., `increment`, `setValue`)
    - Store function names as write methods for edge inference
    - Handle custom hooks with multiple data values
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 22.4 Update edge inference for custom hook functions
    - Create edges from processes to data-store when custom hook functions are called
    - Detect custom hook function calls in useEffect, useCallback, event handlers
    - Handle patterns like `increment()`, `setValue(newValue)`, `reset()`
    - Track data flow: process → custom hook function → data store
    - _Requirements: 6.4, 6.5_
  
  - [x] 22.5 Update Process Analyzer to handle custom hook functions
    - Detect when custom hook return values are called as functions
    - Create appropriate edges for custom hook function calls
    - Track data flow from custom hooks to processes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 22.6 Write unit tests for custom hook node unification
    - Test creating single data-store node for custom hook
    - Test excluding function values from node
    - Test including only data values in node
    - Test edge creation from processes to custom hook data store
    - Test multiple custom hooks in same component
    - _Requirements: 3.1, 3.2, 4.1, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 22.7 Write unit tests for custom hook analysis
    - Test extracting custom hook calls
    - Test classifying custom hook return values (function vs value)
    - Test processes calling custom hook functions
    - Test cleanup functions calling custom hook methods
    - Test multiple custom hooks in same component
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4_

- [x] 23. Add useLayoutEffect and useInsertionEffect support
  - [x] 23.1 Update hook registry to include useLayoutEffect and useInsertionEffect
    - Verify useLayoutEffect is already in React built-in hooks with category 'effect'
    - Add useInsertionEffect to React built-in hooks with category 'effect'
    - _Requirements: 3.1, 3.2_
  
  - [x] 23.2 Update Process Analyzer to extract useLayoutEffect and useInsertionEffect
    - Modify `extractProcessFromHook()` to handle useLayoutEffect (if not already supported)
    - Modify `extractProcessFromHook()` to handle useInsertionEffect
    - Extract effect function and dependencies (same as useEffect)
    - Extract cleanup functions (same as useEffect)
    - Create process nodes with types 'useLayoutEffect' and 'useInsertionEffect'
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 23.3 Update type definitions for useLayoutEffect and useInsertionEffect
    - Add 'useLayoutEffect' to ProcessInfo type union (if not already present)
    - Add 'useInsertionEffect' to ProcessInfo type union
    - Ensure ProcessInfo supports these effect types
    - _Requirements: 4.1_
  
  - [x] 23.4 Create sample components with useLayoutEffect and useInsertionEffect
    - Create `examples/react-vite/src/components/LayoutEffectExample.tsx`
    - Create `examples/react-vite/src/components/InsertionEffectExample.tsx`
    - Demonstrate useLayoutEffect for DOM measurements
    - Demonstrate useInsertionEffect for CSS-in-JS
    - Include cleanup functions in examples
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 23.5 Write unit tests for useLayoutEffect and useInsertionEffect
    - Test extracting useLayoutEffect as a process
    - Test extracting useInsertionEffect as a process
    - Test extracting dependencies from both hooks
    - Test cleanup function extraction for both hooks
    - Test edge inference for both effect types
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 24. Enhance useContext support with type-based classification (depends on typescript-type-resolver spec completion)
  - [x] 24.1 Integrate TypeResolver for useContext value analysis
    - Import TypeResolver from typescript-type-resolver spec
    - Query type information for context values
    - Classify destructured context values as functions or data using type information
    - Handle contexts without type information gracefully
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_
  
  - [x] 24.2 Update Hooks Analyzer to classify useContext return values
    - Detect useContext calls with destructuring patterns
    - Extract all destructured values from context
    - Use TypeResolver to classify each value as function or data
    - Store classification metadata with hook information
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_
  
  - [x] 24.3 Update DFD Builder to create unified nodes for useContext
    - Create single data-store node for useContext (similar to useState and custom hooks)
    - Include only data values in the node (e.g., `user`, `theme`, `isAuthenticated`)
    - Exclude function values from node creation (e.g., `login`, `logout`, `updateProfile`)
    - Store function names as write methods for edge inference
    - Handle contexts with multiple data values
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2_
  
  - [x] 24.4 Update edge inference for useContext functions
    - Create edges from processes to data-store when context functions are called
    - Detect context function calls in useEffect, useCallback, event handlers
    - Handle patterns like `login(credentials)`, `logout()`, `updateProfile(data)`
    - Track data flow: process → context function → data store
    - _Requirements: 6.4, 6.5, 7.1, 7.2_
  
  - [x] 24.5 Create sample components with typed useContext
    - Create `examples/react-vite/src/contexts/AuthContext.tsx`
    - Create `examples/react-vite/src/components/AuthConsumer.tsx`
    - Demonstrate context with both data and function values
    - Show destructuring patterns: `{ user, login, logout }`
    - Include examples of calling context functions
    - _Requirements: 3.3, 3.4, 7.1, 7.2_
  
  - [ ]* 24.6 Write unit tests for useContext type-based classification
    - Test creating single data-store node for useContext
    - Test excluding function values from node
    - Test including only data values in node
    - Test edge creation from processes to context data store
    - Test multiple useContext calls in same component
    - Test read-only, read-write, and function-only context patterns
    - _Requirements: 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

- [x] 25. Enhance useReducer support with unified node creation (depends on typescript-type-resolver spec completion)
  - [x] 25.1 Integrate TypeResolver for useReducer state analysis
    - Import TypeResolver from typescript-type-resolver spec
    - Query type information for reducer state object
    - Identify all properties in the state object
    - Classify state properties as data values
    - _Requirements: 3.1, 3.2_
  
  - [x] 25.2 Update Hooks Analyzer to extract useReducer state properties
    - Detect useReducer calls with destructuring: `[state, dispatch]`
    - Extract state variable name
    - Use TypeResolver to get state object type definition
    - Extract all property names from state type
    - Store state properties metadata with hook information
    - _Requirements: 3.1, 3.2_
  
  - [x] 25.3 Update DFD Builder to create unified node for useReducer
    - Create single data-store node for useReducer (similar to useState)
    - Include all state properties in the node (e.g., `count`, `loading`, `error`)
    - Exclude dispatch function from node creation
    - Store dispatch function name as write method for edge inference
    - Handle reducers with multiple state properties
    - Node label should represent the reducer state (e.g., "counterState" or state variable name)
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 25.4 Update edge inference for useReducer dispatch calls
    - Create edges from processes to data-store when dispatch is called
    - Detect dispatch calls in useEffect, useCallback, event handlers
    - Handle patterns like `dispatch({ type: 'INCREMENT' })`, `dispatch(action)`
    - Track data flow: process → dispatch → reducer state
    - _Requirements: 6.4, 6.5_
  
  - [x] 25.5 Create sample components with useReducer
    - Create `examples/react-vite/src/components/ReducerCounter.tsx`
    - Demonstrate useReducer with multiple state properties
    - Show dispatch calls in event handlers and effects
    - Include complex state object (e.g., `{ count, step, history }`)
    - _Requirements: 3.1, 3.2, 6.1, 6.2_
  
  - [ ]* 25.6 Write unit tests for useReducer unified node creation
    - Test creating single data-store node for useReducer
    - Test including all state properties in node
    - Test excluding dispatch function from node
    - Test edge creation from processes to reducer state
    - Test multiple useReducer calls in same component
    - Test reducers with complex state objects
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 26. Classify read-only hooks as external-entity-input
  - [ ] 26.1 Identify read-only hook patterns
    - Detect hooks with no arguments that return only data values
    - Identify hooks that return only read-only values (no setter functions)
    - Handle patterns: `const value = useCustomHook()`, `const { data } = useCustomHook()`
    - Apply to: custom hooks, useContext, useReducer (state only), useImperativeHandle, third-party hooks
    - _Requirements: 3.1, 3.2, 6.1, 6.2_
  
  - [ ] 26.2 Update Hooks Analyzer to detect read-only patterns
    - Check if hook has no arguments (or only config/options arguments)
    - Analyze return values to determine if all are data (no functions)
    - Use variableTypes map to identify data-only returns
    - Mark hooks as read-only when appropriate
    - Add `isReadOnly` flag to HookInfo
    - _Requirements: 3.1, 3.2_
  
  - [ ] 26.3 Update DFD Builder to create external-entity-input nodes for read-only hooks
    - Check `isReadOnly` flag when creating hook nodes
    - Create external-entity-input nodes instead of data-store for read-only hooks
    - Handle both single value and destructured returns
    - Apply to custom hooks, useContext, useImperativeHandle, third-party hooks
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 26.4 Update edge inference for read-only hooks
    - Create edges from external-entity-input to processes (reads)
    - Create edges from external-entity-input to JSX output (displays)
    - No write edges should be created for read-only hooks
    - _Requirements: 6.4, 6.5_
  
  - [ ] 26.5 Create sample components with read-only hooks
    - Create `examples/react-vite/src/components/ReadOnlyHooks.tsx`
    - Demonstrate useContext with read-only data
    - Show custom hook returning only data
    - Include useImperativeHandle pattern
    - Show third-party hook with read-only data (e.g., useQuery)
    - _Requirements: 3.1, 3.2, 6.1, 6.2_
  
  - [ ]* 26.6 Write unit tests for read-only hook classification
    - Test detecting read-only custom hooks
    - Test creating external-entity-input nodes
    - Test edge creation for read-only hooks
    - Test mixed read-only and read-write hooks
    - Test useContext with read-only data
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_
