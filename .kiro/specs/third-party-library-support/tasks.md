# Implementation Plan

- [x] 1. Set up core infrastructure for library adapter system
  - Create type definitions for library adapters and import detection
  - Define interfaces for LibraryAdapter, HookAdapter, ReturnValuePattern, ImportInfo
  - Create configuration schema for library adapters JSON format
  - _Requirements: 8, 12_

- [x] 2. Implement Import Detector
  - [x] 2.1 Create import-detector.ts with ImportDetector interface
    - Implement detectImports() to traverse module and extract import statements
    - Handle named imports, default imports, and namespace imports
    - Track import aliases for proper matching
    - _Requirements: 13_
  
  - [x] 2.2 Implement getActiveLibraries() method
    - Filter imports to identify registered third-party libraries
    - Return list of active library names for current file
    - _Requirements: 13_
  
  - [ ]* 2.3 Write unit tests for Import Detector
    - Test named imports extraction
    - Test default imports extraction
    - Test namespace imports extraction
    - Test aliased imports tracking
    - Test scoped package names (@tanstack/react-query)
    - _Requirements: 14_

- [x] 3. Set up library adapter configuration foundation
  - [x] 3.1 Create library-adapters.json file structure
    - Create packages/analyzer/src/config/library-adapters.json
    - Set up JSON schema with libraries array
    - _Requirements: 12_


- [x] 4. Implement library adapter system
  - [x] 4.1 Create library-adapters.ts with adapter interfaces
    - Implement LibraryAdapter, HookAdapter, ReturnValuePattern types
    - Create adapter validation logic
    - Implement JSON adapter loading
    - _Requirements: 12_
  
  - [x] 4.2 Create adapter registry
    - Implement adapter registration by library name
    - Implement adapter lookup by library name and hook name
    - Support multiple package patterns per library
    - _Requirements: 12_
  
  - [ ]* 4.3 Write unit tests for adapter system
    - Test adapter registration and lookup
    - Test adapter validation
    - Test JSON loading and parsing
    - Test pattern matching for object and array destructuring
    - _Requirements: 14_

- [x] 5. Enhance Hook Registry
  - [x] 5.1 Add library adapter support to hook-registry.ts
    - Add registerLibraryAdapter() method
    - Add getLibraryAdapter() method
    - Add activateLibrary() and deactivateLibrary() methods
    - Add getActiveLibraries() method
    - _Requirements: 12, 13_
  
  - [x] 5.2 Integrate adapter registry with existing category system
    - Maintain backward compatibility with getHookCategory()
    - Prioritize adapter-based classification over category-based
    - _Requirements: 12_
  
  - [ ]* 5.3 Write unit tests for enhanced Hook Registry
    - Test adapter registration and retrieval
    - Test library activation/deactivation
    - Test fallback to category-based classification
    - Test backward compatibility
    - _Requirements: 14_

- [x] 6. Enhance Hooks Analyzer
  - [x] 6.1 Add library adapter application to hooks-analyzer.ts
    - Add setActiveLibraries() method
    - Implement applyLibraryAdapter() method
    - Implement extractReturnValueMappings() method
    - Create EnrichedHookInfo type extending HookInfo
    - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11_
  
  - [x] 6.2 Integrate adapter application into analyzeHooks()
    - Check for library adapters before category-based classification
    - Apply adapter patterns to extract return value mappings
    - Generate EnrichedHookInfo with library metadata
    - Fall back to existing classification for unmatched hooks
    - _Requirements: 12, 13_
  
  - [ ]* 6.3 Write unit tests for enhanced Hooks Analyzer
    - Test library adapter application for each supported library
    - Test return value mapping extraction
    - Test EnrichedHookInfo generation
    - Test fallback behavior
    - _Requirements: 14_


- [x] 7. Integrate Import Detector with AST Analyzer
  - [x] 7.1 Update ast-analyzer.ts to use Import Detector
    - Call Import Detector at start of analyze() method
    - Extract active libraries from imports
    - Pass active libraries to Hooks Analyzer
    - _Requirements: 13_
  
  - [x] 7.2 Update Hooks Analyzer instantiation
    - Pass active libraries to SWCHooksAnalyzer constructor or via setter
    - Ensure library context is available during hook analysis
    - _Requirements: 13_
  
  - [ ]* 7.3 Write integration tests for import detection flow
    - Test end-to-end import detection and library activation
    - Test with components using multiple libraries
    - Test with components using no third-party libraries
    - _Requirements: 14_

