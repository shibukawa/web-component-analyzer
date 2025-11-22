# Implementation Plan

- [x] 1. Refactor Vue parser to create shared SFC infrastructure
  - Extract SFC parsing logic from Vue into shared utility that both Vue and Svelte can use
  - Create `packages/analyzer/src/parser/sfc-parser.ts` with framework-agnostic SFC extraction
  - Update Vue parser to use the new shared SFC parser
  - Verify Vue functionality still works with refactored code
  - _Requirements: 1.1, 7.4_

- [x] 1.1 Enhance SFC parser to support Svelte markup extraction
  - Add support for extracting markup without `<template>` tags (Svelte structure)
  - Implement `extractMarkupAfterScript()` method to handle Svelte's inline markup
  - Update SFC parser options to support `extractMarkupWithoutTag` flag
  - Modify Svelte AST analyzer to use new markup extraction method
  - Verify Svelte markup bindings are correctly extracted in acceptance tests
  - _Requirements: 1.1, 5.1, 7.4_

- [x] 2. Set up Svelte framework detection and basic parsing
  - [x] 2.1 Add Svelte file detection to framework detector
    - Update framework detection logic to recognize .svelte files
    - Register Svelte parser in the analyzer's framework detection system
    - _Requirements: 7.2, 7.3_
  
  - [x] 2.2 Create Svelte AST analyzer entry point
    - Create `packages/analyzer/src/parser/svelte-ast-analyzer.ts`
    - Implement basic component analysis structure using shared SFC parser
    - Wire up SWC parser for script section parsing
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 2.3 Create initial acceptance test infrastructure
    - Set up `examples/svelte-vite/` project structure
    - Configure Vite for Svelte 5
    - Create test runner integration for Svelte components
    - _Requirements: 6.1_

- [x] 3. Implement Svelte 5 runes detection
  - [x] 3.1 Create Svelte runes analyzer
    - Create `packages/analyzer/src/analyzers/svelte-runes-analyzer.ts`
    - Implement AST traversal to detect rune function calls
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 3.2 Implement $props() rune detection
    - Detect $props() calls and extract prop definitions
    - Create External Entity Input nodes for each prop
    - Handle TypeScript generic syntax for prop types
    - Create acceptance test: `001-SimpleProps.svelte`
    - _Requirements: 2.1, 6.3_
  
  - [x] 3.3 Implement $state() rune detection
    - Detect $state() calls and extract state variables
    - Create Data Store nodes for each state variable
    - Resolve data types using shared type resolver
    - Create acceptance test: `002-ReactiveState.svelte`
    - _Requirements: 2.2, 6.3_
  
  - [x] 3.4 Implement $derived() rune detection
    - Detect $derived() calls and extract computed values
    - Create Data Store nodes with type "computed"
    - Track dependencies between derived values and state
    - Create acceptance test: `003-DerivedValues.svelte`
    - _Requirements: 2.3, 6.3_
  
  - [x] 3.4.1 Implement $derived() dependency tracking
    - Parse $derived() expressions to extract referenced variables
    - Create data flow edges from source state/stores to derived values (like Vue computed)
    - Update DFD builder to create edges from dependencies to $derived nodes
    - Update acceptance test `003-DerivedValues.mmd` to include dependency edges
    - Verify edges are created: count → doubled, count → tripled
    - _Requirements: 2.3, 6.3_
  
  - [x] 3.5 Implement $effect() rune detection
    - Detect $effect() calls and extract side effects
    - Create Process nodes for each effect
    - Track data flows from state to effects
    - Create acceptance test: `004-Effects.svelte`
    - _Requirements: 2.4, 4.1, 6.3_
  
  - [x] 3.5.1 Improve $effect() labeling and dependency tracking
    - Change effect labels from "effect_1", "effect_2" to simply "effect"
    - Parse $effect() callback expressions to extract referenced variables
    - Create data flow edges from source state/stores to effect processes (like Vue watchers)
    - Update DFD builder to create edges from dependencies to $effect nodes
    - Update acceptance test `004-Effects.mmd` to include dependency edges
    - Verify edges are created: count → effect, message → effect
    - _Requirements: 2.4, 4.1, 6.3_