- [x] 8. Enhance DFD Builder
  - [x] 8.1 Add library hook support to dfd-builder.ts
    - Implement buildNodesFromLibraryHook() method
    - Implement applyLibraryMetadata() method
    - Handle EnrichedHookInfo with return value mappings
    - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11_
  
  - [x] 8.2 Update existing hook node generation
    - Check if hook has library mappings before default generation
    - Apply library-specific node labels and metadata
    - Maintain backward compatibility for non-library hooks
    - _Requirements: 12_
  
  - [ ]* 8.3 Write unit tests for enhanced DFD Builder
    - Test node generation from library hooks
    - Test metadata application
    - Test backward compatibility
    - _Requirements: 14_

- [x] 9. Add SWR library support
  - [x] 9.1 Define SWR adapters in library-adapters.json
    - Add adapters for useSWR (data, error, isLoading, mutate)
    - Add adapters for useSWRMutation (data, error, trigger, isMutating)
    - _Requirements: 1_
  
  - [x] 9.2 Create 101-SWR-BasicFetch.tsx acceptance test
    - Component using useSWR for data fetching
    - Include embedded YAML specification
    - Verify data, error, isLoading nodes are created
    - _Requirements: 1, 14_
  
  - [x] 9.3 Create 102-SWR-Mutation.tsx acceptance test
    - Component using useSWRMutation
    - Include embedded YAML specification
    - Verify trigger process node is created
    - _Requirements: 1, 14_
  
  - [x] 9.4 Consolidate useSWR return values into single node
    - Modify DFD Builder to group useSWR destructured values (data, error, isLoading, mutate) into one node labeled "useSWR<resource>"
    - Add labeled edges for each property reference (e.g., "display: data", "display: error", "display: isLoading")
    - Follow the same pattern as useReducer state properties
    - _Requirements: 1_
  
  - [x] 9.5 Support early return conditional JSX patterns
    - Enhance conditional structure extractor to recognize early return patterns: `if (condition) { return <JSX>; }`
    - Create conditional subgraph for early return JSX with the condition variable
    - Ensure condition variables (e.g., `error`) are properly linked to the conditional output
    - _Requirements: 1_
  
  - [x] 9.6 Add external API endpoint nodes for data fetching hooks
    - Extract API endpoint from useSWR key parameter (e.g., "/api/user")
    - Create external entity input node labeled "Server: /api/user"
    - Add data flow from Server node to useSWR node
    - Apply same pattern to other data fetching libraries (TanStack Query, Apollo, RTK Query, tRPC)
    - _Requirements: 1_
  
  - [x] 9.7 Connect fetcher function dependencies to library hook nodes
    - Detect when useSWR/useQuery depends on a fetcher function
    - Analyze fetcher function to identify its dependencies (props, state, etc.)
    - Create data flow edges from dependencies to library hook node
    - Example: If fetcher uses `url` prop, create edge from `url` prop to `useSWR` node
    - Apply same pattern to other data fetching libraries
    - _Requirements: 1_

- [x] 10. Add TanStack Query library support
  - [x] 10.1 Define TanStack Query adapters in library-adapters.json
    - Add adapters for useQuery (data, error, isLoading, isFetching, refetch)
    - Add adapters for useMutation (mutate, mutateAsync, data, error, isLoading)
    - Add adapters for useInfiniteQuery
    - _Requirements: 2_
  
  - [x] 10.2 Create 103-TanStackQuery-BasicQuery.tsx acceptance test
    - Component using useQuery
    - Include embedded YAML specification
    - Verify data, isLoading, isError nodes are created
    - _Requirements: 2, 14_
  
  - [x] 10.3 Create 104-TanStackQuery-Mutation.tsx acceptance test
    - Component using useMutation
    - Include embedded YAML specification
    - Verify mutate process node is created
    - _Requirements: 2, 14_

- [x] 11. Add React Router library support
  - [x] 11.1 Define React Router adapters in library-adapters.json
    - Add adapters for useNavigate (returns navigation function)
    - Add adapters for useParams (returns route parameters object)
    - Add adapters for useLocation (returns location object)
    - Add adapters for useSearchParams (returns [searchParams, setSearchParams])
    - _Requirements: 3_
  
  - [x] 11.2 Create 105-ReactRouter-Navigation.tsx acceptance test
    - Component using useNavigate, useParams, useLocation
    - Include embedded YAML specification
    - Verify navigate process and params input nodes are created
    - _Requirements: 3, 14_
  
  - [x] 11.3 Create 106-ReactRouter-SearchParams.tsx acceptance test
    - Component using useSearchParams
    - Include embedded YAML specification
    - Verify searchParams input and setSearchParams process nodes
    - _Requirements: 3, 14_

- [x] 12. Add Next.js routing library support
  - [x] 12.1 Define Next.js adapters in library-adapters.json
    - Add adapters for useRouter from next/navigation (returns router object with methods)
    - Add adapters for usePathname (returns pathname string)
    - Add adapters for useSearchParams from next/navigation (returns searchParams object)
    - Add adapters for useParams from next/navigation (returns params object)
    - _Requirements: 4_
  
  - [x] 12.2 Create 107-NextJS-Routing.tsx acceptance test
    - Component using useRouter, usePathname from next/navigation
    - Include embedded YAML specification
    - Verify pathname input and router process nodes are created
    - _Requirements: 4, 14_
  
  - [x] 12.3 Create 108-NextJS-SearchParams.tsx acceptance test
    - Component using useSearchParams, useParams from next/navigation
    - Include embedded YAML specification
    - Verify params and searchParams input nodes
    - _Requirements: 4, 14_

- [x] 12.5 Add TanStack Router library support
  - [x] 12.5.1 Create TanStack Router library processor
    - Create packages/analyzer/src/libraries/tanstack-router.ts
    - Implement TanStackRouterLibraryProcessor class
    - Handle useRouter hook (returns router object with methods)
    - Handle useRouterState hook (returns router state object)
    - Handle useSearch hook (returns search parameters)
    - Handle useParams hook (returns route parameters)
    - Handle useNavigate hook (returns navigate function)
    - Handle useLocation hook (returns location object)
    - _Requirements: 3_
  
  - [x] 12.5.2 Register TanStack Router processor in library index
    - Add import for TanStackRouterLibraryProcessor in packages/analyzer/src/libraries/index.ts
    - Register processor in registerDefaultProcessors() function
    - Export processor class
    - _Requirements: 3_
  
  - [x] 12.5.3 Create 109-TanStackRouter-Navigation.tsx acceptance test
    - Component using useRouter, useNavigate, useLocation
    - Include embedded YAML specification
    - Verify navigate process and location input nodes are created
    - _Requirements: 3, 14_
  
  - [x] 12.5.4 Create 110-TanStackRouter-SearchParams.tsx acceptance test
    - Component using useSearch and useParams
    - Include embedded YAML specification
    - Verify search and params input nodes
    - _Requirements: 3, 14_
  
  - [x] 12.5.5 Create 111-TanStackRouter-State.tsx acceptance test
    - Component using useRouterState
    - Include embedded YAML specification
    - Verify router state data store node
    - _Requirements: 3, 14_

- [x] 13. Add React Hook Form library support
  - [x] 13.1 Define React Hook Form adapters in library-adapters.json
    - Add adapters for useForm (register, handleSubmit, formState, setValue, reset)
    - Add adapters for useController (field, fieldState)
    - Add adapters for useWatch (returns watched field value)
    - Add adapters for useFormState (formState object)
    - _Requirements: 5_
  
  - [x] 13.2 Create 109-ReactHookForm-BasicForm.tsx acceptance test
    - Component using useForm
    - Include embedded YAML specification
    - Verify formState data stores and register/handleSubmit processes
    - _Requirements: 5, 14_
  
  - [x] 13.3 Create 110-ReactHookForm-Controller.tsx acceptance test
    - Component using useController
    - Include embedded YAML specification
    - Verify field state data store
    - _Requirements: 5, 14_

- [x] 14. Add Zustand library support
  - [x] 14.1 Define Zustand adapters in library-adapters.json
    - Add generic adapter pattern for Zustand store hooks
    - Support selector-based state access
    - Handle store actions as processes
    - _Requirements: 6_
  
  - [x] 14.2 Create 111-Zustand-StateManagement.tsx acceptance test
    - Component using Zustand store hook
    - Include embedded YAML specification
    - Verify selected state input and action process nodes
    - _Requirements: 6, 14_
  
  - [x] 14.3 Create 112-Zustand-Selectors.tsx acceptance test
    - Component using multiple selectors from same store
    - Include embedded YAML specification
    - Verify multiple state input nodes
    - _Requirements: 6, 14_