- [x] 4. Implement Svelte store support
  - [x] 4.1 Create Svelte store analyzer
    - Create `packages/analyzer/src/analyzers/svelte-store-analyzer.ts`
    - Detect writable(), readable(), and derived() store creation
    - Create Data Store nodes for local stores
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [x] 4.2 Implement auto-subscription detection
    - Detect $store syntax in script and markup
    - Create External Entity Input nodes for store subscriptions
    - Create data flows from stores to consuming code
    - Create acceptance test: `005-Stores.svelte` and `006-AutoSubscription.svelte`
    - _Requirements: 3.2, 3.5, 6.4_
  
  - [x] 4.3 Create Svelte store library adapter
    - Create `packages/analyzer/src/libraries/svelte-store.ts`
    - Implement processor for svelte/store imports
    - Register processor in library registry
    - Handle store.set() and store.update() calls
    - _Requirements: 3.1, 3.3_
  
  - [x] 4.4 Implement store to template data flow edges
    - Create data flow edges from stores (writable, readable, derived) to template elements
    - Update DFD builder to create "displays" edges from store nodes to jsx_element nodes
    - Handle auto-subscription syntax ($store) in template bindings
    - Update acceptance test `005-Stores.mmd` to include display edges
    - Verify edges are created: count → <p>, name → <p>, timestamp → <p>, doubleCount → <p>
    - _Requirements: 3.1, 3.2, 3.5, 5.1, 6.4_

- [x] 5. Implement markup analysis
  - [x] 5.1 Create Svelte markup analyzer
    - Create `packages/analyzer/src/analyzers/svelte-markup-analyzer.ts`
    - Implement basic markup parsing infrastructure
    - Reuse patterns from Vue template analyzer where applicable
    - _Requirements: 5.1, 7.5_
  
  - [x] 5.2 Implement expression binding detection
    - Detect {variable} syntax in markup
    - Create External Entity Output nodes with type "template"
    - Create data flows from variables to template output
    - _Requirements: 5.1_
  
  - [x] 5.3 Implement directive detection
    - Detect bind: directives and create bidirectional data flows
    - Detect on: directives and create flows to event handlers
    - Detect class: and style: directives
    - Create acceptance test: `009-MarkupBindings.svelte`
    - _Requirements: 5.2, 5.3, 5.4, 6.5_
  
  - [x] 5.4 Implement control flow detection
    - Detect {#if}, {#each}, {#await} blocks
    - Create data flows from conditional data to template output
    - Create acceptance test: `010-ControlFlow.svelte`
    - _Requirements: 5.5, 6.5_

- [x] 5.5 Implement template output subgraph wrapping
  - Wrap all template output nodes in a `<template>` subgraph (like Vue implementation)
  - Update output node labels to use `<tag>` format (e.g., `<div>`, `<input>`, `<button>`)
  - Extract target element information from markup bindings
  - Create subgraph structure for template elements
  - Update acceptance tests to reflect proper tag formatting
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.5_

- [x] 5.6 Fix data flow edges between state/stores and template elements
  - Update `buildSvelteMarkupEdges` to find template output nodes in subgraph
  - Ensure edges are created from state/stores to jsx_element nodes (not old svelte_markup_output nodes)
  - Update edge finding logic to search for nodes by label and metadata
  - Verify edges are created for expression bindings, class directives, and style directives
  - Run acceptance test 009-MarkupBindings to verify data flows are correct
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.5_

- [x] 6. Implement event dispatching support
  - [x] 6.1 Detect createEventDispatcher usage
    - Detect createEventDispatcher() calls
    - Create External Entity Output nodes for dispatched events
    - Track dispatch() calls and create data flows
    - Create acceptance test: `008-EventDispatch.svelte`
    - _Requirements: 4.2, 4.3, 6.5_

- [x] 7. Implement SvelteKit support
  - [x] 7.1 Create SvelteKit library adapter
    - Create `packages/analyzer/src/libraries/sveltekit.ts`
    - Implement processor for $app/stores imports
    - Register processor in library registry
    - _Requirements: 8.1_
  
  - [x] 7.2 Implement $page store detection
    - Detect $page store usage
    - Create External Entity Input nodes for page.params, page.url, page.data
    - Create data flows from page to consuming code
    - _Requirements: 8.2, 8.4_
  
  - [x] 7.3 Implement navigation detection
    - Detect goto() calls from $app/navigation
    - Create data flows from calling process to navigation output
    - Detect beforeNavigate and afterNavigate hooks
    - Create acceptance test: `007-SvelteKit.svelte`
    - _Requirements: 8.3, 8.4, 6.5_

- [x] 8. Integration and polish
  - [x] 8.1 Integrate Svelte parser with extension
    - Update extension.ts to handle .svelte files
    - Wire up Svelte parser to visualization service
    - Test command execution on Svelte files
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 8.2 Verify DFD output compatibility
    - Ensure Svelte DFD nodes work with existing Mermaid transformer
    - Test webview rendering with Svelte components
    - Verify all node types render correctly
    - _Requirements: 7.1, 7.6_
  
  - [x] 8.3 Run all acceptance tests
    - Execute full acceptance test suite
    - Verify all .mmd reference files match generated output
    - Fix any failing tests
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  
  - [x] 8.4 Error handling and diagnostics
    - Implement SvelteAnalysisError class
    - Add error logging with context
    - Display errors in VS Code as diagnostics
    - Test error cases and recovery
    - _Requirements: 7.1_
  
  - [ ]* 8.5 Documentation and examples
    - Update README with Svelte support information
    - Create user guide for Svelte visualization
    - Document code reuse architecture
    - Add inline code documentation
    - _Requirements: 7.1_
  
  - [x] 8.6 Remove debug logging statements
    - Remove all console.log statements from Svelte analyzers
    - Remove this.log() method calls from Svelte analyzers
    - Remove debug logging from svelte-ast-analyzer.ts (console.log with 🔍 emoji)
    - Remove debug logging from svelte-runes-analyzer.ts (console.log with [SvelteRunesAnalyzer] prefix)
    - Remove debug logging from svelte-store-analyzer.ts (console.log with [SvelteStoreAnalyzer] prefix)
    - Remove debug logging from svelte-markup-analyzer.ts (any console.log statements)
    - Remove debug logging from svelte-event-analyzer.ts (console.log with [SvelteEventAnalyzer] prefix)
    - Remove debug logging from DFD builder Svelte-related methods (console.log with [DFDBuilder] prefix)
    - Remove this.log() calls from DFD builder for Svelte operations
    - Keep only console.error for error logging in production use
    - _Requirements: 7.1_

- [-] 9. Fix and enhance Svelte component data flows
  - [x] 9.1 Fix 005-Stores.svelte data flow edges
    - Implement data flow edges from stores (writable, readable, derived) to template <p> elements
    - Ensure auto-subscription syntax ($count, $name, $timestamp, $doubleCount) creates proper edges
    - Update acceptance test `005-Stores.mmd` to include all display edges
    - Verify edges: count → <p>, name → <p>, timestamp → <p>, doubleCount → <p>
    - _Requirements: 3.1, 3.2, 3.5, 5.1, 6.4_
  
  - [x] 9.2 Fix 006-AutoSubscription.svelte data flows
    - Create event input nodes for button clicks with proper connection to <button> elements
    - Implement data flow edges from increment/updateName processes to counter/userName stores (updates)
    - Create process nodes for doubled and greeting (computed values from auto-subscriptions)
    - Implement data flow edges from stores to computed processes: counter → doubled, userName → greeting
    - Implement data flow edges from computed processes to template: doubled → <p>, greeting → <p>
    - Update acceptance test `006-AutoSubscription.mmd` to include all edges
    - _Requirements: 3.2, 3.3, 4.1, 5.2, 5.3, 6.4_
  
  - [x] 9.2.1 Refactor 006-AutoSubscription.svelte to use button nodes instead of event nodes
    - Remove separate click_event input nodes
    - Create <button> template nodes within <template> subgraph
    - Implement direct data flow edges from <button> nodes to handler processes (increment, updateName)
    - Update DFD builder to create edges from button elements with on:click to handler processes
    - Update acceptance test `006-AutoSubscription.mmd` to reflect new structure
    - Verify all Svelte tests still pass after refactoring
    - _Requirements: 5.2, 5.3, 6.4_
  
  - [x] 9.3 Fix 007-SvelteKit.svelte data flows and structure
    - Create data store node for page store from $app/stores
    - Create process nodes for goto, beforeNavigate, afterNavigate from $app/navigation
    - Create "Lifecycle" subgraph containing beforeNavigate and afterNavigate processes
    - Create "URL: Input" external entity input node with data flow to page store
    - Create "URL: Output" external entity output node with data flow from goto process
    - Implement data flow edges from button click events to goto process
    - Update acceptance test `007-SvelteKit.mmd` to include all nodes and edges
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 6.5_
  
  - [x] 9.4 Fix 008-EventDispatch.svelte event emission structure
    - Create "events" subgraph containing submit and cancel event output nodes (similar to Vue emits)
    - Implement data flow edges from handleSubmit/handleCancel processes to event nodes in subgraph
    - Implement data flow edge from inputValue state to handleSubmit process (data dependency)
    - Update DFD builder to create event subgraph for Svelte dispatch calls
    - Update acceptance test `008-EventDispatch.mmd` to include events subgraph and edges
    - _Requirements: 4.2, 4.3, 6.5_
  
  - [x] 9.5 Fix 010-ControlFlow.svelte control structure visualization
    - Create subgraphs for conditional rendering ({#if}), loops ({#each}), and async blocks ({#await})
    - Implement data flow edges from showMessage state to {#if} subgraph
    - Implement data flow edges from items state to {#each} subgraph
    - Implement data flow edges from dataPromise state to {#await} subgraph
    - Implement data flow edges from data within subgraphs to <p> and <li> template elements
    - Update DFD builder to create control flow subgraphs for Svelte
    - Update acceptance test `010-ControlFlow.mmd` to include all subgraphs and edges
    - _Requirements: 5.5, 6.5_
  
  - [x] 9.6 Fix 010-ControlFlow.svelte await block and loop variable handling
    - [x] 9.6.1 Convert {#await} block from node to subgraph
      - Change {#await dataPromise} from a simple node to a proper subgraph structure
      - Include the 2 <p> elements inside the {#await} subgraph
      - Create data flow edges from dataPromise to the {#await} subgraph
      - Create data flow edges from the await block's data variable to the <p> elements inside
      - _Requirements: 5.5, 6.5_
    
    - [x] 9.6.2 Fix loop variable references in {#each} blocks
      - Remove extra <li> element that appears outside the {#each} subgraph
      - Ensure only one <li> element exists inside the {#each items} subgraph
      - Create data flow edge from items state to the {#each} subgraph
      - Treat loop variable (item) references as data flows from the loop source (items)
      - Create data flow edges from items to <li> elements that display loop variables
      - Update markup analyzer to properly track loop variable usage
      - _Requirements: 5.5, 6.5_
    
    - [x] 9.6.3 Update acceptance test for corrected structure
      - Update `010-ControlFlow.mmd` to reflect {#await} as subgraph with nested <p> elements
      - Update `010-ControlFlow.mmd` to show only one <li> inside {#each} subgraph
      - Verify data flow edges: dataPromise → {#await} subgraph, items → {#each} subgraph
      - Verify internal edges: await data → <p> elements, items → <li> element
      - Run acceptance test to confirm all changes are correct
      - _Requirements: 5.5, 6.5_

  - [x] 9.7 Fix 011-SimpleCounter.svelte event handler data flows
    - Create <button> template nodes for increment, decrement, and reset buttons within <template> subgraph
    - Create process nodes for increment, decrement, and reset functions
    - Implement data flow edges from each <button> element to corresponding handler process with on:click label
    - Implement data flow edges from each handler process to count state with "updates" label
    - Update acceptance test `011-SimpleCounter.mmd` to include all button elements and data flows
    - Verify edges: <button> → increment → count, <button> → decrement → count, <button> → reset → count
    - _Requirements: 5.2, 5.3, 4.1, 6.5_

  - [x] 9.8 Fix 012-PropsExample.svelte data flows
    - Implement data flow edge from initialCount prop to count state with "initializes" label
    - Rename handleClick function to onclick for consistency with Svelte shorthand syntax
    - Update component to use `<button {onclick}>` shorthand syntax instead of `onclick={handleClick}`
    - Create <button> template node within <template> subgraph
    - Implement data flow edge from <button> element to onclick process with on:click label
    - Implement data flow edge from onclick process to cfount state with "updates" label
    - Update acceptance test `012-PropsExample.mmd` to include all data flows
    - Verify edges: initialCount → count (initializes), <button> → onclick (on:click), onclick → count (updates)
    - _Requirements: 2.2, 5.2, 5.3, 4.1, 6.5_

  - [x] 9.9 Fix 013-Events.svelte data flows
    - Update component to use proper Svelte event syntax: `bind:value`, `on:input`, `on:click`
    - Create <input> and <button> template nodes within <template> subgraph
    - Implement data flow edges from inputValue state to <input> element with "binds" label
    - Implement data flow edges from <input> element to handleInput process with "on:input" label
    - Implement data flow edges from handleInput process to inputValue state with "updates" label
    - Implement data flow edges from <button> elements to handleSubmit/handleCancel processes with "on:click" label
    - Implement data flow edges from handler processes to inputValue state with "updates" label
    - Create "Events" subgraph containing update, submit, cancel event output nodes
    - Implement data flow edges from handler processes to event nodes with "dispatches" label
    - Update acceptance test `013-Events.mmd` to include all data flows and events subgraph
    - _Requirements: 5.2, 5.3, 4.1, 4.2, 4.3, 6.5_

- [ ] 10. Fix element creation duplication and line number tracking issues
  - [x] 10.1 Integrate Svelte markup element creation methods
    - Analyze root cause: `createSvelteMarkupOutputNodes` and `createSvelteElementNodesWithEventHandlers` create duplicate elements
    - Consolidate element creation into single unified method that handles both event handlers and bind directives
    - Update DFD builder to call unified method instead of two separate methods
    - Ensure element nodes have consistent metadata categories (use 'svelte-element' for all)
    - Verify no duplicate element nodes are created for components with both event handlers and bindings
    - Run all Svelte acceptance tests to ensure no regressions
    - _Requirements: 5.2, 5.3, 6.5_

  - [x] 10.2 Debug and fix event handler line number tracking
    - Investigate why event handler line numbers differ from component source (e.g., on:click at line 35 vs actual line 20)
    - Check if line numbers are calculated correctly in markup analyzer
    - Verify line number calculation in `extractElementsWithEventHandlers` method
    - Compare with Vue implementation to identify differences in line number handling
    - Add debug logging to track line number calculation through the pipeline
    - Fix line number calculation to match actual source positions
    - Update acceptance tests if line numbers change
    - _Requirements: 5.2, 5.3, 6.5_

  - [x] 10.3 Fix Vue event handler line number tracking (parallel issue)
    - Apply same line number debugging and fixes to Vue framework
    - Check `createVueElementNodesWithEventHandlers` method in DFD builder
    - Verify Vue template analyzer line number calculation
    - Compare Vue and Svelte implementations to ensure consistency
    - Fix any line number discrepancies in Vue event handler detection
    - Run Vue acceptance tests to verify fixes
    - _Requirements: 5.2, 5.3, 6.5_

  - [x] 10.4 Implement bind directive edge creation fix
    - Fix `buildSvelteBindingEdges` to correctly find element nodes created by unified method
    - Ensure bind:value edges are created from state to element nodes
    - Verify bidirectional edges are created (state → element with "binds", element → state with "oninput")
    - Test with components that have both bind directives and event handlers
    - Update acceptance tests to verify bind edges are correctly generated
    - _Requirements: 5.2, 5.3, 6.5_

  - [x] 10.5 Remove colons from Svelte event handler edge labels
    - Update DFD builder to generate event labels without colons: "onclick" instead of "on:click", "oninput" instead of "on:input"
    - Modify `buildSvelteEventHandlerDataFlows` method to strip "on:" prefix from event labels
    - Modify `buildSvelteBindingEdges` method to use "input" instead of "on:input" for bind directive edges
    - Update all Svelte acceptance test `.mmd` files to reflect new label format
    - Update `011-SimpleCounter.mmd`: change "on:click" to "onclick"
    - Update `012-PropsExample.mmd`: change "on:click" to "onclick"
    - Update `013-Events.mmd`: change "on:input" to "input", "on:click" to "onclick"
    - Verify all Svelte acceptance tests pass with new label format
    - _Requirements: 5.2, 5.3, 6.5_