- [x] 17. Add Jotai library support
  - [x] 17.1 Define Jotai adapters in library-adapters.json
    - Add adapters for useAtom (returns [value, setValue])
    - Add adapters for useAtomValue (returns value)
    - Add adapters for useSetAtom (returns setValue function)
    - _Requirements: 7_
  
  - [x] 17.2 Create 170-Jotai-AtomicState.tsx acceptance test
    - Component using useAtom
    - Include embedded YAML specification
    - Verify atom value input and setter process nodes
    - _Requirements: 7, 14_
  
  - [x] 17.3 Create 171-Jotai-ReadWrite.tsx acceptance test
    - Component using useAtomValue and useSetAtom
    - Include embedded YAML specification
    - Verify read-only input and write-only process nodes
    - _Requirements: 7, 14_

- [ ] 17.5 Refactor Jotai to use useState-like structure
  - [x] 17.5.1 Modify Jotai processor to create data-store nodes for atoms
    - Create data-store node named after the atom (e.g., "countAtom")
    - For useAtom: create "reads" edge from atom to value variable, "set" edge from setter to atom
    - For useAtomValue: create "reads" edge from atom to value variable
    - For useSetAtom: create "set" edge from setter to atom
    - Consolidate multiple hooks using the same atom into a single atom node
    - _Requirements: 7_
  
  - [x] 17.5.2 Update 170-Jotai-AtomicState.tsx acceptance test
    - Update YAML specification to reflect new structure
    - Verify countAtom data-store node is created
    - Verify "reads" and "set" edges are created
    - _Requirements: 7, 14_
  
  - [x] 17.5.3 Update 171-Jotai-ReadWrite.tsx acceptance test
    - Update YAML specification to reflect new structure
    - Verify textAtom data-store node is created
    - Verify separate useAtomValue and useSetAtom hooks reference the same atom node
    - _Requirements: 7, 14_
  
  - [x] 17.5.4 Create 172-Jotai-DerivedAtom.tsx acceptance test
    - Component using derived atom (atom that reads from other atoms)
    - Include embedded YAML specification
    - Verify base atom data-store node is created
    - Verify derived atom data-store node is created
    - Verify "reads" edge from base atom to derived atom
    - Verify "reads" edge from derived atom to component variable
    - _Requirements: 7, 14_
  
  - [x] 17.5.5 Implement derived atom dependency detection
    - Detect when an atom definition reads from other atoms (using `get()` function)
    - Parse atom definitions to extract dependencies
    - Store atom dependencies in metadata during AST analysis
    - Create "reads" edges between dependent atoms in DFD builder
    - _Requirements: 7_

- [ ] 15. Add MobX library support
  - [ ] 15.1 Define MobX adapters in library-adapters.json
    - Add adapters for useObserver
    - Add adapters for useLocalObservable
    - Handle observable state access patterns
    - _Requirements: 8_
  
  - [ ] 15.2 Create 150-MobX-ObservableState.tsx acceptance test
    - Component using observer HOC with observable state
    - Include embedded YAML specification
    - Verify observable state input and action process nodes
    - _Requirements: 8, 14_
  
  - [ ] 15.3 Create 151-MobX-LocalObservable.tsx acceptance test
    - Component using useLocalObservable
    - Include embedded YAML specification
    - Verify local observable state nodes
    - _Requirements: 8, 14_

- [ ] 16. Add Apollo Client library support
  - [ ] 16.1 Define Apollo Client adapters in library-adapters.json
    - Add adapters for useQuery (data, loading, error, refetch, fetchMore)
    - Add adapters for useMutation (mutation function, data, loading, error)
    - Add adapters for useSubscription (data, loading, error)
    - Add adapters for useLazyQuery
    - _Requirements: 9_
  
  - [ ] 16.2 Create 160-Apollo-GraphQLQuery.tsx acceptance test
    - Component using useQuery from Apollo Client
    - Include embedded YAML specification
    - Verify query data input and loading/error state nodes
    - _Requirements: 9, 14_
  
  - [ ] 16.3 Create 161-Apollo-Mutation.tsx acceptance test
    - Component using useMutation from Apollo Client
    - Include embedded YAML specification
    - Verify mutation process node
    - _Requirements: 9, 14_

- [ ] 18. Add RTK Query library support
  - [ ] 18.1 Define RTK Query adapters in library-adapters.json
    - Add pattern for generated query hooks (use*Query)
    - Add pattern for generated mutation hooks (use*Mutation)
    - Support data, isLoading, isFetching, isError states
    - _Requirements: 10_
  
  - [ ] 18.2 Create 180-RTKQuery-APIEndpoint.tsx acceptance test
    - Component using generated query hook (e.g., useGetUserQuery)
    - Include embedded YAML specification
    - Verify query data input and loading state nodes
    - _Requirements: 10, 14_
  
  - [ ] 18.3 Create 181-RTKQuery-Mutation.tsx acceptance test
    - Component using generated mutation hook (e.g., useUpdateUserMutation)
    - Include embedded YAML specification
    - Verify mutation trigger process node
    - _Requirements: 10, 14_

- [ ] 19. Add tRPC library support
  - [ ] 19.1 Define tRPC adapters in library-adapters.json
    - Add pattern for trpc.*.useQuery hooks
    - Add pattern for trpc.*.useMutation hooks
    - Support nested procedure paths
    - _Requirements: 11_
  
  - [ ] 19.2 Create 190-tRPC-TypeSafeProcedure.tsx acceptance test
    - Component using trpc.procedure.useQuery
    - Include embedded YAML specification
    - Verify procedure data input and loading state nodes
    - _Requirements: 11, 14_
  
  - [ ] 19.3 Create 191-tRPC-Mutation.tsx acceptance test
    - Component using trpc.procedure.useMutation
    - Include embedded YAML specification
    - Verify mutation process node
    - _Requirements: 11, 14_

- [ ] 20. Implement configuration and customization support
  - [ ] 20.1 Create configuration loader
    - Load default adapters from packages/analyzer/src/config/library-adapters.json
    - Check for workspace configuration at .kiro/library-adapters.json
    - Merge configurations with user overrides taking precedence
    - _Requirements: 16_
  
  - [ ] 20.2 Implement configuration validation
    - Validate adapter JSON schema
    - Reject invalid configurations with clear error messages
    - Support "extends", "overrides", "custom", and "disabled" fields
    - _Requirements: 16_
  
  - [ ]* 20.3 Write unit tests for configuration system
    - Test default adapter loading
    - Test user configuration merging
    - Test configuration validation
    - Test disabled libraries
    - _Requirements: 16_


- [ ] 21. Create documentation
  - [ ] 21.1 Create developer documentation
    - Create docs/third-party-library-support.md
    - Document supported libraries with examples
    - Explain library detection mechanism
    - Provide guide for adding new library support
    - Document adapter configuration format
    - _Requirements: 15_
  
  - [ ] 21.2 Update user documentation
    - Update README.md with list of supported libraries
    - Add visual examples of DFD output for popular libraries
    - Link to detailed documentation
    - _Requirements: 15_
  
  - [ ] 21.3 Add API documentation
    - Add JSDoc comments to all new interfaces and methods
    - Document configuration schema
    - Provide code examples in comments
    - _Requirements: 15_

- [ ] 22. Integration and end-to-end testing
  - [ ]* 22.1 Run acceptance tests for all libraries
    - Execute test runner on all acceptance test components
    - Verify DFD output matches YAML specifications
    - Fix any discrepancies
    - _Requirements: 14_
  
  - [ ]* 22.2 Test mixed library scenarios
    - Create component using multiple libraries (e.g., SWR + React Router)
    - Create component with library hooks and built-in React hooks
    - Verify correct DFD generation
    - _Requirements: 14_
  
  - [ ]* 22.3 Test backward compatibility
    - Run existing test suite
    - Verify all existing tests pass
    - Verify components without third-party libraries produce identical output
    - _Requirements: 12_

- [ ] 23. Performance optimization and polish
  - [ ] 23.1 Implement caching for import detection
    - Cache import analysis results per file
    - Invalidate cache on file changes
    - _Requirements: 13_
  
  - [ ] 23.2 Optimize adapter lookup
    - Use Map for O(1) adapter lookup
    - Pre-filter active adapters based on detected imports
    - _Requirements: 12_
  
  - [ ] 23.3 Add error handling and logging
    - Handle malformed import syntax gracefully
    - Log warnings for unrecognized libraries
    - Provide helpful error messages for configuration issues
    - _Requirements: 12, 13, 16_
