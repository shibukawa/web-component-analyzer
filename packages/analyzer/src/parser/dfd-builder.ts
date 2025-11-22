/**
 * DFD Builder - Transforms ComponentAnalysis into DFD Source Data
 * 
 * This module creates nodes and edges for Data Flow Diagrams based on
 * the analyzed component structure.
 */

import {
  ComponentAnalysis,
  DFDSourceData,
  DFDNode,
  DFDEdge,
  HookInfo,
  ProcessInfo,
  PropInfo,
  JSXInfo,
  DFDSubgraph,
  JSXElementStructure,
  JSXAttributeReference,
  JSXStructure,
  ConditionalBranch,
  ExportedHandlerInfo,
  ExternalCallInfo
} from './types';
import { SubgraphBuilder } from '../analyzers/subgraph-builder';
import { TypeClassifier } from '../services/type-classifier';
import { EventHandlerUsageAnalyzer } from '../services/event-handler-usage-analyzer';
import { getProcessorRegistry } from '../libraries/index.js';
import { ProcessorContext, ProcessorResult } from '../libraries/types';
import { createLogger } from '../libraries/logger';

/**
 * DFD Builder interface
 */
export interface DFDBuilder {
  build(analysis: ComponentAnalysis): DFDSourceData;
}

/**
 * Default implementation of DFD Builder
 */
export class DefaultDFDBuilder implements DFDBuilder {
  private nodes: DFDNode[] = [];
  private edges: DFDEdge[] = [];
  private nodeIdCounter = 0;
  private rootSubgraph: any = null;
  private exportedHandlerSubgroups: DFDSubgraph[] = [];
  private currentAnalysis: ComponentAnalysis | null = null;
  private verbose: boolean = false; // Set to true to enable detailed logging
  private customEdgeBuilders: Map<string, any> = new Map(); // Store custom edge builders by variable name
  private eventHandlerUsageMap: import('../parser/types').EventHandlerUsageMap = {}; // Store event handler usage information

  constructor() {
    // Processor registry is initialized globally in libraries/index.ts
    // Check environment variable for verbose logging
    this.verbose = process.env.DFD_BUILDER_VERBOSE === 'true';
  }
  
  /**
   * Log message only if verbose mode is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(message, ...args);
    }
  }

  /**
   * Build DFD source data from component analysis
   */
  build(analysis: ComponentAnalysis): DFDSourceData {
    this.log('🚚 DFD Builder: Starting build');
    this.log('🚚 DFD Builder: Hooks to process:', analysis.hooks.length);
    this.log('🚚 DFD Builder: Hooks:', analysis.hooks.map(h => ({ name: h.hookName, category: h.category, vars: h.variables })));
    
    // Store analysis for processor context
    this.currentAnalysis = analysis;
    
    // Reset processor registry (resets stateful processors like Next.js)
    const processorRegistry = getProcessorRegistry();
    processorRegistry.reset();
    
    // Reset state
    this.nodes = [];
    this.edges = [];
    this.nodeIdCounter = 0;
    this.exportedHandlerSubgroups = [];
    this.customEdgeBuilders.clear();
    this.eventHandlerUsageMap = {};

    // Create nodes for all elements
    this.createPropsNodes(analysis.props);
    
    // Create nodes for Vue state (if present)
    if ((analysis as any).vueState && (analysis as any).vueState.length > 0) {
      this.createVueStateNodes((analysis as any).vueState);
      this.log('🚚 DFD Builder: Created', (analysis as any).vueState.length, 'Vue state nodes');
      
      // Build edges for computed property dependencies
      this.buildVueComputedDependencyEdges((analysis as any).vueState);
      this.log('🚚 DFD Builder: Built Vue computed dependency edges');
    }
    
    // Create nodes for Svelte runes (if present)
    if (analysis.metadata?.svelteRunes && Array.isArray(analysis.metadata.svelteRunes)) {
      this.createSvelteRuneNodes(analysis.metadata.svelteRunes);
      this.log('🚚 DFD Builder: Created', analysis.metadata.svelteRunes.length, 'Svelte rune nodes');
      
      // Build edges for derived rune dependencies
      this.buildSvelteDerivedRuneDependencyEdges(analysis.metadata.svelteRunes);
      this.log('🚚 DFD Builder: Built Svelte derived rune dependency edges');
      
      // Build edges for effect rune dependencies
      this.buildSvelteEffectRuneDependencyEdges(analysis.metadata.svelteRunes);
      this.log('🚚 DFD Builder: Built Svelte effect rune dependency edges');
    }
    
    // Create nodes for Svelte stores (if present)
    if (analysis.metadata?.svelteStores && Array.isArray(analysis.metadata.svelteStores)) {
      this.createSvelteStoreNodes(analysis.metadata.svelteStores);
      this.log('🚚 DFD Builder: Created', analysis.metadata.svelteStores.length, 'Svelte store nodes');
      
      // Create nodes for store subscriptions
      if (analysis.metadata?.svelteStoreSubscriptions && Array.isArray(analysis.metadata.svelteStoreSubscriptions)) {
        this.createSvelteStoreSubscriptionNodes(analysis.metadata.svelteStoreSubscriptions);
        this.log('🚚 DFD Builder: Created', analysis.metadata.svelteStoreSubscriptions.length, 'Svelte store subscription nodes');
      }
      
      // Create process nodes for computed values from subscriptions
      if (analysis.metadata?.svelteComputedFromSubscriptions && Array.isArray(analysis.metadata.svelteComputedFromSubscriptions)) {
        this.createSvelteComputedFromSubscriptionNodes(analysis.metadata.svelteComputedFromSubscriptions);
        this.log('🚚 DFD Builder: Created', analysis.metadata.svelteComputedFromSubscriptions.length, 'Svelte computed from subscription nodes');
      }
      
      // Build edges for derived store dependencies
      this.buildSvelteStoreDependencyEdges(analysis.metadata.svelteStores);
      this.log('🚚 DFD Builder: Built Svelte store dependency edges');
    }
    
    // Create nodes for Svelte events (if present)
    if (analysis.metadata?.svelteEvents && Array.isArray(analysis.metadata.svelteEvents)) {
      this.createSvelteEventNodes(analysis.metadata.svelteEvents);
      this.log('🚚 DFD Builder: Created', analysis.metadata.svelteEvents.length, 'Svelte event nodes');
    }
    
    // Create nodes for Svelte markup elements (if present)
    if (analysis.metadata?.svelteMarkupElements && Array.isArray(analysis.metadata.svelteMarkupElements)) {
      this.createSvelteMarkupOutputNodes(analysis.metadata.svelteMarkupElements);
      this.log('🚚 DFD Builder: Created', analysis.metadata.svelteMarkupElements.length, 'Svelte markup output nodes');
      
      // Note: Edges will be built after process nodes are created
    }
    
    // Create element nodes for Svelte elements with event handlers (if present)
    if (analysis.metadata?.svelteElementsWithEventHandlers && Array.isArray(analysis.metadata.svelteElementsWithEventHandlers)) {
      this.createSvelteElementNodesWithEventHandlers(analysis.metadata.svelteElementsWithEventHandlers);
      this.log('🚚 DFD Builder: Created Svelte element nodes with event handlers');
    }
    
    // Note: Svelte control flow subgraphs will be built after markup elements are created
    
    // Create nodes for Vue emits (if present)
    if (analysis.vueEmits && analysis.vueEmits.length > 0) {
      this.createVueEmitsNodes(analysis.vueEmits);
      this.log('🚚 DFD Builder: Created', analysis.vueEmits.length, 'Vue emit nodes');
    }
    
    // Create element nodes for Vue elements with event handlers (if present)
    if (analysis.vueElementsWithEventHandlers && analysis.vueElementsWithEventHandlers.length > 0) {
      this.createVueElementNodesWithEventHandlers(analysis.vueElementsWithEventHandlers);
      // Set the rootSubgraph to jsxOutput.rootSubgraph so other methods can access it
      if (this.rootSubgraph && !analysis.jsxOutput.rootSubgraph) {
        analysis.jsxOutput.rootSubgraph = this.rootSubgraph;
      }
      this.log('🚚 DFD Builder: Created Vue element nodes for', analysis.vueElementsWithEventHandlers.length, 'elements with event handlers');
    }
    
    // Merge library hooks before creating nodes
    const mergedHooks = this.mergeLibraryHooks(analysis.hooks);
    this.createHookNodes(mergedHooks);
    this.log('🚚 DFD Builder: Nodes after hooks:', this.nodes.length);
    this.createProcessNodes(analysis.processes);
    
    // Build edges for Svelte markup bindings (after process nodes are created)
    if (analysis.metadata?.svelteMarkupElements && Array.isArray(analysis.metadata.svelteMarkupElements)) {
      this.buildSvelteMarkupEdges(analysis.metadata.svelteMarkupElements);
      this.log('🚚 DFD Builder: Built Svelte markup edges');
    }
    
    // Build edges from Svelte element nodes to handler processes (after process nodes are created)
    if (analysis.metadata?.svelteElementsWithEventHandlers && Array.isArray(analysis.metadata.svelteElementsWithEventHandlers)) {
      this.buildSvelteEventHandlerDataFlows(analysis);
      this.log('🚚 DFD Builder: Built Svelte event handler data flows');
    }
    
    // Build edges for Svelte bind: directives (after state and element nodes are created)
    if (analysis.metadata?.svelteMarkupBindings && Array.isArray(analysis.metadata.svelteMarkupBindings)) {
      this.buildSvelteBindingEdges(analysis.metadata.svelteMarkupBindings);
      this.log('🚚 DFD Builder: Built Svelte binding edges');
    }
    
    // Build edges for Svelte dispatch calls (after process nodes are created)
    if (analysis.metadata?.svelteDispatchCalls && Array.isArray(analysis.metadata.svelteDispatchCalls)) {
      this.buildSvelteDispatchEdges(analysis.metadata.svelteDispatchCalls);
      this.log('🚚 DFD Builder: Built', analysis.metadata.svelteDispatchCalls.length, 'Svelte dispatch edges');
    }
    
    // Build edges for Svelte store updates (after process nodes are created)
    if (analysis.metadata?.svelteStoreUpdates && Array.isArray(analysis.metadata.svelteStoreUpdates)) {
      this.buildSvelteStoreUpdateEdges(analysis.metadata.svelteStoreUpdates);
      this.log('🚚 DFD Builder: Built', analysis.metadata.svelteStoreUpdates.length, 'Svelte store update edges');
    }
    
    // Build edges for computed values from subscriptions (after process nodes are created)
    if (analysis.metadata?.svelteComputedFromSubscriptions && Array.isArray(analysis.metadata.svelteComputedFromSubscriptions)) {
      this.buildSvelteComputedFromSubscriptionEdges(analysis.metadata.svelteComputedFromSubscriptions);
      this.log('🚚 DFD Builder: Built', analysis.metadata.svelteComputedFromSubscriptions.length, 'Svelte computed from subscription edges');
    }
    
    // Build subgraphs for Svelte control flow structures (after markup elements are created)
    if (analysis.metadata?.svelteConditionalStructures && Array.isArray(analysis.metadata.svelteConditionalStructures)) {
      this.buildSvelteConditionalEdges(analysis.metadata.svelteConditionalStructures);
      this.log('🚚 DFD Builder: Built', analysis.metadata.svelteConditionalStructures.length, 'Svelte conditional subgraphs');
    }
    
    if (analysis.metadata?.svelteLoopStructures && Array.isArray(analysis.metadata.svelteLoopStructures)) {
      this.buildSvelteLoopEdges(analysis.metadata.svelteLoopStructures);
      this.log('🚚 DFD Builder: Built', analysis.metadata.svelteLoopStructures.length, 'Svelte loop subgraphs');
    }
    
    if (analysis.metadata?.svelteAwaitStructures && Array.isArray(analysis.metadata.svelteAwaitStructures)) {
      this.buildSvelteAwaitEdges(analysis.metadata.svelteAwaitStructures);
      this.log('🚚 DFD Builder: Built', analysis.metadata.svelteAwaitStructures.length, 'Svelte await subgraphs');
    }
    
    // Create lifecycle hooks subgraph for Vue components (if present)
    this.createLifecycleHooksSubgraph(analysis);
    this.log('🚚 DFD Builder: Created lifecycle hooks subgraph');
    
    // Create watcher edges for Vue components (if present)
    this.createWatcherEdges(analysis);
    this.log('🚚 DFD Builder: Created watcher edges');
    
    // Create emits subgraph for Vue components (if present)
    this.createEmitsSubgraph(analysis);
    this.log('🚚 DFD Builder: Created emits subgraph');
    
    // Create router call edges for Vue Router (if present)
    this.createRouterCallEdges(analysis);
    this.log('🚚 DFD Builder: Created router call edges');
    
    // Create Pinia store edges (if present)
    this.createPiniaStoreEdges(analysis);
    this.log('🚚 DFD Builder: Created Pinia store edges');
    
    // Build edges from processes to other processes (calls)
    this.buildProcessToProcessEdges(analysis);
    this.log('🚚 DFD Builder: Created process to process edges');
    
    // Build edges from props to states (initial values) - works for both React and Vue
    this.buildPropToStateInitialValueEdges(analysis);
    this.log('🚚 DFD Builder: Created prop to state initial value edges');
    
    // Create exported handlers subgroups for imperative handle calls
    this.createImperativeHandlerSubgroups(analysis.processes);

    // Build subgraph structure if JSX structure exists
    if (analysis.jsxOutput.structure) {
      const subgraphBuilder = new SubgraphBuilder();
      const rootSubgraph = subgraphBuilder.buildRootSubgraph(analysis.jsxOutput.structure);
      analysis.jsxOutput.rootSubgraph = rootSubgraph;
      this.log('🚚 DFD Builder: Built root subgraph with', rootSubgraph.elements.length, 'elements');
      
      // Build event handler usage map from JSX attribute references
      const eventHandlerAnalyzer = new EventHandlerUsageAnalyzer();
      const allAttributeReferences = this.collectAllAttributeReferences(analysis.jsxOutput.structure);
      this.eventHandlerUsageMap = eventHandlerAnalyzer.analyze(allAttributeReferences);
      this.log('🚚 DFD Builder: Built event handler usage map with', Object.keys(this.eventHandlerUsageMap).length, 'variables');
      console.log('🚚 Event handler usage map:', this.eventHandlerUsageMap);
      
      // Collect all nodes from subgraph structure and add to this.nodes
      const subgraphNodes = this.collectElementNodes(rootSubgraph);
      this.nodes.push(...subgraphNodes);
      this.log('🚚 DFD Builder: Added', subgraphNodes.length, 'nodes from subgraph structure');
      
      // Collect conditional subgraphs as nodes
      const conditionalSubgraphNodes = this.collectConditionalSubgraphNodes(rootSubgraph);
      this.nodes.push(...conditionalSubgraphNodes);
      this.log('🚚 DFD Builder: Added', conditionalSubgraphNodes.length, 'conditional subgraph nodes');
      
      // Build display and control visibility edges
      const displayEdges = this.buildDisplayEdges(rootSubgraph, this.nodes);
      this.edges.push(...displayEdges);
      this.log('🚚 DFD Builder: Created', displayEdges.length, 'display/control edges');
      
      // Build attribute reference edges
      const typeClassifier = new TypeClassifier();
      const elementNodes = this.collectElementNodes(rootSubgraph);
      for (const elementNode of elementNodes) {
        // Find the corresponding JSXElementStructure
        const elementStructure = this.findElementStructure(
          analysis.jsxOutput.structure,
          elementNode.line,
          elementNode.column
        );
        
        if (elementStructure) {
          const attrEdges = this.buildAttributeReferenceEdges(
            elementStructure,
            elementNode,
            this.nodes,
            typeClassifier
          );
          this.edges.push(...attrEdges);
        }
      }
      this.log('🚚 DFD Builder: Created attribute reference edges');
      
      // Build edges from inline handlers to JSX elements
      this.buildInlineHandlerEdges(analysis, elementNodes);
      this.log('🚚 DFD Builder: Created inline handler edges');
      
      // Build edges from processes to context functions
      this.buildProcessToContextFunctionEdges(analysis);
      this.log('🚚 DFD Builder: Created process to context function edges');
      
      // Build edges from processes to custom hook functions
      this.buildProcessToCustomHookFunctionEdges(analysis);
      this.log('🚚 DFD Builder: Created process to custom hook function edges');
      
      // Build edges from data stores to processes (reads)
      this.buildProcessToDataStoreEdges(analysis);
      this.log('🚚 DFD Builder: Created data store to process edges');
      
      // Build edges from processes to data stores (writes)
      this.buildProcessToDataStoreWriteEdges(analysis);
      this.log('🚚 DFD Builder: Created process to data store write edges');
      
      // Build edges between dependent atoms (Jotai derived atoms)
      this.buildAtomDependencyEdges(analysis);
      this.log('🚚 DFD Builder: Created atom dependency edges');
      
      // Build edges from mutation library hooks to Server (writes)
      this.buildMutationToServerEdges();
      this.log('🚚 DFD Builder: Created mutation to server edges');
      
      // Build edges from external entity inputs to processes (reads)
      this.buildProcessToExternalEntityEdges(analysis);
      this.log('🚚 DFD Builder: Created external entity to process edges');
      
      // Build edges from processes to function props (calls)
      this.buildProcessToFunctionPropEdges(analysis);
      this.log('🚚 DFD Builder: Created process to function prop edges');
      
      // Build edges from processes to library hook process properties (e.g., onClick: mutate)
      this.buildProcessToLibraryHookProcessEdges(analysis);
      this.log('🚚 DFD Builder: Created process to library hook process edges');
      
      // Build edges from props to library hooks (e.g., url prop to useSWR)
      this.buildPropToLibraryHookEdges(analysis);
      this.log('🚚 DFD Builder: Created prop to library hook edges');
      
      // Build edges from JSX elements with ref to exported handlers subgroups
      this.buildJSXToExportedHandlersEdges(rootSubgraph);
      this.log('🚚 DFD Builder: Created JSX to exported handlers edges');
      
      // Build edges from processes to Vue emits (if present)
      if (analysis.vueEmitCalls && analysis.vueEmitCalls.length > 0) {
        this.buildProcessToVueEmitsEdges(analysis);
        this.log('🚚 DFD Builder: Created process to Vue emit edges');
      }
    }
    
    // Build edges for Vue event handlers (if present)
    if (analysis.vueElementsWithEventHandlers && analysis.vueElementsWithEventHandlers.length > 0) {
      this.buildVueEventHandlerDataFlows(analysis);
      this.log('🚚 DFD Builder: Created Vue event handler data flow edges');
    }

    // Build root-level JSX elements for Vue template bindings (before conditionals/loops)
    if (analysis.vueTemplateBindings && analysis.vueTemplateBindings.length > 0) {
      this.buildVueRootLevelElements(analysis);
      this.log('🚚 DFD Builder: Created Vue root-level elements');
    }

    // Build subgraphs for Vue conditional structures (v-if)
    if (analysis.vueConditionalStructures && analysis.vueConditionalStructures.length > 0) {
      this.buildVueConditionalSubgraphs(analysis);
      this.log('🚚 DFD Builder: Created Vue conditional subgraphs');
    }

    // Build subgraphs for Vue loop structures (v-for)
    if (analysis.vueLoopStructures && analysis.vueLoopStructures.length > 0) {
      this.buildVueLoopSubgraphs(analysis);
      this.log('🚚 DFD Builder: Created Vue loop subgraphs');
    }

    // Build display edges for Vue components (after subgraphs are created)
    // This handles both conditional/loop structures and simple template elements
    if (analysis.jsxOutput.rootSubgraph && 
        (analysis.vueConditionalStructures || analysis.vueLoopStructures || analysis.vueTemplateBindings)) {
      const vueDisplayEdges = this.buildVueDisplayEdges(analysis.jsxOutput.rootSubgraph, this.nodes);
      this.edges.push(...vueDisplayEdges);
      this.log('🚚 DFD Builder: Created', vueDisplayEdges.length, 'Vue display edges');
    }

    // Merge duplicate edges with different sub-labels
    this.mergeEdgesWithSubLabels();
    this.log('🚚 DFD Builder: Merged duplicate edges');

    this.log('🚚 DFD Builder: Exported handler subgroups:', this.exportedHandlerSubgroups.length);
    if (this.exportedHandlerSubgroups.length > 0) {
      this.log('🚚 DFD Builder: Subgroups:', this.exportedHandlerSubgroups.map(sg => ({ id: sg.id, elements: sg.elements.length })));
    }
    
    return {
      nodes: this.nodes,
      edges: this.edges,
      rootSubgraph: analysis.jsxOutput.rootSubgraph,
      subgraphs: this.exportedHandlerSubgroups.length > 0 ? this.exportedHandlerSubgroups : undefined
    };
  }

  /**
   * Build edges from processes to context functions
   * Creates edges when a process calls a function from context
   */
  private buildProcessToContextFunctionEdges(analysis: ComponentAnalysis): void {
    const contextFunctionNodes = this.nodes.filter(
      node => node.metadata?.category === 'context-function'
    );

    if (contextFunctionNodes.length === 0) {
      return;
    }

    for (const process of analysis.processes) {
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );

      if (!processNode) {
        continue;
      }

      // Check if process references any context functions
      for (const contextFunctionNode of contextFunctionNodes) {
        const functionName = contextFunctionNode.metadata?.variableName as string;
        
        if (functionName && process.references.includes(functionName)) {
          this.edges.push({
            from: processNode.id,
            to: contextFunctionNode.id,
            label: 'calls'
          });
        }
      }
    }
  }

  /**
   * Build edges from processes to custom hook functions
   * Creates edges when a process calls a function from a custom hook
   */
  private buildProcessToCustomHookFunctionEdges(analysis: ComponentAnalysis): void {
    const customHookFunctionNodes = this.nodes.filter(
      node => node.metadata?.category === 'custom-hook-function'
    );

    this.log('🚚 buildProcessToCustomHookFunctionEdges: Custom hook function nodes:', customHookFunctionNodes.length);

    for (const process of analysis.processes) {
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );

      if (!processNode) {
        continue;
      }

      // Check if process references any custom hook functions
      for (const customHookFunctionNode of customHookFunctionNodes) {
        const functionName = customHookFunctionNode.metadata?.variableName as string;
        
        if (functionName && process.references.includes(functionName)) {
          console.log(`🚚 ✅ Creating edge from ${process.name} to custom hook function ${functionName}`);
          this.edges.push({
            from: processNode.id,
            to: customHookFunctionNode.id,
            label: 'calls'
          });
        }
      }
    }
  }

  /**
   * Build edges from hook output (functions) to hook input (data)
   * Creates edges showing that calling a function updates the data
   * Applies to context and custom hooks
   */


  /**
   * Build edges from props to states (initial values)
   * Creates edges when a prop is used as initial value for state
   */
  private buildPropToStateInitialValueEdges(analysis: ComponentAnalysis): void {
    const propNodes = this.nodes.filter(
      node => node.type === 'external-entity-input' && node.metadata?.category === 'prop'
    );
    
    // Include React state, Vue state, and Svelte state nodes
    const stateNodes = this.nodes.filter(
      node => node.type === 'data-store' && 
      (node.metadata?.category === 'state' || 
       node.metadata?.category === 'vue-ref' ||
       node.metadata?.category === 'vue-reactive' ||
       node.metadata?.category === 'svelte-state')
    );
    
    this.log('🚚 buildPropToStateInitialValueEdges: Prop nodes:', propNodes.length);
    this.log('🚚 buildPropToStateInitialValueEdges: State nodes:', stateNodes.length);
    
    for (const stateNode of stateNodes) {
      const initialValue = stateNode.metadata?.initialValue;
      
      if (initialValue) {
        console.log(`🚚 State ${stateNode.label} has initial value: ${initialValue}`);
        
        // Find the prop node with this name
        const propNode = propNodes.find(p => p.label === initialValue);
        
        if (propNode) {
          console.log(`🚚 ✅ Creating initializes edge from ${propNode.id} to ${stateNode.id}`);
          this.edges.push({
            from: propNode.id,
            to: stateNode.id,
            label: 'initializes'
          });
        } else {
          console.log(`🚚 ⚠️ Prop node not found for initial value: ${initialValue}`);
        }
      }
    }
  }

  /**
   * Build edges from data stores to processes
   * Creates edges when a process reads from a state variable
   */
  private buildProcessToDataStoreEdges(analysis: ComponentAnalysis): void {
    const dataStoreNodes = this.nodes.filter(
      node => node.type === 'data-store'
    );

    for (const process of analysis.processes) {
      // Skip inline handlers - they're handled separately
      if (process.isInlineHandler) {
        continue;
      }
      
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );

      if (!processNode) {
        continue;
      }

      // Check if process references any state variables
      for (const dataStoreNode of dataStoreNodes) {
        let isReferenced = false;
        
        // For read-write pairs, check if the read variable is referenced
        if (dataStoreNode.metadata?.isReadWritePair && dataStoreNode.metadata?.readVariable) {
          if (process.references.includes(dataStoreNode.metadata.readVariable as string)) {
            isReferenced = true;
          }
        }
        // For reducer state, check if any state property is referenced
        else if (dataStoreNode.metadata?.isReducer && dataStoreNode.metadata?.stateProperties) {
          const stateProps = dataStoreNode.metadata.stateProperties as string[];
          console.log(`🔍 Checking reducer ${dataStoreNode.label} state properties:`, stateProps);
          console.log(`🔍 Process ${process.name} references:`, process.references);
          const matchedProps = stateProps.filter(prop => process.references.includes(prop));
          if (matchedProps.length > 0) {
            console.log(`🔍 ✅ Found matching properties:`, matchedProps);
            isReferenced = true;
            // Store matched properties for edge label
            (dataStoreNode as any).__matchedProps = matchedProps;
          } else {
            console.log(`🔍 ❌ No matching properties found`);
          }
        }
        // For library hooks (useSWR, useSWRMutation), check if any DATA property is referenced
        // Process properties (functions) are handled by buildProcessToDataStoreWriteEdges
        else if (dataStoreNode.metadata?.isLibraryHook && dataStoreNode.metadata?.dataProperties) {
          const dataProps = dataStoreNode.metadata.dataProperties as string[];
          console.log(`🔍 Checking library hook ${dataStoreNode.label} data properties:`, dataProps);
          console.log(`🔍 Process ${process.name} references:`, process.references);
          const matchedProps = dataProps.filter(prop => process.references.includes(prop));
          if (matchedProps.length > 0) {
            console.log(`🔍 ✅ Found matching data properties:`, matchedProps);
            isReferenced = true;
            // Store matched properties for edge label
            (dataStoreNode as any).__matchedProps = matchedProps;
          } else {
            console.log(`🔍 ❌ No matching data properties found`);
          }
        }
        // For simple nodes, check the label directly
        else if (process.references.includes(dataStoreNode.label)) {
          isReferenced = true;
        }
        
        if (isReferenced) {
          // For reducer state and library hooks, include matched properties in label
          let edgeLabel = 'reads';
          if ((dataStoreNode.metadata?.isReducer || dataStoreNode.metadata?.isLibraryHook) && (dataStoreNode as any).__matchedProps) {
            const matchedProps = (dataStoreNode as any).__matchedProps as string[];
            edgeLabel = `reads: ${matchedProps.join(', ')}`;
            // Clean up temporary property
            delete (dataStoreNode as any).__matchedProps;
          }
          
          this.edges.push({
            from: dataStoreNode.id,
            to: processNode.id,
            label: edgeLabel
          });
        }
      }
      
      // Also check cleanup process if it exists
      if (process.cleanupProcess) {
        const cleanupNode = this.nodes.find(
          node => node.type === 'process' && node.label === process.cleanupProcess!.name
        );
        
        if (cleanupNode) {
          // Check if cleanup process references any state variables
          for (const dataStoreNode of dataStoreNodes) {
            let isReferenced = false;
            
            if (dataStoreNode.metadata?.isReadWritePair && dataStoreNode.metadata?.readVariable) {
              if (process.cleanupProcess.references.includes(dataStoreNode.metadata.readVariable as string)) {
                isReferenced = true;
              }
            } else if (dataStoreNode.metadata?.isReducer && dataStoreNode.metadata?.stateProperties) {
              const stateProps = dataStoreNode.metadata.stateProperties as string[];
              const matchedProps = stateProps.filter(prop => process.cleanupProcess!.references.includes(prop));
              if (matchedProps.length > 0) {
                isReferenced = true;
                // Store matched properties for edge label
                (dataStoreNode as any).__matchedPropsCleanup = matchedProps;
              }
            } else if (dataStoreNode.metadata?.isLibraryHook && dataStoreNode.metadata?.dataProperties) {
              const dataProps = dataStoreNode.metadata.dataProperties as string[];
              const matchedProps = dataProps.filter(prop => process.cleanupProcess!.references.includes(prop));
              if (matchedProps.length > 0) {
                isReferenced = true;
                // Store matched properties for edge label
                (dataStoreNode as any).__matchedPropsCleanup = matchedProps;
              }
            } else if (process.cleanupProcess.references.includes(dataStoreNode.label)) {
              isReferenced = true;
            }
            
            if (isReferenced) {
              // For reducer state and library hooks, include matched properties in label
              let edgeLabel = 'reads';
              if ((dataStoreNode.metadata?.isReducer || dataStoreNode.metadata?.isLibraryHook) && (dataStoreNode as any).__matchedPropsCleanup) {
                const matchedProps = (dataStoreNode as any).__matchedPropsCleanup as string[];
                edgeLabel = `reads: ${matchedProps.join(', ')}`;
                // Clean up temporary property
                delete (dataStoreNode as any).__matchedPropsCleanup;
              }
              
              this.edges.push({
                from: dataStoreNode.id,
                to: cleanupNode.id,
                label: edgeLabel
              });
            }
          }
        }
      }
    }
  }

  /**
   * Build edges from external entity inputs to processes
   * Creates edges when a process reads from an external entity input (e.g., context data, props)
   */
  private buildProcessToExternalEntityEdges(analysis: ComponentAnalysis): void {
    const externalEntityNodes = this.nodes.filter(
      node => node.type === 'external-entity-input'
    );

    this.log('🚚 buildProcessToExternalEntityEdges: External entity nodes:', externalEntityNodes.length);
    this.log('🚚 buildProcessToExternalEntityEdges: Processes:', analysis.processes.length);

    for (const process of analysis.processes) {
      // Skip inline handlers - they're handled separately
      if (process.isInlineHandler) {
        continue;
      }
      
      console.log(`🚚 Processing process: ${process.name}, references:`, process.references);
      
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );

      if (!processNode) {
        console.log(`🚚 ⚠️ Process node not found for: ${process.name}`);
        continue;
      }

      // Check if process references any external entity inputs
      for (const externalEntityNode of externalEntityNodes) {
        const isReferenced = process.references.includes(externalEntityNode.label);
        console.log(`🚚 Checking if ${process.name} references ${externalEntityNode.label}: ${isReferenced}`);
        if (isReferenced) {
          // Check if this is a function prop (should use 'calls' instead of 'reads')
          const isFunctionProp = externalEntityNode.metadata?.isFunctionType === true;
          
          if (isFunctionProp) {
            // Function prop: process calls the function (process → prop)
            console.log(`🚚 ✅ Creating calls edge from ${process.name} to ${externalEntityNode.label}`);
            this.edges.push({
              from: processNode.id,
              to: externalEntityNode.id,
              label: 'calls'
            });
          } else {
            // Data prop: process reads from the prop (prop → process)
            console.log(`🚚 ✅ Creating reads edge from ${externalEntityNode.label} to ${process.name}`);
            this.edges.push({
              from: externalEntityNode.id,
              to: processNode.id,
              label: 'reads'
            });
          }
        }
      }
      
      // Also check cleanup process if it exists
      if (process.cleanupProcess) {
        const cleanupNode = this.nodes.find(
          node => node.type === 'process' && node.label === process.cleanupProcess!.name
        );
        
        if (cleanupNode) {
          // Check if cleanup process references any external entity inputs
          for (const externalEntityNode of externalEntityNodes) {
            if (process.cleanupProcess.references.includes(externalEntityNode.label)) {
              const isFunctionProp = externalEntityNode.metadata?.isFunctionType === true;
              
              if (isFunctionProp) {
                // Function prop: cleanup calls the function (cleanup → prop)
                this.edges.push({
                  from: cleanupNode.id,
                  to: externalEntityNode.id,
                  label: 'calls'
                });
              } else {
                // Data prop: cleanup reads from the prop (prop → cleanup)
                this.edges.push({
                  from: externalEntityNode.id,
                  to: cleanupNode.id,
                  label: 'reads'
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Build edges from processes to other processes they call
   * This handles cases like handleNavigate calling goto
   */
  private buildProcessToProcessEdges(analysis: ComponentAnalysis): void {
    const processNodes = this.nodes.filter(
      node => node.type === 'process'
    );

    this.log('🚚 buildProcessToProcessEdges: Process nodes:', processNodes.length);

    for (const process of analysis.processes) {
      // Skip inline handlers - they're handled separately
      if (process.isInlineHandler) {
        continue;
      }
      
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );

      if (!processNode) {
        continue;
      }

      // Check if process references any other processes
      for (const targetProcessNode of processNodes) {
        // Skip self-references
        if (targetProcessNode.id === processNode.id) {
          continue;
        }
        
        const isReferenced = process.references.includes(targetProcessNode.label);
        if (isReferenced) {
          console.log(`🚚 ✅ Creating calls edge from ${process.name} to ${targetProcessNode.label}`);
          this.edges.push({
            from: processNode.id,
            to: targetProcessNode.id,
            label: 'calls'
          });
        }
      }
    }
  }

  /**
   * Build edges from processes to data stores (writes)
   * Creates edges when a process calls a setter function
   */
  private buildProcessToDataStoreWriteEdges(analysis: ComponentAnalysis): void {
    const dataStoreNodes = this.nodes.filter(
      node => node.type === 'data-store'
    );

    this.log('🚚 buildProcessToDataStoreWriteEdges: Data store nodes:', dataStoreNodes.length);
    this.log('🚚 buildProcessToDataStoreWriteEdges: Data stores:', dataStoreNodes.map(n => ({ label: n.label, writeVar: n.metadata?.writeVariable })));
    this.log('🚚 buildProcessToDataStoreWriteEdges: Processes:', analysis.processes.length);

    for (const process of analysis.processes) {
      // Skip inline handlers - they're handled separately
      if (process.isInlineHandler) {
        continue;
      }
      
      console.log(`🚚 Processing process: ${process.name}, type: ${process.type}, references:`, process.references);
      
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );

      if (!processNode) {
        console.log(`🚚 ⚠️ Process node not found for: ${process.name}`);
        continue;
      }

      // Check if process references any setter functions
      for (const dataStoreNode of dataStoreNodes) {
        // For read-write pairs, check if the write variable (setter) is referenced
        if (dataStoreNode.metadata?.isReadWritePair && dataStoreNode.metadata?.writeVariable) {
          const setterName = dataStoreNode.metadata.writeVariable as string;
          if (process.references.includes(setterName)) {
            // Use "dispatch" label for reducer state, "writes" for others
            const label = dataStoreNode.metadata?.isReducer ? 'dispatch' : 'writes';
            console.log(`🚚 ✅ Creating ${label} edge from ${process.name} to ${dataStoreNode.label}`);
            this.edges.push({
              from: processNode.id,
              to: dataStoreNode.id,
              label
            });
          }
        }
        // For library hooks, check if any process property is referenced
        else if (dataStoreNode.metadata?.isLibraryHook && dataStoreNode.metadata?.processProperties) {
          const processProps = dataStoreNode.metadata.processProperties as string[];
          const matchedProps = processProps.filter(prop => process.references.includes(prop));
          if (matchedProps.length > 0) {
            const label = `calls: ${matchedProps.join(', ')}`;
            console.log(`🚚 ✅ Creating ${label} edge from ${process.name} to ${dataStoreNode.label}`);
            this.edges.push({
              from: processNode.id,
              to: dataStoreNode.id,
              label
            });
          }
        }
      }
      
      // Also check cleanup process if it exists
      if (process.cleanupProcess) {
        console.log(`🚚 Processing cleanup process: ${process.cleanupProcess.name}, references:`, process.cleanupProcess.references);
        
        const cleanupNode = this.nodes.find(
          node => node.type === 'process' && node.label === process.cleanupProcess!.name
        );
        
        if (cleanupNode) {
          // Check if cleanup process references any setter functions
          for (const dataStoreNode of dataStoreNodes) {
            if (dataStoreNode.metadata?.isReadWritePair && dataStoreNode.metadata?.writeVariable) {
              const setterName = dataStoreNode.metadata.writeVariable as string;
              if (process.cleanupProcess.references.includes(setterName)) {
                // Use "dispatch" label for reducer state, "writes" for others
                const label = dataStoreNode.metadata?.isReducer ? 'dispatch' : 'writes';
                console.log(`🚚 ✅ Creating ${label} edge from cleanup ${process.cleanupProcess.name} to ${dataStoreNode.label}`);
                this.edges.push({
                  from: cleanupNode.id,
                  to: dataStoreNode.id,
                  label
                });
              }
            } else if (dataStoreNode.metadata?.isLibraryHook && dataStoreNode.metadata?.processProperties) {
              const processProps = dataStoreNode.metadata.processProperties as string[];
              const matchedProps = processProps.filter(prop => process.cleanupProcess!.references.includes(prop));
              if (matchedProps.length > 0) {
                const label = `calls: ${matchedProps.join(', ')}`;
                console.log(`🚚 ✅ Creating ${label} edge from cleanup ${process.cleanupProcess.name} to ${dataStoreNode.label}`);
                this.edges.push({
                  from: cleanupNode.id,
                  to: dataStoreNode.id,
                  label
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Build edges between dependent atoms (Jotai derived atoms)
   * Creates "reads" edges from base atoms to derived atoms
   */
  private buildAtomDependencyEdges(analysis: ComponentAnalysis): void {
    // Get all atom definitions
    const atomDefinitions = analysis.atomDefinitions || [];
    
    if (atomDefinitions.length === 0) {
      return;
    }
    
    // Get all Jotai atom nodes
    const atomNodes = this.nodes.filter(
      node => node.type === 'data-store' && node.metadata?.category === 'jotai-atom'
    );
    
    // For each derived atom, create edges from its dependencies
    for (const atomDef of atomDefinitions) {
      if (!atomDef.isDerived || atomDef.dependencies.length === 0) {
        continue;
      }
      
      // Find the node for this derived atom
      const derivedAtomNode = atomNodes.find(
        node => node.metadata?.atomName === atomDef.name
      );
      
      if (!derivedAtomNode) {
        console.log(`🔬 Atom dependency: Derived atom node not found for ${atomDef.name}`);
        continue;
      }
      
      // Create edges from each dependency to this derived atom
      for (const depName of atomDef.dependencies) {
        const depAtomNode = atomNodes.find(
          node => node.metadata?.atomName === depName
        );
        
        if (depAtomNode) {
          console.log(`🔬 Atom dependency: Creating edge from ${depName} to ${atomDef.name}`);
          this.edges.push({
            from: depAtomNode.id,
            to: derivedAtomNode.id,
            label: 'reads'
          });
        } else {
          console.log(`🔬 Atom dependency: Dependency atom node not found for ${depName}`);
        }
      }
    }
  }

  /**
   * Build edges from mutation library hooks to Server nodes
   * Creates edges when a mutation hook (useSWRMutation, useSWRConfig) writes to server
   */
  private buildMutationToServerEdges(): void {
    this.log('🚚 buildMutationToServerEdges: Starting');
    
    // Find all library hook nodes with process properties (mutations)
    const mutationHookNodes = this.nodes.filter(
      node => node.metadata?.isLibraryHook && 
              node.metadata?.processProperties &&
              (node.metadata.processProperties as string[]).length > 0
    );
    
    console.log(`🚚 Found ${mutationHookNodes.length} mutation hook nodes`);
    
    for (const hookNode of mutationHookNodes) {
      const hookName = hookNode.metadata?.hookName as string;
      const serverNodeId = hookNode.metadata?.serverNodeId as string | undefined;
      
      console.log(`🚚 Processing mutation hook: ${hookName}, has server: ${!!serverNodeId}`);
      
      // For useSWRMutation, the edge is already created by the processor
      // Skip here to avoid duplication
      if (hookName === 'useSWRMutation') {
        console.log(`🚚 Skipping useSWRMutation (edge already created by processor)`);
        continue;
      }
      
      // For useSWRConfig, the edge is already created by the processor
      // Skip here to avoid duplication
      if (hookName === 'useSWRConfig') {
        console.log(`🚚 Skipping useSWRConfig (edge already created by processor)`);
        continue;
      }
      
      // For useMutation (TanStack Query), create edge from hook to Server
      if (hookName === 'useMutation' && serverNodeId) {
        console.log(`🚚 Creating mutate edge from ${hookName} to Server`);
        const edge: DFDEdge = {
          from: hookNode.id,
          to: serverNodeId,
          label: 'mutate'
        };
        // Check if edge already exists to avoid duplication
        const edgeExists = this.edges.some(e => e.from === edge.from && e.to === edge.to && e.label === edge.label);
        if (!edgeExists) {
          this.edges.push(edge);
          console.log(`🚚 ✅ Added mutate edge`);
        } else {
          console.log(`🚚 ⚠️ Edge already exists, skipping`);
        }
      }
      
      // For useQuery (TanStack Query), the edge is already created by the processor
      // Skip here to avoid duplication
      if (hookName === 'useQuery') {
        console.log(`🚚 Skipping useQuery (edge already created by processor)`);
        continue;
      }
      
      // For useInfiniteQuery (TanStack Query), the edge is already created by the processor
      // Skip here to avoid duplication
      if (hookName === 'useInfiniteQuery') {
        console.log(`🚚 Skipping useInfiniteQuery (edge already created by processor)`);
        continue;
      }
    }
    
    this.log('🚚 buildMutationToServerEdges: Completed');
  }

  /**
   * Merge duplicate edges with different sub-labels
   * For example: merge "onClick" and "onClick: mutate" into a single edge with label "onClick: mutate"
   * This prevents duplicate edges when the same connection has multiple sub-labels
   */
  private mergeEdgesWithSubLabels(): void {
    console.log(`🚚 mergeEdgesWithSubLabels: Starting with ${this.edges.length} edges`);
    
    // Group edges by (from, to) pair
    const edgeGroups = new Map<string, DFDEdge[]>();
    
    for (const edge of this.edges) {
      const key = `${edge.from}|${edge.to}`;
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, []);
      }
      edgeGroups.get(key)!.push(edge);
    }
    
    // Process each group
    const mergedEdges: DFDEdge[] = [];
    
    for (const [key, edges] of edgeGroups.entries()) {
      if (edges.length === 1) {
        // No duplicates, keep as is
        mergedEdges.push(edges[0]);
        continue;
      }
      
      // Check if we have edges with sub-labels (containing ":")
      const baseLabels = new Map<string, DFDEdge[]>();
      
      for (const edge of edges) {
        const label = edge.label || '';
        const baseLabel = label.split(':')[0].trim();
        if (!baseLabels.has(baseLabel)) {
          baseLabels.set(baseLabel, []);
        }
        baseLabels.get(baseLabel)!.push(edge);
      }
      
      // For each base label group, keep only the most specific one (with sub-label if available)
      for (const [baseLabel, labelEdges] of baseLabels.entries()) {
        if (labelEdges.length === 1) {
          mergedEdges.push(labelEdges[0]);
        } else {
          // Multiple edges with same base label
          // Prefer the one with sub-label (contains ":")
          const withSubLabel = labelEdges.find(e => (e.label || '').includes(':'));
          if (withSubLabel) {
            mergedEdges.push(withSubLabel);
            console.log(`🚚 Merged edges: kept "${withSubLabel.label}" (removed duplicates)`);
          } else {
            // All have same label, keep first one
            mergedEdges.push(labelEdges[0]);
          }
        }
      }
    }
    
    console.log(`🚚 mergeEdgesWithSubLabels: Reduced from ${this.edges.length} to ${mergedEdges.length} edges`);
    this.edges = mergedEdges;
  }

  /**
   * Build edges from processes to library hook process properties
   * For example: onClick handler calling useSWR's mutate function
   */
  private buildProcessToLibraryHookProcessEdges(analysis: ComponentAnalysis): void {
    this.log('🚚 buildProcessToLibraryHookProcessEdges: Starting');
    
    // Find all library hook nodes with process properties
    const libraryHookNodes = this.nodes.filter(
      node => node.metadata?.isLibraryHook && 
              node.metadata?.processProperties &&
              (node.metadata.processProperties as string[]).length > 0
    );
    
    console.log(`🚚 Found ${libraryHookNodes.length} library hook nodes with process properties`);
    
    // For each process, check if it calls any library hook process properties
    for (const process of analysis.processes) {
      console.log(`🚚 Checking process: ${process.name}, references:`, process.references);
      
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );
      
      if (!processNode) {
        continue;
      }
      
      // Check if this process calls any library hook process properties
      for (const libraryHookNode of libraryHookNodes) {
        const processProperties = libraryHookNode.metadata?.processProperties as string[] || [];
        const hookName = libraryHookNode.metadata?.hookName as string;
        
        // Check if any process property is referenced in this process
        for (const propName of processProperties) {
          // Check if the process references this property
          if (process.references.includes(propName)) {
            // Create edge from process to library hook
            const edge: DFDEdge = {
              from: processNode.id,
              to: libraryHookNode.id,
              label: 'calls'
            };
            
            this.edges.push(edge);
            console.log(`🚚 ✅ Created edge from ${process.name} to ${libraryHookNode.label} (${propName})`);
          }
        }
      }
    }
    
    this.log('🚚 buildProcessToLibraryHookProcessEdges: Completed');
  }

  /**
   * Build edges from props to library hooks
   * For example: url prop used as argument to useSWR
   */
  private buildPropToLibraryHookEdges(analysis: ComponentAnalysis): void {
    this.log('🚚 buildPropToLibraryHookEdges: Starting');
    
    // Find all prop nodes
    const propNodes = this.nodes.filter(
      node => node.type === 'external-entity-input' && node.metadata?.category === 'prop'
    );
    
    // Find all library hook nodes
    const libraryHookNodes = this.nodes.filter(
      node => node.metadata?.isLibraryHook
    );
    
    console.log(`🚚 Found ${propNodes.length} prop nodes and ${libraryHookNodes.length} library hook nodes`);
    
    // For each library hook, check if it uses any props as arguments
    for (const hookNode of libraryHookNodes) {
      const hookName = hookNode.metadata?.hookName as string;
      
      // Find the hook in the analysis
      const hook = analysis.hooks.find(h => h.hookName === hookName);
      if (!hook) {continue;}
      
      // Check if any prop is used as an argument
      const hookAny = hook as any;
      if (hookAny.argumentIdentifiers && hookAny.argumentIdentifiers.length > 0) {
        for (const argId of hookAny.argumentIdentifiers) {
          // Find the prop node with this name
          const propNode = propNodes.find(p => p.label === argId);
          if (propNode) {
            // Create edge from prop to library hook
            this.edges.push({
              from: propNode.id,
              to: hookNode.id,
              label: 'reads'
            });
            console.log(`🚚 ✅ Created edge from prop ${argId} to ${hookName}`);
          }
        }
      }
    }
    
    this.log('🚚 buildPropToLibraryHookEdges: Completed');
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(prefix: string): string {
    return `${prefix}_${this.nodeIdCounter++}`;
  }

  /**
   * Extract variable names from a Vue expression
   * Used for extracting variables from v-if conditions
   */
  private extractVariablesFromExpression(expression: string): string[] {
    const variables: string[] = [];
    
    // Match all identifiers in the expression
    const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    
    let match: RegExpExecArray | null;
    while ((match = identifierRegex.exec(expression)) !== null) {
      const identifier = match[1];
      
      // Filter out JavaScript keywords and common operators
      const keywords = new Set([
        'true', 'false', 'null', 'undefined', 'this',
        'if', 'else', 'for', 'while', 'return', 'function',
        'const', 'let', 'var', 'new', 'typeof', 'instanceof',
      ]);
      
      if (!keywords.has(identifier) && !variables.includes(identifier)) {
        variables.push(identifier);
      }
    }
    
    return variables;
  }

  /**
   * Create ProcessorContext for hook processing
   * Provides utilities and state access to processors
   */
  private createProcessorContext(processorId: string): ProcessorContext {
    if (!this.currentAnalysis) {
      throw new Error('Cannot create processor context: no analysis available');
    }

    return {
      analysis: this.currentAnalysis,
      nodes: this.nodes,
      edges: this.edges,
      generateNodeId: (prefix: string) => this.generateNodeId(prefix),
      findNodeByVariable: (varName: string, nodes: DFDNode[]) => this.findNodeByVariable(varName, nodes) ?? null,
      createServerNode: (endpoint?: string, line?: number, column?: number) => this.createServerNode(endpoint, line, column),
      logger: createLogger(processorId, false, false) // debug=false, verbose=false for concise logging
    };
  }

  /**
   * Process a hook using the processor registry
   * Returns true if the hook was handled by a processor
   */
  private processHookWithRegistry(hook: HookInfo): boolean {
    try {
      // Get global processor registry
      const processorRegistry = getProcessorRegistry();
      
      // Find appropriate processor
      const context = this.createProcessorContext('dfd-builder');
      const processor = processorRegistry.findProcessor(hook, context);
      
      if (!processor) {
        // No processor found for this hook
        return false;
      }

      // Log which processor is handling the hook (always shown for visibility)
      console.log(`[processor] ${processor.metadata.id} → ${hook.hookName}`);

      // Create processor-specific context
      const processorContext = this.createProcessorContext(processor.metadata.id);
      
      // Process the hook
      const result: ProcessorResult = processor.process(hook, processorContext);
      
      if (!result.handled) {
        this.log(`[processor] ${processor.metadata.id} did not handle ${hook.hookName}`);
        return false;
      }

      // Collect nodes and edges from processor result
      this.nodes.push(...result.nodes);
      this.edges.push(...result.edges);
      
      // Collect subgraphs if any
      if (result.subgraphs && result.subgraphs.length > 0) {
        this.exportedHandlerSubgroups.push(...result.subgraphs);
      }

      // Store custom edge builders if any
      if (result.customEdgeBuilders) {
        for (const [varName, builder] of Object.entries(result.customEdgeBuilders)) {
          this.customEdgeBuilders.set(varName, builder);
        }
      }

      this.log(`[processor] Successfully processed ${hook.hookName} with ${processor.metadata.id}: ${result.nodes.length} nodes, ${result.edges.length} edges`);
      return true;
    } catch (error) {
      // Log error with full context and return false to allow fallback to old methods
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error(`[processor-error] Failed to process ${hook.hookName}:`, {
        error: errorMessage,
        stack: errorStack,
        hookInfo: {
          hookName: hook.hookName,
          category: hook.category,
          variables: hook.variables
        }
      });
      
      // Return false to allow fallback to old processing methods
      // This ensures no breaking changes to existing functionality
      return false;
    }
  }

  /**
   * Create nodes for props
   * Function-type props are classified as external-entity-output (event handlers)
   * Other props are classified as external-entity-input (data inputs)
   */
  /**
   * Create nodes for props
   * Function-type props are classified as external-entity-output (event handlers)
   * Other props are classified as external-entity-input (data inputs)
   */
  private createPropsNodes(props: PropInfo[]): void {
    for (const prop of props) {
      // Skip synthetic reducer state variable
      if (prop.name === '__reducer_state__') {
        continue;
      }
      
      // Check if a prop node with this name already exists
      const existingPropNode = this.nodes.find(
        n => n.type === 'external-entity-input' && 
             n.metadata?.category === 'prop' && 
             n.label === prop.name
      );
      
      if (existingPropNode) {
        console.log(`[DFDBuilder] ⏭️ Skipping duplicate prop node: ${prop.name} (already exists as ${existingPropNode.id})`);
        continue;
      }
      
      // Determine if this prop is a function type (event handler)
      const isFunctionType = this.isFunctionTypeProp(prop);
      
      console.log(`[DFDBuilder] Creating prop node: ${prop.name}, isFunctionType: ${isFunctionType}, line: ${prop.line}, column: ${prop.column}`);
      
      this.nodes.push({
        id: this.generateNodeId('prop'),
        label: prop.name,
        type: isFunctionType ? 'external-entity-output' : 'external-entity-input',
        line: prop.line,
        column: prop.column,
        metadata: {
          category: 'prop',
          dataType: prop.type,
          isDestructured: prop.isDestructured,
          isFunctionType,
          typeString: prop.typeString, // Include full TypeScript type string
          line: prop.line,
          column: prop.column
        }
      });
    }
  }

  /**
   * Check if a prop is a function type (event handler)
   * @param prop - The prop to check
   * @returns true if the prop is a function type
   */
  /**
   * Check if a prop is a function type (event handler)
   * @param prop - The prop to check
   * @returns true if the prop is a function type
   */
  private isFunctionTypeProp(prop: PropInfo): boolean {
    // Check for common event handler naming patterns first (most reliable)
    const name = prop.name.toLowerCase();
    if (name.startsWith('on')) {
      console.log(`[DFDBuilder] ${prop.name} detected as function (starts with 'on')`);
      return true;
    }
    
    // Check for known boolean props that should not be treated as functions
    const knownBooleanProps = ['autofocus', 'disabled', 'readonly', 'required', 'checked', 'selected'];
    if (knownBooleanProps.includes(name)) {
      console.log(`[DFDBuilder] ${prop.name} is a known boolean prop, not a function`);
      return false;
    }

    // Check type information if available
    if (prop.type) {
      const type = prop.type.toLowerCase();
      
      // Check for explicit boolean type
      if (type === 'boolean' || type === 'bool') {
        console.log(`[DFDBuilder] ${prop.name} is boolean type, not a function`);
        return false;
      }
      
      // Check for explicit function type
      if (type === 'function') {
        console.log(`[DFDBuilder] ${prop.name} detected as function (type === 'function')`);
        return true;
      }

      // Check for function-like type annotations
      if (type.includes('=>') || type.includes('function')) {
        console.log(`[DFDBuilder] ${prop.name} detected as function (type includes '=>' or 'function')`);
        return true;
      }
    }
    
    // Use type resolution result if available (from TypeResolver) - but only as last resort
    if (prop.isFunction !== undefined) {
      console.log(`[DFDBuilder] ${prop.name} isFunction from TypeResolver: ${prop.isFunction}`);
      return prop.isFunction;
    }
    
    console.log(`[DFDBuilder] ${prop.name} is not a function, defaulting to false`);
    return false;

    return false;
  }

  /**
   * Create nodes for Vue emits
   * Vue emits are classified as external-entity-output (events leaving the component)
   */
  private createVueEmitsNodes(emits: any[]): void {
    for (const emit of emits) {
      console.log(`[DFDBuilder] Creating Vue emit node: ${emit.name}, dataType: ${emit.dataType}`);
      
      this.nodes.push({
        id: this.generateNodeId('vue_emit'),
        label: emit.name,
        type: 'external-entity-output',
        line: emit.line,
        column: emit.column,
        metadata: {
          category: 'vue-emit',
          dataType: emit.dataType,
          line: emit.line,
          column: emit.column
        }
      });
    }
  }

  /**
   * Create nodes for Vue template bindings
   * Creates external entity output nodes for template rendering
   */
  // DEPRECATED: Replaced by buildVueDisplayEdges which creates direct edges
  // This method created intermediate _display nodes which are no longer needed
  /*
  private createVueTemplateOutputNodes(templateBindings: any[]): void {
    // Group bindings by variable to avoid duplicates
    const bindingsByVariable = new Map<string, any[]>();
    
    for (const binding of templateBindings) {
      if (!bindingsByVariable.has(binding.variable)) {
        bindingsByVariable.set(binding.variable, []);
      }
      bindingsByVariable.get(binding.variable)!.push(binding);
    }

    // Create one output node per unique variable used in template
    // BUT only for variables that are actually displayed (not just used in control structures)
    for (const [variable, bindings] of bindingsByVariable.entries()) {
      // Check if this variable is used for display (mustache, v-bind, v-model)
      // vs only for control structures (v-if, v-show, v-for)
      const hasDisplayUsage = bindings.some(b => 
        b.type === 'mustache' || 
        b.type === 'v-bind' || 
        b.type === 'v-model' ||
        b.type === 'v-on'  // Event handlers also need output nodes
      );
      
      // Skip creating display nodes for variables only used in control structures
      if (!hasDisplayUsage) {
        continue;
      }
      
      const firstBinding = bindings[0];
      const bindingTypes = bindings.map(b => b.type).join(', ');
      
      console.log(`[DFDBuilder] Creating Vue template output node: ${variable}, types: ${bindingTypes}`);
      
      this.nodes.push({
        id: this.generateNodeId('vue_template_output'),
        label: `${variable}_display`,
        type: 'external-entity-output',
        line: firstBinding.line,
        column: firstBinding.column,
        metadata: {
          category: 'vue-template',
          sourceVariable: variable,
          bindingTypes: bindings.map(b => b.type),
          line: firstBinding.line,
          column: firstBinding.column
        }
      });
    }
  }
  */

  /**
   * Create JSX element nodes for Vue elements with event handlers
   * These represent interactive UI elements like buttons
   */
  private createVueElementNodesWithEventHandlers(elementsWithEventHandlers: Array<{
    tagName: string;
    event: string;
    handler: string;
    line?: number;
    column?: number;
  }>): void {
    console.log(`[DFDBuilder] createVueElementNodesWithEventHandlers: Creating ${elementsWithEventHandlers.length} element nodes`);
    
    // Create a root template subgraph if it doesn't exist
    // This ensures event handler elements are placed in the same subgraph as other template elements
    if (!this.rootSubgraph) {
      this.rootSubgraph = {
        id: 'subgraph-0',
        label: '<template>',
        type: 'jsx-output',
        elements: [],
      };
    }
    
    for (const element of elementsWithEventHandlers) {
      console.log(`[DFDBuilder] Creating element node: <${element.tagName}> with @${element.event}="${element.handler}"`);
      
      const elementNode: any = {
        id: this.generateNodeId('jsx_element'),
        label: `<${element.tagName}>`,
        type: 'external-entity-output',
        line: element.line,
        column: element.column,
        metadata: {
          category: 'vue-element',
          tagName: element.tagName,
          event: element.event,
          handler: element.handler,
          line: element.line,
          column: element.column,
        }
      };
      
      // Add to both nodes array (for edge creation) and subgraph elements
      this.nodes.push(elementNode);
      this.rootSubgraph.elements.push(elementNode);
    }
  }

  /**
   * Create nodes for Vue state (ref, reactive, computed)
   * Vue state is classified as data-store nodes with appropriate metadata
   */
  private createVueStateNodes(vueState: any[]): void {
    for (const state of vueState) {
      console.log(`[DFDBuilder] Creating Vue state node: ${state.name}, type: ${state.type}, dataType: ${state.dataType}, initialValue: ${state.initialValue}`);
      
      this.nodes.push({
        id: this.generateNodeId('vue_state'),
        label: state.name,
        type: 'data-store',
        line: state.line,
        column: state.column,
        metadata: {
          category: `vue-${state.type}`, // 'vue-ref', 'vue-reactive', or 'vue-computed'
          dataType: state.dataType,
          vueStateType: state.type,
          initialValue: state.initialValue, // Store initial value for edge creation
          line: state.line,
          column: state.column
        }
      });
    }
  }

  /**
   * Create Data Store nodes for Svelte runes ($state, $derived)
   * and Process nodes for $effect runes
   * @param svelteRunes - Array of Svelte rune information
   */
  private createSvelteRuneNodes(svelteRunes: any[]): void {
    for (const rune of svelteRunes) {
      // Create Data Store nodes for state and derived runes
      if (rune.type === 'state' || rune.type === 'derived') {
        this.nodes.push({
          id: this.generateNodeId('svelte_state'),
          label: rune.name,
          type: 'data-store',
          line: rune.line,
          column: rune.column,
          metadata: {
            category: `svelte-${rune.type}`, // 'svelte-state' or 'svelte-derived'
            dataType: rune.dataType,
            svelteRuneType: rune.type,
            line: rune.line,
            column: rune.column,
            dependencies: rune.dependencies, // For derived runes
            initialValue: rune.initialValue, // Store initial value for edge creation
          }
        });
      }
      // Create Process nodes for effect runes
      else if (rune.type === 'effect') {
        this.nodes.push({
          id: this.generateNodeId('svelte_effect'),
          label: 'effect', // Display label is always "effect"
          type: 'process',
          line: rune.line,
          column: rune.column,
          metadata: {
            category: 'svelte-effect',
            svelteRuneType: rune.type,
            effectName: rune.name, // Store internal name (effect_1, effect_2, etc.) for identification
            line: rune.line,
            column: rune.column,
            dependencies: rune.dependencies, // Variables accessed in the effect
          }
        });
      }
    }
  }

  /**
   * Create Data Store nodes for Svelte stores (writable, readable, derived)
   * @param svelteStores - Array of Svelte store information
   */
  private createSvelteStoreNodes(svelteStores: any[]): void {
    for (const store of svelteStores) {
      this.nodes.push({
        id: this.generateNodeId('svelte_store'),
        label: store.name,
        type: 'data-store',
        line: store.line,
        column: store.column,
        metadata: {
          category: `svelte-store-${store.type}`, // 'svelte-store-writable', 'svelte-store-readable', 'svelte-store-derived'
          dataType: store.dataType,
          svelteStoreType: store.type,
          line: store.line,
          column: store.column,
          dependencies: store.dependencies, // For derived stores
          isImported: store.isImported,
          source: store.source,
        }
      });
    }
  }

  /**
   * Create External Entity Input nodes for Svelte store subscriptions
   * @param subscriptions - Array of store subscription information
   */
  private createSvelteStoreSubscriptionNodes(subscriptions: any[]): void {
    for (const sub of subscriptions) {
      // Only create nodes for auto-subscriptions ($store syntax)
      if (sub.isAutoSubscription) {
        // Find the store node
        const storeNode = this.nodes.find(n => 
          n.label === sub.storeName && 
          n.metadata?.category?.startsWith('svelte-store-')
        );
        
        if (storeNode) {
          // Create edge from store to subscription usage
          // The subscription is implicit in Svelte, so we don't create a separate node
          // Instead, we'll create edges when the subscribed value is used
        }
      }
    }
  }

  /**
   * Create Process nodes for computed values from auto-subscriptions
   * @param computedValues - Array of computed value information
   */
  private createSvelteComputedFromSubscriptionNodes(computedValues: any[]): void {
    for (const computed of computedValues) {
      this.nodes.push({
        id: this.generateNodeId('svelte_computed'),
        label: computed.name,
        type: 'data-store',
        line: computed.line,
        column: computed.column,
        metadata: {
          category: 'svelte-computed-from-subscription',
          dependencies: computed.dependencies,
          line: computed.line,
          column: computed.column,
        }
      });
    }
  }

  /**
   * Build data flow edges for Svelte derived store dependencies
   * Creates edges from source stores to derived stores
   */
  private buildSvelteStoreDependencyEdges(svelteStores: any[]): void {
    for (const store of svelteStores) {
      // Only process derived stores with dependencies
      if (store.type !== 'derived' || !store.dependencies || store.dependencies.length === 0) {
        continue;
      }
      
      // Find the derived store node
      const derivedNode = this.nodes.find(n => 
        n.label === store.name && 
        n.metadata?.category === 'svelte-store-derived'
      );
      
      if (!derivedNode) {
        console.log(`[DFDBuilder] Could not find derived store node: ${store.name}`);
        continue;
      }
      
      // Create edges from each dependency to the derived store
      for (const depName of store.dependencies) {
        // Find the source store node
        const sourceNode = this.nodes.find(n => 
          n.label === depName && 
          n.metadata?.category?.startsWith('svelte-store-')
        );
        
        if (sourceNode) {
          this.edges.push({
            from: sourceNode.id,
            to: derivedNode.id,
            label: 'derives'
          });
        }
      }
    }
  }

  /**
   * Build data flow edges for Svelte $derived() rune dependencies
   * Creates edges from source state/stores to derived values
   */
  private buildSvelteDerivedRuneDependencyEdges(svelteRunes: any[]): void {
    for (const rune of svelteRunes) {
      // Only process derived runes with dependencies
      if (rune.type !== 'derived' || !rune.dependencies || rune.dependencies.length === 0) {
        continue;
      }
      
      // Find the derived rune node
      const derivedNode = this.nodes.find(n => 
        n.label === rune.name && 
        n.metadata?.category === 'svelte-derived'
      );
      
      if (!derivedNode) {
        console.log(`[DFDBuilder] Could not find derived rune node: ${rune.name}`);
        continue;
      }
      
      // Create edges from each dependency to the derived rune
      for (const depName of rune.dependencies) {
        // Find the source node (could be $state, another $derived, or a store)
        const sourceNode = this.nodes.find(n => 
          n.label === depName && 
          (n.metadata?.category === 'svelte-state' ||
           n.metadata?.category === 'svelte-derived' ||
           n.metadata?.category?.startsWith('svelte-store-'))
        );
        
        if (sourceNode) {
          // Check if edge already exists
          const edgeExists = this.edges.some(edge =>
            edge.from === sourceNode.id &&
            edge.to === derivedNode.id
          );
          
          if (!edgeExists) {
            this.edges.push({
              from: sourceNode.id,
              to: derivedNode.id,
              label: 'derives'
            });
          }
        } else {
          console.log(`[DFDBuilder] Warning: Source node not found for dependency: ${depName}`);
        }
      }
    }
  }

  /**
   * Build data flow edges for Svelte $effect() rune dependencies
   * Creates edges from source state/stores to effect processes (like Vue watchers)
   */
  private buildSvelteEffectRuneDependencyEdges(svelteRunes: any[]): void {
    for (const rune of svelteRunes) {
      // Only process effect runes with dependencies
      if (rune.type !== 'effect' || !rune.dependencies || rune.dependencies.length === 0) {
        continue;
      }
      
      // Find the effect rune node by internal name (effect_1, effect_2, etc.)
      const effectNode = this.nodes.find(n => 
        n.metadata?.effectName === rune.name && 
        n.metadata?.category === 'svelte-effect'
      );
      
      if (!effectNode) {
        console.log(`[DFDBuilder] Could not find effect rune node: ${rune.name}`);
        continue;
      }
      
      // Create edges from each dependency to the effect rune
      for (const depName of rune.dependencies) {
        // Find the source node (could be $state, $derived, or a store)
        const sourceNode = this.nodes.find(n => 
          n.label === depName && 
          (n.metadata?.category === 'svelte-state' ||
           n.metadata?.category === 'svelte-derived' ||
           n.metadata?.category?.startsWith('svelte-store-'))
        );
        
        if (sourceNode) {
          // Check if edge already exists
          const edgeExists = this.edges.some(edge =>
            edge.from === sourceNode.id &&
            edge.to === effectNode.id
          );
          
          if (!edgeExists) {
            this.edges.push({
              from: sourceNode.id,
              to: effectNode.id,
              label: 'triggers'
            });
          }
        } else {
          console.log(`[DFDBuilder] Warning: Source node not found for effect dependency: ${depName}`);
        }
      }
    }
  }

  /**
   * Create External Entity Output nodes for Svelte markup bindings
   * Wraps all template output nodes in a <template> subgraph (like Vue implementation)
   * @param markupBindings - Array of Svelte markup binding information
   */
  private createSvelteMarkupOutputNodes(markupElements: any[]): void {
    // Create a root template subgraph if it doesn't exist
    if (!this.currentAnalysis?.jsxOutput.rootSubgraph) {
      if (this.currentAnalysis?.jsxOutput) {
        this.currentAnalysis.jsxOutput.rootSubgraph = {
          id: 'subgraph-0',
          label: '&lt;template&gt;',
          type: 'jsx-output',
          elements: [],
        };
      }
    }

    // Create one output node per element
    // Note: Elements inside control flow blocks are already filtered out by the markup analyzer
    for (const element of markupElements) {
      const tagName = element.tagName;
      const bindings = element.bindings || [];
      
      // Convert tag name to <tag> format with HTML entities
      const label = `&lt;${tagName}&gt;`;
      
      const nodeId = this.generateNodeId('jsx_element');
      const node: any = {
        id: nodeId,
        label,
        type: 'external-entity-output',
        line: element.line,
        column: element.column,
        metadata: {
          category: 'svelte-template',
          target: tagName,
          boundVariables: bindings, // Track which variables are bound to this element
          line: element.line,
          column: element.column,
        },
      };
      
      this.nodes.push(node);
      
      // Add node to root template subgraph
      if (this.currentAnalysis?.jsxOutput.rootSubgraph) {
        this.currentAnalysis.jsxOutput.rootSubgraph.elements.push(node);
      }
    }
  }

  /**
   * Create event input nodes from Svelte markup bindings
   * @param markupBindings - Array of Svelte markup binding information
   */
  private createSvelteEventNodesFromMarkup(markupBindings: any[]): void {
    // This method is deprecated - use createSvelteElementNodesWithEventHandlers instead
    // Kept for backward compatibility but does nothing
  }

  /**
   * Create element nodes for Svelte elements with event handlers (e.g., buttons with on:click)
   * Similar to Vue's createVueElementNodesWithEventHandlers
   * @param elementsWithEventHandlers - Array of Svelte element information with event handlers
   */
  private createSvelteElementNodesWithEventHandlers(elementsWithEventHandlers: Array<{
    tagName: string;
    event: string;
    handler: string;
    line?: number;
    column?: number;
  }>): void {
    // Create a root template subgraph if it doesn't exist
    // This ensures event handler elements are placed in the same subgraph as other template elements
    if (!this.currentAnalysis?.jsxOutput.rootSubgraph) {
      if (this.currentAnalysis?.jsxOutput) {
        this.currentAnalysis.jsxOutput.rootSubgraph = {
          id: 'subgraph-0',
          label: '&lt;template&gt;',
          type: 'jsx-output',
          elements: [],
        };
      }
    }
    
    for (const element of elementsWithEventHandlers) {
      // Convert tag name to <tag> format with HTML entities
      const label = `&lt;${element.tagName}&gt;`;
      
      const elementNode: any = {
        id: this.generateNodeId('jsx_element'),
        label,
        type: 'external-entity-output',
        line: element.line,
        column: element.column,
        metadata: {
          category: 'svelte-element',
          tagName: element.tagName,
          event: element.event,
          handler: element.handler,
          line: element.line,
          column: element.column,
        }
      };
      
      // Add to both nodes array (for edge creation) and subgraph elements
      this.nodes.push(elementNode);
      
      // Add node to root template subgraph
      if (this.currentAnalysis?.jsxOutput.rootSubgraph) {
        this.currentAnalysis.jsxOutput.rootSubgraph.elements.push(elementNode);
      }
    }
  }

  /**
   * Build data flow edges from variables to Svelte markup output nodes
   * @param markupBindings - Array of Svelte markup binding information
   */
  private buildSvelteMarkupEdges(markupElements: any[]): void {
    // Get markup bindings from metadata to determine binding types
    const markupBindings = this.currentAnalysis?.metadata?.svelteMarkupBindings || [];
    
    for (const element of markupElements) {
      const tagName = element.tagName;
      const bindings = element.bindings || [];
      
      // Find the template node for this element
      const templateNode = this.nodes.find(n => 
        n.type === 'external-entity-output' &&
        n.metadata?.category === 'svelte-template' &&
        n.metadata?.target === tagName &&
        n.line === element.line
      );
      
      if (!templateNode) {
        continue;
      }
      
      // Create edges from each bound variable to the template node
      for (const variable of bindings) {
        // Check if this is a store auto-subscription (starts with $)
        let sourceVariableName = variable;
        let isAutoSubscription = false;
        
        if (variable.startsWith('$')) {
          // Strip the $ prefix to find the store node
          sourceVariableName = variable.substring(1);
          isAutoSubscription = true;
        }
        
        // Find the source node (could be state, derived, prop, store, or computed process)
        const sourceNode = this.nodes.find(n => 
          n.label === sourceVariableName && 
          (n.type === 'data-store' || 
           n.type === 'external-entity-input' ||
           n.type === 'process' ||
           n.metadata?.category?.startsWith('svelte-'))
        );
        
        if (sourceNode) {
          // Determine the edge label based on binding type
          // Check if this variable is used in a class: or style: directive for this specific element
          const bindingInfo = markupBindings.find((b: any) => 
            b.variable === variable && 
            (b.type === 'class' || b.type === 'style') &&
            // Match by line number to ensure we're looking at the same element
            Math.abs((b.line || 0) - (element.line || 0)) < 5
          );
          
          const label = bindingInfo ? 'binds' : 'displays';
          
          this.edges.push({
            from: sourceNode.id,
            to: templateNode.id,
            label: label
          });
        }
      }
    }
  }

  /**
   * Build data flow edges from Svelte event nodes to handler processes
   * @param markupBindings - Array of Svelte markup binding information
   */
  private buildSvelteEventEdges(markupBindings: any[]): void {
    // This method is deprecated - use buildSvelteEventHandlerDataFlows instead
    // Kept for backward compatibility but does nothing
  }

  /**
   * Build data flow edges from Svelte element nodes to handler processes
   * Similar to Vue's buildVueEventHandlerDataFlows
   * @param analysis - Component analysis with Svelte elements with event handlers
   */
  private buildSvelteEventHandlerDataFlows(analysis: ComponentAnalysis): void {
    if (!analysis.metadata?.svelteElementsWithEventHandlers || analysis.metadata.svelteElementsWithEventHandlers.length === 0) {
      return;
    }

    for (const element of analysis.metadata.svelteElementsWithEventHandlers) {
      // Find the element node
      const elementNode = this.nodes.find(node =>
        node.metadata?.category === 'svelte-element' &&
        node.metadata?.tagName === element.tagName &&
        node.metadata?.handler === element.handler &&
        node.line === element.line
      );

      if (!elementNode) {
        continue;
      }

      // Extract the function name from the handler (support "functionName", functionName(), etc.)
      const functionName = element.handler.replace(/\(.*\)$/, '').trim();

      // Find the process node for the event handler
      const processNode = this.nodes.find(node =>
        node.type === 'process' &&
        node.label === element.handler
      );

      if (!processNode) {
        continue;
      }

      // Create edge from element to process with event label
      const eventLabel = `on:${element.event}`;
      
      this.edges.push({
        from: elementNode.id,
        to: processNode.id,
        label: eventLabel
      });

      // Find state nodes that this process references or modifies
      const processInfo = analysis.processes.find(p => p.name === element.handler);
      if (processInfo && processInfo.references) {
        for (const ref of processInfo.references) {
          // Extract the base variable name (e.g., "counter" from "counter.update")
          const baseRef = ref.split('.')[0];
          
          // Find the state/store node
          const stateNode = this.nodes.find(node =>
            (node.type === 'data-store' || node.type === 'external-entity-input') &&
            (node.label === ref || node.label === baseRef)
          );

          if (stateNode) {
            // Determine if this is a read or write operation
            // Check if the reference is in the writes list (from process analyzer)
            const isWrite = (processInfo.writes && processInfo.writes.includes(baseRef)) ||
                           ref.includes('.update') || ref.includes('.set') || ref.includes('=');
            
            if (isWrite) {
              // Remove any existing "reads" edge from state to process
              this.edges = this.edges.filter(edge =>
                !(edge.from === stateNode.id &&
                  edge.to === processNode.id &&
                  edge.label === 'reads')
              );
              
              // Check if edge already exists
              const edgeExists = this.edges.some(edge =>
                edge.from === processNode.id &&
                edge.to === stateNode.id &&
                edge.label === 'updates'
              );

              if (!edgeExists) {
                this.edges.push({
                  from: processNode.id,
                  to: stateNode.id,
                  label: 'updates'
                });
              }
            } else {
              // It's a read operation - create edge from state to process
              const edgeExists = this.edges.some(edge =>
                edge.from === stateNode.id &&
                edge.to === processNode.id &&
                edge.label === 'reads'
              );

              if (!edgeExists) {
                this.edges.push({
                  from: stateNode.id,
                  to: processNode.id,
                  label: 'reads'
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Build data flow edges for Svelte bind: directives
   * Creates bidirectional edges for two-way bindings like bind:value
   * @param markupBindings - Array of markup bindings from Svelte analyzer
   */
  private buildSvelteBindingEdges(markupBindings: any[]): void {
    if (!markupBindings || markupBindings.length === 0) {
      return;
    }

    for (const binding of markupBindings) {
      if (binding.type !== 'bind') {
        continue;
      }

      const variable = binding.variable;
      const target = binding.target; // e.g., "value", "checked"
      
      // Find the state node
      const stateNode = this.nodes.find(n =>
        n.label === variable &&
        (n.type === 'data-store' || n.metadata?.category?.startsWith('svelte-'))
      );

      if (!stateNode) {
        continue;
      }

      // Find or create the input element node
      // Look for existing element node at the same line
      let elementNode = this.nodes.find(n =>
        n.type === 'external-entity-output' &&
        n.metadata?.category === 'svelte-element' &&
        n.line === binding.line
      );

      // If no element node exists, create one
      if (!elementNode) {
        // Find the tag name from markup at this line
        const tagName = this.findTagNameAtLine(binding.line);
        
        elementNode = {
          id: this.generateNodeId('jsx_element'),
          label: `<${tagName}>`,
          type: 'external-entity-output',
          line: binding.line,
          column: binding.column,
          metadata: {
            category: 'svelte-element',
            tagName: tagName,
            bindTarget: target,
          }
        };
        
        this.nodes.push(elementNode);
        
        // Add to template subgraph if it exists
        if (this.currentAnalysis?.jsxOutput.rootSubgraph) {
          this.currentAnalysis.jsxOutput.rootSubgraph.elements.push(elementNode);
        }
      }

      // Create bidirectional edges for two-way binding
      // 1. State -> Element (binds)
      this.edges.push({
        from: stateNode.id,
        to: elementNode.id,
        label: 'binds'
      });

      // 2. Element -> State (on:change/on:input)
      const changeEvent = target === 'checked' ? 'on:change' : 'on:input';
      this.edges.push({
        from: elementNode.id,
        to: stateNode.id,
        label: changeEvent
      });
    }
  }

  /**
   * Helper method to find tag name at a specific line
   * @param line - Line number
   * @returns Tag name or 'input' as default
   */
  private findTagNameAtLine(line?: number): string {
    if (!line) {
      return 'input';
    }

    // Look for existing element nodes at this line
    const existingElement = this.nodes.find(n =>
      n.line === line &&
      n.metadata?.tagName
    );

    if (existingElement && existingElement.metadata?.tagName) {
      return existingElement.metadata.tagName;
    }

    // Default to 'input' for bind: directives
    return 'input';
  }

  /**
   * Build data flow edges for Svelte conditional structures ({#if})
   * @param conditionalStructures - Array of Svelte conditional structure information
   */
  /**
   * Build subgraphs for Svelte conditional structures ({#if})
   * Creates subgraph structures for conditional rendering
   */
  private buildSvelteConditionalEdges(conditionalStructures: any[]): void {
    if (!conditionalStructures || conditionalStructures.length === 0) {
      return;
    }

    console.log(`[DFDBuilder] buildSvelteConditionalEdges: Processing ${conditionalStructures.length} conditional structures`);

    // Create a root template subgraph if it doesn't exist
    if (!this.currentAnalysis?.jsxOutput.rootSubgraph) {
      if (this.currentAnalysis) {
        this.currentAnalysis.jsxOutput.rootSubgraph = {
          id: 'subgraph-0',
          label: '<template>',
          type: 'jsx-output',
          elements: [],
        };
      }
    }

    const rootSubgraph = this.currentAnalysis?.jsxOutput.rootSubgraph;
    if (!rootSubgraph) {
      console.log('[DFDBuilder] Warning: No root subgraph available for conditional structures');
      return;
    }

    // Process each conditional structure
    for (const conditionalStructure of conditionalStructures) {
      const { condition, variables } = conditionalStructure;

      console.log(`[DFDBuilder] Creating conditional subgraph for: ${condition}`);

      // Create a conditional subgraph
      const subgraphId = this.generateNodeId('subgraph');
      const conditionalSubgraph: any = {
        id: subgraphId,
        label: `{${condition}}`,
        type: 'conditional',
        condition: {
          expression: condition,
          variables: variables,
        },
        elements: [],
      };

      // Extract display dependencies from the element bindings
      const displayDependencies: string[] = [];
      
      if (conditionalStructure.element.bindings) {
        for (const binding of conditionalStructure.element.bindings) {
          if (binding.type === 'expression') {
            if (!displayDependencies.includes(binding.variable)) {
              displayDependencies.push(binding.variable);
            }
          }
        }
      }

      // Create a template output node for the element inside the conditional
      const elementNodeId = this.generateNodeId('jsx_element');
      const elementNode: any = {
        id: elementNodeId,
        label: '<p>',
        type: 'external-entity-output',
        line: conditionalStructure.line,
        column: conditionalStructure.column,
        metadata: {
          category: 'svelte-template',
          displayDependencies: displayDependencies,
          attributeReferences: [],
        },
      };

      // Add the element node to the conditional subgraph
      conditionalSubgraph.elements.push(elementNode);

      // Add the conditional subgraph to the root subgraph
      rootSubgraph.elements.push(conditionalSubgraph);

      // Create data flow edges from condition variables to the subgraph
      for (const variable of variables) {
        // Find the source node (prop, state, computed, etc.)
        const sourceNode = this.nodes.find(node =>
          node.label === variable &&
          (node.type === 'external-entity-input' ||
           node.type === 'data-store' ||
           node.metadata?.category?.startsWith('svelte-'))
        );

        if (sourceNode) {
          console.log(`[DFDBuilder] Creating edge from ${variable} to conditional subgraph`);
          
          // Create edge from source to subgraph (control visibility)
          this.edges.push({
            from: sourceNode.id,
            to: subgraphId,
            label: 'control visibility',
          });
        } else {
          console.log(`[DFDBuilder] Warning: No source node found for conditional variable: ${variable}`);
        }
      }
    }

    console.log(`[DFDBuilder] Created ${conditionalStructures.length} conditional subgraphs`);
  }

  /**
   * Build data flow edges for Svelte loop structures ({#each})
   * @param loopStructures - Array of Svelte loop structure information
   */
  /**
   * Build subgraphs for Svelte loop structures ({#each})
   * Creates subgraph structures for list rendering
   */
  private buildSvelteLoopEdges(loopStructures: any[]): void {
    if (!loopStructures || loopStructures.length === 0) {
      return;
    }

    console.log(`[DFDBuilder] buildSvelteLoopEdges: Processing ${loopStructures.length} loop structures`);

    // Create a root template subgraph if it doesn't exist
    if (!this.currentAnalysis?.jsxOutput.rootSubgraph) {
      if (this.currentAnalysis) {
        this.currentAnalysis.jsxOutput.rootSubgraph = {
          id: 'subgraph-0',
          label: '&lt;template&gt;',
          type: 'jsx-output',
          elements: [],
        };
      }
    }

    const rootSubgraph = this.currentAnalysis?.jsxOutput.rootSubgraph;
    if (!rootSubgraph) {
      console.log('[DFDBuilder] Warning: No root subgraph available for loop structures');
      return;
    }

    // Process each loop structure
    for (const loopStructure of loopStructures) {
      const { source } = loopStructure;

      console.log(`[DFDBuilder] Creating loop subgraph for: ${source}`);

      // Create a loop subgraph
      const subgraphId = this.generateNodeId('subgraph');
      const subgraphLabel = `{#each ${source}}`;
      
      const loopSubgraph: any = {
        id: subgraphId,
        label: subgraphLabel,
        type: 'loop',
        source: source,
        elements: [],
        subgraphs: [], // Add subgraphs array for nested structure
      };

      // Extract display dependencies from the element bindings
      // Note: Loop variables (like "item" in {#each items as item}) should be treated
      // as references to the source array, not as separate variables
      const displayDependencies: string[] = [];
      
      if (loopStructure.element.bindings) {
        for (const binding of loopStructure.element.bindings) {
          if (binding.type === 'expression') {
            // The binding variable is the loop variable (e.g., "item")
            // We want to track that this element displays data from the source array
            if (!displayDependencies.includes(source)) {
              displayDependencies.push(source);
            }
          }
        }
      }

      // Create a single template output node for the element inside the loop
      // There should be only ONE element per loop structure
      const elementNodeId = this.generateNodeId('jsx_element');
      const elementNode: any = {
        id: elementNodeId,
        label: '&lt;li&gt;',
        type: 'external-entity-output',
        line: loopStructure.line,
        column: loopStructure.column,
        metadata: {
          category: 'svelte-template',
          displayDependencies: displayDependencies,
          attributeReferences: [],
        },
      };

      // Add the element node to the loop subgraph
      loopSubgraph.elements.push(elementNode);

      // Add the loop subgraph to the root subgraph
      rootSubgraph.elements.push(loopSubgraph);

      // Create data flow edge from source array to the subgraph
      const sourceNode = this.nodes.find(node =>
        node.label === source &&
        (node.type === 'external-entity-input' ||
         node.type === 'data-store' ||
         node.metadata?.category?.startsWith('svelte-'))
      );

      if (sourceNode) {
        console.log(`[DFDBuilder] Creating edge from ${source} to loop subgraph`);
        
        // Create edge from source to subgraph (provides data for iteration)
        this.edges.push({
          from: sourceNode.id,
          to: subgraphId,
          label: 'iterates over',
        });

        // Create direct edge from source to the element inside the loop
        // This is needed because Mermaid doesn't display edges to nodes inside subgraphs well
        console.log(`[DFDBuilder] Creating direct edge from ${source} to <li> element`);
        this.edges.push({
          from: sourceNode.id,
          to: elementNodeId,
          label: 'displays',
        });
      } else {
        console.log(`[DFDBuilder] Warning: No source node found for loop source: ${source}`);
      }
    }

    console.log(`[DFDBuilder] Created ${loopStructures.length} loop subgraphs`);
  }

  /**
   * Build data flow edges for Svelte await structures ({#await})
   * @param awaitStructures - Array of Svelte await structure information
   */
  /**
   * Build subgraphs for Svelte await structures ({#await})
   * Creates subgraph structures for async rendering
   */
  private buildSvelteAwaitEdges(awaitStructures: any[]): void {
    if (!awaitStructures || awaitStructures.length === 0) {
      return;
    }

    console.log(`[DFDBuilder] buildSvelteAwaitEdges: Processing ${awaitStructures.length} await structures`);

    // Create a root template subgraph if it doesn't exist
    if (!this.currentAnalysis?.jsxOutput.rootSubgraph) {
      if (this.currentAnalysis) {
        this.currentAnalysis.jsxOutput.rootSubgraph = {
          id: 'subgraph-0',
          label: '&lt;template&gt;',
          type: 'jsx-output',
          elements: [],
        };
      }
    }

    const rootSubgraph = this.currentAnalysis?.jsxOutput.rootSubgraph;
    if (!rootSubgraph) {
      console.log('[DFDBuilder] Warning: No root subgraph available for await structures');
      return;
    }

    // Process each await structure
    for (const awaitStructure of awaitStructures) {
      const { promise } = awaitStructure;

      console.log(`[DFDBuilder] Creating await subgraph for: ${promise}`);

      // Create an await subgraph
      const subgraphId = this.generateNodeId('subgraph');
      const subgraphLabel = `{#await ${promise}}`;
      
      const awaitSubgraph: any = {
        id: subgraphId,
        label: subgraphLabel,
        type: 'await',
        promise: promise,
        elements: [],
        subgraphs: [], // Add subgraphs array for nested structure
      };

      // Group bindings by their line number to create separate elements
      // This ensures we create one element per actual HTML element in the markup
      const elementBindingsMap = new Map<number, any[]>();
      
      if (awaitStructure.element.bindings) {
        for (const binding of awaitStructure.element.bindings) {
          if (binding.type === 'expression') {
            const line = binding.line || 0;
            if (!elementBindingsMap.has(line)) {
              elementBindingsMap.set(line, []);
            }
            elementBindingsMap.get(line)!.push(binding);
          }
        }
      }

      // Create template output nodes for each unique element (by line number)
      const createdElements: any[] = [];
      for (const [line, bindings] of elementBindingsMap.entries()) {
        const firstBinding = bindings[0];
        const tagName = firstBinding.target || 'p'; // Default to 'p' if no target
        const elementNodeId = this.generateNodeId('jsx_element');
        const elementNode: any = {
          id: elementNodeId,
          label: `&lt;${tagName}&gt;`,
          type: 'external-entity-output',
          line: firstBinding.line,
          column: firstBinding.column,
          metadata: {
            category: 'svelte-template',
            displayDependencies: bindings.map(b => b.variable),
            attributeReferences: [],
          },
        };

        // Add the element node to the await subgraph
        awaitSubgraph.elements.push(elementNode);
        createdElements.push({ node: elementNode, bindings });
      }

      // Add the await subgraph to the root subgraph
      rootSubgraph.elements.push(awaitSubgraph);

      // Create data flow edge from promise to the subgraph
      const promiseNode = this.nodes.find(node =>
        node.label === promise &&
        (node.type === 'external-entity-input' ||
         node.type === 'data-store' ||
         node.metadata?.category?.startsWith('svelte-'))
      );

      if (promiseNode) {
        console.log(`[DFDBuilder] Creating edge from ${promise} to await subgraph`);
        
        // Create edge from promise to subgraph (async resolution)
        this.edges.push({
          from: promiseNode.id,
          to: subgraphId,
          label: 'resolves to',
        });

        // Create direct edges from promise to each <p> element inside the await block
        // This is needed because Mermaid doesn't display edges to nodes inside subgraphs well
        for (const { node } of createdElements) {
          console.log(`[DFDBuilder] Creating direct edge from ${promise} to <p> element`);
          this.edges.push({
            from: promiseNode.id,
            to: node.id,
            label: 'displays',
          });
        }
      } else {
        console.log(`[DFDBuilder] Warning: No source node found for promise: ${promise}`);
      }
    }

    console.log(`[DFDBuilder] Created ${awaitStructures.length} await subgraphs`);
  }

  /**
   * Create External Entity Output nodes for Svelte events
   * @param svelteEvents - Array of Svelte event information
   */
  private createSvelteEventNodes(svelteEvents: any[]): void {
    const eventNodes: DFDNode[] = [];
    
    for (const event of svelteEvents) {
      const eventNode: DFDNode = {
        id: this.generateNodeId('svelte_event'),
        label: event.name,
        type: 'external-entity-output',
        line: event.line,
        column: event.column,
        metadata: {
          category: 'svelte-event',
          dataType: event.dataType,
          line: event.line,
          column: event.column,
        }
      };
      
      eventNodes.push(eventNode);
      this.nodes.push(eventNode);
    }
    
    // Create events subgraph (similar to Vue emits)
    if (eventNodes.length > 0) {
      const eventsSubgraph: DFDSubgraph = {
        id: this.generateNodeId('events_subgraph'),
        label: 'Events',
        type: 'emits', // Use 'emits' type like Vue
        elements: eventNodes
      };
      
      // Add the subgraph to exportedHandlerSubgroups (reusing existing infrastructure)
      this.exportedHandlerSubgroups.push(eventsSubgraph);
    }
  }

  /**
   * Build data flow edges for Svelte dispatch calls
   * Creates edges from processes to event outputs
   * @param dispatchCalls - Array of dispatch call information
   */
  private buildSvelteDispatchEdges(dispatchCalls: any[]): void {
    for (const call of dispatchCalls) {
      // Find the event node
      const eventNode = this.nodes.find(n => 
        n.label === call.eventName && 
        n.metadata?.category === 'svelte-event'
      );
      
      if (!eventNode) {
        console.log(`[DFDBuilder] Could not find event node: ${call.eventName}`);
        continue;
      }
      
      // Find the caller process node (if specified)
      if (call.callerProcess) {
        const processNode = this.nodes.find(n => 
          n.label === call.callerProcess && 
          n.type === 'process'
        );
        
        if (processNode) {
          this.edges.push({
            from: processNode.id,
            to: eventNode.id,
            label: 'dispatches'
          });
        }
      }
    }
  }

  /**
   * Build edges from processes to stores for update operations
   * Handles counter.update() and userName.set() calls
   */
  private buildSvelteStoreUpdateEdges(storeUpdates: any[]): void {
    for (const update of storeUpdates) {
      // Find the store node
      const storeNode = this.nodes.find(n => 
        n.label === update.storeName && 
        n.type === 'data-store' &&
        n.metadata?.category?.startsWith('svelte-store')
      );
      
      if (!storeNode) {
        continue;
      }
      
      // Find the process node that contains this update
      // We need to find which process this update belongs to
      // For now, we'll look for processes that reference this store
      const processNode = this.nodes.find(n => 
        n.type === 'process' &&
        n.metadata?.references?.includes(update.storeName)
      );
      
      if (processNode) {
        this.edges.push({
          from: processNode.id,
          to: storeNode.id,
          label: 'updates'
        });
      }
    }
  }

  /**
   * Build data flow edges for computed values from auto-subscriptions
   * Creates edges from stores to computed processes and from computed processes to template
   */
  private buildSvelteComputedFromSubscriptionEdges(computedValues: any[]): void {
    for (const computed of computedValues) {
      // Find the computed data store node
      const computedNode = this.nodes.find(n => 
        n.label === computed.name && 
        n.type === 'data-store' &&
        n.metadata?.category === 'svelte-computed-from-subscription'
      );
      
      if (!computedNode) {
        continue;
      }
      
      // Create edges from stores to computed data store
      for (const storeName of computed.dependencies) {
        const storeNode = this.nodes.find(n => 
          n.label === storeName && 
          n.type === 'data-store' &&
          n.metadata?.category?.startsWith('svelte-store')
        );
        
        if (storeNode) {
          this.edges.push({
            from: storeNode.id,
            to: computedNode.id,
            label: 'provides data'
          });
        }
      }
      
      // Create edges from computed data store to template elements that display it
      // Find template elements that reference this computed value
      const templateNodes = this.nodes.filter(n => 
        n.type === 'external-entity-output' &&
        n.metadata?.category === 'svelte-template'
      );
      
      for (const templateNode of templateNodes) {
        // Check if this template node displays the computed value
        // This is determined by checking if the computed variable is referenced in the template
        if (templateNode.metadata?.boundVariables?.includes(computed.name)) {
          this.edges.push({
            from: computedNode.id,
            to: templateNode.id,
            label: 'displays'
          });
        }
      }
    }
  }

  /**
   * Build data flow edges for Vue computed property dependencies
   * Creates edges from source state to computed state
   */
  private buildVueComputedDependencyEdges(vueState: any[]): void {
    console.log(`[DFDBuilder] buildVueComputedDependencyEdges: Processing ${vueState.length} state declarations`);
    
    for (const state of vueState) {
      // Only process computed properties with dependencies
      if (state.type !== 'computed' || !state.dependencies || state.dependencies.length === 0) {
        continue;
      }
      
      console.log(`[DFDBuilder] Processing computed property: ${state.name} with dependencies:`, state.dependencies);
      
      // Find the computed state node
      const computedNode = this.nodes.find(node =>
        node.label === state.name &&
        node.metadata?.category === 'vue-computed'
      );
      
      if (!computedNode) {
        console.log(`[DFDBuilder] Warning: Computed node not found for: ${state.name}`);
        continue;
      }
      
      // Create edges from each dependency to the computed property
      for (const dep of state.dependencies) {
        // Find the source state node (could be ref, reactive, or another computed)
        const sourceNode = this.nodes.find(node =>
          node.label === dep &&
          node.type === 'data-store' &&
          (node.metadata?.category === 'vue-ref' ||
           node.metadata?.category === 'vue-reactive' ||
           node.metadata?.category === 'vue-computed')
        );
        
        if (sourceNode) {
          console.log(`[DFDBuilder] Creating edge from ${dep} to computed ${state.name}`);
          
          // Check if edge already exists
          const edgeExists = this.edges.some(edge =>
            edge.from === sourceNode.id &&
            edge.to === computedNode.id
          );
          
          if (!edgeExists) {
            this.edges.push({
              from: sourceNode.id,
              to: computedNode.id,
              label: 'computes'
            });
          }
        } else {
          console.log(`[DFDBuilder] Warning: Source node not found for dependency: ${dep}`);
        }
      }
    }
  }

  /**
   * Build edges from script variables to Vue template outputs
   * Creates data flows from state/props/computed to template rendering
   */
  // DEPRECATED: Replaced by buildVueDisplayEdges which creates direct edges
  // This method created edges to intermediate _display nodes which are no longer needed
  /*
  private buildVueTemplateDataFlows(analysis: ComponentAnalysis, templateBindings: any[]): void {
    console.log(`[DFDBuilder] buildVueTemplateDataFlows: Processing ${templateBindings.length} bindings`);
    
    // Group bindings by variable
    const bindingsByVariable = new Map<string, any[]>();
    
    for (const binding of templateBindings) {
      if (!bindingsByVariable.has(binding.variable)) {
        bindingsByVariable.set(binding.variable, []);
      }
      bindingsByVariable.get(binding.variable)!.push(binding);
    }
    
    console.log(`[DFDBuilder] buildVueTemplateDataFlows: Grouped into ${bindingsByVariable.size} unique variables`);
    console.log(`[DFDBuilder] buildVueTemplateDataFlows: Variables:`, Array.from(bindingsByVariable.keys()));

    // Create edges from source nodes to template output nodes
    for (const [variable, bindings] of bindingsByVariable.entries()) {
      // Check if this variable is used for display (mustache, v-bind, v-model)
      // vs only for control structures (v-if, v-show, v-for)
      const displayBindings = bindings.filter(b => 
        b.type === 'mustache' || 
        b.type === 'v-bind' || 
        b.type === 'v-model'
      );
      
      const controlOnlyBindings = bindings.filter(b =>
        b.type === 'v-if' ||
        b.type === 'v-show' ||
        b.type === 'v-for'
      );
      
      // Only create display edges for variables that are actually displayed
      if (displayBindings.length > 0) {
        // Find the source node (could be prop, state, computed, etc.)
        const sourceNode = this.nodes.find(node => 
          node.label === variable && 
          (node.type === 'external-entity-input' || 
           node.type === 'data-store' ||
           node.metadata?.category === 'state-management' ||
           node.metadata?.category === 'vue-state' ||
           node.metadata?.category === 'vue-computed')
        );

        // Find the template output node
        const outputNode = this.nodes.find(node =>
          node.metadata?.category === 'vue-template' &&
          node.metadata?.sourceVariable === variable
        );

        if (sourceNode && outputNode) {
          const bindingTypes = displayBindings.map(b => b.type).join(', ');
          console.log(`[DFDBuilder] Creating edge from ${variable} to template output (${bindingTypes})`);
          
          this.edges.push({
            from: sourceNode.id,
            to: outputNode.id,
            label: 'display'
          });
        } else {
          if (!sourceNode) {
            console.log(`[DFDBuilder] Warning: No source node found for template variable: ${variable}`);
          }
          if (!outputNode) {
            console.log(`[DFDBuilder] Warning: No output node found for template variable: ${variable}`);
          }
        }
      }
    }

    // Create edges from event handlers (v-on bindings) to processes
    for (const binding of templateBindings) {
      if (binding.type === 'v-on') {
        // Find the process node for the event handler
        const processNode = this.nodes.find(node =>
          node.type === 'process' &&
          node.label === binding.variable
        );

        // Find the template output node
        const outputNode = this.nodes.find(node =>
          node.metadata?.category === 'vue-template' &&
          node.metadata?.sourceVariable === binding.variable
        );

        if (processNode && outputNode) {
          console.log(`[DFDBuilder] Creating edge from template to event handler: ${binding.variable}`);
          
          this.edges.push({
            from: outputNode.id,
            to: processNode.id,
            label: binding.target || 'event'
          });
        }
      }
    }
  }
  */

  /**
   * Build data flows for Vue event handlers
   * Creates edges from element nodes to process nodes and from process nodes to state nodes
   */
  private buildVueEventHandlerDataFlows(analysis: ComponentAnalysis): void {
    if (!analysis.vueElementsWithEventHandlers || analysis.vueElementsWithEventHandlers.length === 0) {
      return;
    }

    console.log(`[DFDBuilder] buildVueEventHandlerDataFlows: Processing ${analysis.vueElementsWithEventHandlers.length} elements with event handlers`);

    for (const element of analysis.vueElementsWithEventHandlers) {
      // Find the element node
      const elementNode = this.nodes.find(node =>
        node.metadata?.category === 'vue-element' &&
        node.metadata?.tagName === element.tagName &&
        node.metadata?.handler === element.handler &&
        node.line === element.line
      );

      if (!elementNode) {
        console.log(`[DFDBuilder] Warning: Element node not found for <${element.tagName}> with @${element.event}="${element.handler}"`);
        continue;
      }

      // Extract the function name from the handler (support "functionName", functionName(), etc.)
      const functionName = element.handler.replace(/\(.*\)$/, '').trim();
      
      // Check if this is a composable function call
      const composableNode = this.nodes.find(node =>
        node.metadata?.isCustomComposable &&
        node.metadata?.functionProperties &&
        (node.metadata.functionProperties as string[]).includes(functionName)
      );

      if (composableNode) {
        // Create edge from element to composable with "calls: functionName" as label
        console.log(`[DFDBuilder] Creating edge from <${element.tagName}> to composable ${composableNode.label} with label "calls: ${functionName}"`);
        
        this.edges.push({
          from: elementNode.id,
          to: composableNode.id,
          label: `calls: ${functionName}`
        });
        continue;
      }

      // Find the process node for the event handler
      const processNode = this.nodes.find(node =>
        node.type === 'process' &&
        node.label === element.handler
      );

      if (!processNode) {
        console.log(`[DFDBuilder] Warning: Process node not found for handler: ${element.handler}`);
        continue;
      }

      // Create edge from element to process with event label
      const eventLabel = `@${element.event}`;
      console.log(`[DFDBuilder] Creating edge from <${element.tagName}> to ${element.handler} with label "${eventLabel}"`);
      
      this.edges.push({
        from: elementNode.id,
        to: processNode.id,
        label: eventLabel
      });

      // Find state nodes that this process modifies
      // Look for processes that reference state variables
      const processInfo = analysis.processes.find(p => p.name === element.handler);
      if (processInfo && processInfo.references) {
        console.log(`[DFDBuilder] Process ${element.handler} references:`, processInfo.references);
        
        for (const ref of processInfo.references) {
          // Extract the base variable name (e.g., "user" from "user.name")
          const baseRef = ref.split('.')[0];
          
          // Check if this reference is a composable function call
          const referencedComposable = this.nodes.find(node =>
            node.metadata?.isCustomComposable &&
            node.metadata?.functionProperties &&
            (node.metadata.functionProperties as string[]).includes(baseRef)
          );

          if (referencedComposable) {
            console.log(`[DFDBuilder] Creating edge from ${element.handler} to composable ${referencedComposable.label} with label "calls: ${baseRef}"`);
            
            // Check if edge already exists
            const edgeExists = this.edges.some(edge =>
              edge.from === processNode.id &&
              edge.to === referencedComposable.id &&
              edge.label === `calls: ${baseRef}`
            );

            if (!edgeExists) {
              this.edges.push({
                from: processNode.id,
                to: referencedComposable.id,
                label: `calls: ${baseRef}`
              });
            }
            continue;
          }
          
          // Find the state node - check both the full reference and the base reference
          const stateNode = this.nodes.find(node =>
            node.type === 'data-store' &&
            (node.label === ref || node.label === baseRef || node.label === `${ref}.value` || node.label === `${baseRef}.value`) &&
            (node.metadata?.category === 'vue-ref' || 
             node.metadata?.category === 'vue-reactive' ||
             node.metadata?.category === 'vue-computed')
          );

          if (stateNode) {
            console.log(`[DFDBuilder] Creating edge from ${element.handler} to state ${stateNode.label} with label "writes"`);
            
            // Check if edge already exists
            const edgeExists = this.edges.some(edge =>
              edge.from === processNode.id &&
              edge.to === stateNode.id &&
              edge.label === 'writes'
            );

            if (!edgeExists) {
              this.edges.push({
                from: processNode.id,
                to: stateNode.id,
                label: 'writes'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Build subgraphs for Vue conditional structures (v-if)
   * Creates subgraph structures similar to React's conditional rendering
   */
  private buildVueConditionalSubgraphs(analysis: ComponentAnalysis): void {
    if (!analysis.vueConditionalStructures || analysis.vueConditionalStructures.length === 0) {
      return;
    }

    console.log(`[DFDBuilder] buildVueConditionalSubgraphs: Processing ${analysis.vueConditionalStructures.length} conditional structures`);

    // Create a root template subgraph if it doesn't exist
    if (!analysis.jsxOutput.rootSubgraph) {
      analysis.jsxOutput.rootSubgraph = {
        id: 'subgraph-0',
        label: '<template>',
        type: 'jsx-output',
        elements: [],
      };
    }

    const rootSubgraph = analysis.jsxOutput.rootSubgraph;

    // Process each conditional structure
    for (const conditionalStructure of analysis.vueConditionalStructures) {
      const { condition, variables, element } = conditionalStructure;

      console.log(`[DFDBuilder] Creating conditional subgraph for: ${condition}`);

      // Create a conditional subgraph
      const subgraphId = this.generateNodeId('subgraph');
      const conditionalSubgraph: any = {
        id: subgraphId,
        label: `{${condition}}`,
        type: 'conditional',
        condition: {
          expression: condition,
          variables: variables,
        },
        elements: [],
      };

      // Extract display dependencies from the element
      // This includes mustache bindings and v-bind bindings within the element
      const displayDependencies: string[] = [];
      
      // Extract bindings from element's bindings array
      if (element.bindings) {
        for (const binding of element.bindings) {
          if (binding.type === 'mustache' || binding.type === 'v-bind') {
            if (!displayDependencies.includes(binding.variable)) {
              displayDependencies.push(binding.variable);
            }
          }
        }
      }

      // Create a template output node for the element inside the conditional
      const elementNodeId = this.generateNodeId('jsx_element');
      const elementNode: any = {
        id: elementNodeId,
        label: element.tagName,
        type: 'external-entity-output',
        line: element.line,
        column: element.column,
        metadata: {
          category: 'vue-template',
          displayDependencies: displayDependencies,
          attributeReferences: [],
        },
      };

      // Add the element node to the conditional subgraph
      conditionalSubgraph.elements.push(elementNode);

      // Add the conditional subgraph to the root subgraph
      rootSubgraph.elements.push(conditionalSubgraph);

      // Create data flow edges from condition variables to the subgraph
      for (const variable of variables) {
        // Find the source node (prop, state, computed, etc.)
        const sourceNode = this.nodes.find(node =>
          node.label === variable &&
          (node.type === 'external-entity-input' ||
           node.type === 'data-store' ||
           node.metadata?.category === 'vue-state' ||
           node.metadata?.category === 'vue-computed')
        );

        if (sourceNode) {
          console.log(`[DFDBuilder] Creating edge from ${variable} to conditional subgraph`);
          
          // Create edge from source to subgraph (control visibility)
          this.edges.push({
            from: sourceNode.id,
            to: subgraphId,
            label: 'control visibility',
          });
        } else {
          console.log(`[DFDBuilder] Warning: No source node found for conditional variable: ${variable}`);
        }
      }
    }

    console.log(`[DFDBuilder] Created ${analysis.vueConditionalStructures.length} conditional subgraphs`);
  }

  /**
   * Build subgraphs for Vue loop structures (v-for)
   * Creates subgraph structures for list rendering
   */
  private buildVueLoopSubgraphs(analysis: ComponentAnalysis): void {
    if (!analysis.vueLoopStructures || analysis.vueLoopStructures.length === 0) {
      return;
    }

    console.log(`[DFDBuilder] buildVueLoopSubgraphs: Processing ${analysis.vueLoopStructures.length} loop structures`);

    // Create a root template subgraph if it doesn't exist
    if (!analysis.jsxOutput.rootSubgraph) {
      analysis.jsxOutput.rootSubgraph = {
        id: 'subgraph-0',
        label: '<template>',
        type: 'jsx-output',
        elements: [],
      };
    }

    const rootSubgraph = analysis.jsxOutput.rootSubgraph;

    // Process each loop structure
    for (const loopStructure of analysis.vueLoopStructures) {
      const { source, element } = loopStructure;

      console.log(`[DFDBuilder] Creating loop subgraph for: ${source}`);

      // Create a loop subgraph
      // If the element has both v-for and v-if, create a combined label
      const subgraphId = this.generateNodeId('subgraph');
      let subgraphLabel = `{v-for: ${source}}`;
      let subgraphType = 'loop';
      
      if (element.vIf) {
        // Combined v-for and v-if: create a single subgraph with both conditions
        subgraphLabel = `{v-for: ${source}, v-if: ${element.vIf}}`;
        subgraphType = 'loop-conditional';
      }
      
      const loopSubgraph: any = {
        id: subgraphId,
        label: subgraphLabel,
        type: subgraphType,
        source: source,
        condition: element.vIf, // Store v-if condition if present
        elements: [],
      };

      // Extract display dependencies from the element
      // This includes mustache bindings and v-bind bindings within the element
      const displayDependencies: string[] = [];
      
      // Extract bindings from element's bindings array
      if (element.bindings) {
        for (const binding of element.bindings) {
          if (binding.type === 'mustache' || binding.type === 'v-bind') {
            // Skip 'key' bindings - they're not display dependencies
            if (binding.target !== 'key' && !displayDependencies.includes(binding.variable)) {
              displayDependencies.push(binding.variable);
            }
          }
        }
      }

      // Create a template output node for the element inside the loop
      // This is the element that has the v-for directive (e.g., <li>, <span>)
      const elementNodeId = this.generateNodeId('jsx_element');
      const elementNode: any = {
        id: elementNodeId,
        label: `<${element.tagName}>`,
        type: 'external-entity-output',
        line: element.line,
        column: element.column,
        metadata: {
          category: 'vue-template',
          displayDependencies: displayDependencies,
          attributeReferences: [],
        },
      };

      // Add the element node to the loop subgraph
      loopSubgraph.elements.push(elementNode);

      // Add the loop subgraph to the root subgraph
      rootSubgraph.elements.push(loopSubgraph);

      // Create data flow edge from source array to the subgraph
      // Find the source node (prop, state, computed, etc.)
      const sourceNode = this.nodes.find(node =>
        node.label === source &&
        (node.type === 'external-entity-input' ||
         node.type === 'data-store' ||
         node.metadata?.category === 'vue-state' ||
         node.metadata?.category === 'vue-computed')
      );

      if (sourceNode) {
        console.log(`[DFDBuilder] Creating edge from ${source} to loop subgraph`);
        
        // Create edge from source to subgraph (provides data for iteration)
        this.edges.push({
          from: sourceNode.id,
          to: subgraphId,
          label: 'iterates over',
        });
      } else {
        console.log(`[DFDBuilder] Warning: No source node found for loop source: ${source}`);
      }
      
      // If there's a v-if condition, create an edge from the condition variable to the subgraph
      if (element.vIf) {
        // Extract the variable from the v-if condition (e.g., "item.active" -> "item")
        const conditionVariables = this.extractVariablesFromExpression(element.vIf);
        
        for (const conditionVar of conditionVariables) {
          // Find the condition variable node
          const conditionNode = this.nodes.find(node =>
            node.label === conditionVar &&
            (node.type === 'external-entity-input' ||
             node.type === 'data-store' ||
             node.metadata?.category === 'vue-state' ||
             node.metadata?.category === 'vue-computed')
          );
          
          if (conditionNode) {
            console.log(`[DFDBuilder] Creating edge from ${conditionVar} to combined loop-conditional subgraph`);
            
            // Create edge from condition variable to subgraph (controls visibility)
            this.edges.push({
              from: conditionNode.id,
              to: subgraphId,
              label: 'control visibility',
            });
          }
        }
      }
    }

    console.log(`[DFDBuilder] Created ${analysis.vueLoopStructures.length} loop subgraphs`);
  }

  /**
   * Build root-level JSX elements for Vue template bindings
   * This handles mustache bindings that are not inside conditionals or loops
   */
  private buildVueRootLevelElements(analysis: ComponentAnalysis): void {
    console.log(`[DFDBuilder] buildVueRootLevelElements: Starting`);

    // Create a root template subgraph if it doesn't exist
    if (!analysis.jsxOutput.rootSubgraph) {
      analysis.jsxOutput.rootSubgraph = {
        id: 'subgraph-0',
        label: '<template>',
        type: 'jsx-output',
        elements: [],
      };
    }

    const rootSubgraph = analysis.jsxOutput.rootSubgraph;

    // Collect all bindings that are already handled by conditional/loop structures
    const handledBindings = new Set<string>();
    
    // Add bindings from conditional structures
    if (analysis.vueConditionalStructures) {
      for (const cs of analysis.vueConditionalStructures) {
        if (cs.element.bindings) {
          for (const binding of cs.element.bindings) {
            const key = `${binding.type}:${binding.variable}:${binding.line}:${binding.column}`;
            handledBindings.add(key);
          }
        }
      }
    }
    
    // Add bindings from loop structures
    if (analysis.vueLoopStructures) {
      for (const ls of analysis.vueLoopStructures) {
        if (ls.element.bindings) {
          for (const binding of ls.element.bindings) {
            const key = `${binding.type}:${binding.variable}:${binding.line}:${binding.column}`;
            handledBindings.add(key);
          }
        }
      }
    }

    console.log(`[DFDBuilder] buildVueRootLevelElements: ${handledBindings.size} bindings already handled by conditional/loop structures`);

    // Track created elements by line to avoid duplicates
    const createdElements = new Map<number, any>();

    // 1. Create elements for v-bind attributes (with correct tag names)
    if (analysis.vueElementsWithVBind) {
      console.log(`[DFDBuilder] Processing ${analysis.vueElementsWithVBind.length} elements with v-bind`);
      
      for (const element of analysis.vueElementsWithVBind) {
        // Skip if this is a :key binding (should not create element nodes)
        if (element.attribute === 'key') {
          console.log(`[DFDBuilder] Skipping :key binding on ${element.tagName}`);
          continue;
        }

        const line = element.line || 0;
        
        // Check if we already created an element for this line
        if (!createdElements.has(line)) {
          const elementNodeId = this.generateNodeId('jsx_element');
          const elementNode: any = {
            id: elementNodeId,
            label: `<${element.tagName}>`,
            type: 'external-entity-output',
            line: element.line,
            column: element.column,
            metadata: {
              category: 'vue-template',
              displayDependencies: [],
              attributeReferences: [],
              vBindAttributes: [],
            },
          };
          
          createdElements.set(line, elementNode);
          rootSubgraph.elements.push(elementNode);
          console.log(`[DFDBuilder] Created element ${elementNodeId} for <${element.tagName}>`);
        }
        
        // Add this v-bind to the element's metadata
        const elementNode = createdElements.get(line);
        if (!elementNode.metadata.vBindAttributes) {
          elementNode.metadata.vBindAttributes = [];
        }
        elementNode.metadata.vBindAttributes.push({
          attribute: element.attribute,
          variable: element.variable,
        });
        
        // Add to display dependencies (for "binds" edges)
        if (!elementNode.metadata.displayDependencies.includes(element.variable)) {
          elementNode.metadata.displayDependencies.push(element.variable);
        }
      }
    }

    // 2. Create elements for v-model (with bidirectional data flows)
    if (analysis.vueElementsWithVModel) {
      console.log(`[DFDBuilder] Processing ${analysis.vueElementsWithVModel.length} elements with v-model`);
      
      for (const element of analysis.vueElementsWithVModel) {
        const line = element.line || 0;
        
        // Check if we already created an element for this line
        if (!createdElements.has(line)) {
          const elementNodeId = this.generateNodeId('jsx_element');
          const elementNode: any = {
            id: elementNodeId,
            label: `<${element.tagName}>`,
            type: 'external-entity-output',
            line: element.line,
            column: element.column,
            metadata: {
              category: 'vue-template',
              displayDependencies: [],
              attributeReferences: [],
              vModelVariable: element.variable,
            },
          };
          
          createdElements.set(line, elementNode);
          rootSubgraph.elements.push(elementNode);
          console.log(`[DFDBuilder] Created element ${elementNodeId} for <${element.tagName}> with v-model`);
        } else {
          // Add v-model to existing element
          const elementNode = createdElements.get(line);
          elementNode.metadata.vModelVariable = element.variable;
        }
      }
    }

    // 3. Create elements for mustache bindings (if not already created)
    if (analysis.vueTemplateBindings) {
      for (const binding of analysis.vueTemplateBindings) {
        if (binding.type === 'mustache') {
          // Skip bindings that are already handled by conditional/loop structures
          const bindingKey = `${binding.type}:${binding.variable}:${binding.line}:${binding.column}`;
          if (handledBindings.has(bindingKey)) {
            continue;
          }

          const line = binding.line || 0;
          
          // Check if we already created an element for this line
          if (!createdElements.has(line)) {
            const elementNodeId = this.generateNodeId('jsx_element');
            const elementNode: any = {
              id: elementNodeId,
              label: binding.target || '<element>',
              type: 'external-entity-output',
              line: binding.line,
              column: binding.column,
              metadata: {
                category: 'vue-template',
                displayDependencies: [binding.variable],
                attributeReferences: [],
              },
            };
            
            createdElements.set(line, elementNode);
            rootSubgraph.elements.push(elementNode);
            console.log(`[DFDBuilder] Created element ${elementNodeId} for mustache binding`);
          } else {
            // Add to display dependencies of existing element
            const elementNode = createdElements.get(line);
            if (!elementNode.metadata.displayDependencies.includes(binding.variable)) {
              elementNode.metadata.displayDependencies.push(binding.variable);
            }
          }
        }
      }
    }

    // 4. Handle v-show elements (create conditional subgraphs)
    if (analysis.vueElementsWithVShow) {
      console.log(`[DFDBuilder] Processing ${analysis.vueElementsWithVShow.length} elements with v-show`);
      
      for (const element of analysis.vueElementsWithVShow) {
        // Create a conditional subgraph for v-show (similar to v-if)
        const subgraphId = this.generateNodeId('subgraph');
        const conditionalSubgraph: any = {
          id: subgraphId,
          label: `{v-show: ${element.condition}}`,
          type: 'conditional',
          condition: {
            expression: element.condition,
            variables: element.variables,
          },
          elements: [],
        };

        // Create element node inside the subgraph
        const elementNodeId = this.generateNodeId('jsx_element');
        const elementNode: any = {
          id: elementNodeId,
          label: `<${element.tagName}>`,
          type: 'external-entity-output',
          line: element.line,
          column: element.column,
          metadata: {
            category: 'vue-template',
            displayDependencies: [],
            attributeReferences: [],
          },
        };

        conditionalSubgraph.elements.push(elementNode);
        rootSubgraph.elements.push(conditionalSubgraph);
        
        console.log(`[DFDBuilder] Created v-show conditional subgraph ${subgraphId} for <${element.tagName}>`);
      }
    }

    console.log(`[DFDBuilder] Created ${createdElements.size} root-level element nodes`);
  }

  /**
   * Create nodes for hooks based on their category
   */
  /**
   * Create nodes for hooks based on their category
   */
  /**
   * Merge multiple calls to the same library hook into a single hook
   * For example, multiple useUserStore() calls should be merged into one
   */
  /**
   * Merge multiple calls to the same library hook into a single hook
   * For example, multiple useUserStore() calls should be merged into one
   * 
   * Note: React built-in hooks (useState, useReducer, useRef, etc.) are NOT merged
   * because each call creates an independent state/ref instance.
   */
  /**
   * Merge multiple calls to the same library hook into a single hook
   * Only merges hooks where the processor has mergeable: true
   * (e.g., Zustand selector pattern: multiple useStore() calls)
   */
  private mergeLibraryHooks(hooks: HookInfo[]): HookInfo[] {
    const libraryHookMap = new Map<string, HookInfo>();
    const nonMergeableHooks: HookInfo[] = [];

    // Get processor registry to check mergeable flag
    const processorRegistry = getProcessorRegistry();

    for (const hook of hooks) {
      // Check if this is a library hook (has libraryName metadata)
      const isLibraryHook = (hook as any).libraryName;
      
      if (!isLibraryHook) {
        // Not a library hook, keep as-is
        nonMergeableHooks.push(hook);
        continue;
      }

      // Find the processor for this hook to check if it's mergeable
      const context = this.createProcessorContext('merge-check');
      const processor = processorRegistry.findProcessor(hook, context);
      
      const isMergeable = processor?.metadata.mergeable === true;
      
      if (!isMergeable) {
        // Not mergeable, keep as-is
        nonMergeableHooks.push(hook);
        continue;
      }

      // This hook is mergeable, try to merge it
      const key = `${(hook as any).libraryName}:${hook.hookName}`;
      
      if (libraryHookMap.has(key)) {
        // Merge variables into existing hook
        const existingHook = libraryHookMap.get(key)!;
        const mergedVariables = [...new Set([...existingHook.variables, ...hook.variables])];
        existingHook.variables = mergedVariables;
        
        console.log(`🔄 Merged ${hook.hookName} variables:`, hook.variables, '→', mergedVariables);
      } else {
        // First occurrence of this library hook
        libraryHookMap.set(key, { ...hook });
        console.log(`✅ First occurrence of ${hook.hookName} with variables:`, hook.variables);
      }
    }

    // Combine merged library hooks with non-mergeable hooks
    const mergedHooks = [...libraryHookMap.values(), ...nonMergeableHooks];
    
    if (libraryHookMap.size > 0) {
      console.log(`🔄 Merged ${hooks.length} hooks into ${mergedHooks.length} hooks`);
      console.log(`🔄 Library hooks merged:`, Array.from(libraryHookMap.keys()));
    }
    
    return mergedHooks;
  }

  private createHookNodes(hooks: HookInfo[]): void {
    for (const hook of hooks) {
      // Skip Vue state hooks (ref, reactive, computed) - they're handled by createVueStateNodes
      if (hook.category === 'state-management' && 
          (hook.hookName === 'ref' || hook.hookName === 'reactive' || hook.hookName === 'computed')) {
        console.log(`[DFDBuilder] Skipping Vue state hook ${hook.hookName} (handled by createVueStateNodes)`);
        continue;
      }
      
      // Check if this hook should be processed by a registered processor
      const handled = this.processHookWithRegistry(hook);
      if (handled) {
        continue;
      }

      // Check if this is a custom hook (no category in registry)
      // NOTE: This is a fallback for custom hooks not handled by CustomHookProcessor
      // In practice, CustomHookProcessor should handle all custom hooks
      if (!hook.category) {
        console.log(`⚠️ Custom hook ${hook.hookName} not handled by processor, using legacy method`);
        this.createCustomHookNode(hook);
        continue;
      }

      switch (hook.category) {
        case 'data-fetching':
          this.createDataFetchingNode(hook);
          break;
        case 'state-management':
          this.createStateManagementNode(hook);
          break;
        case 'form':
          this.createFormNode(hook);
          break;
        case 'routing':
          this.createRoutingNode(hook);
          break;
        case 'server-action':
          this.createServerActionNode(hook);
          break;
        // 'effect' hooks are handled as processes, not as separate nodes
      }
    }
  }

  /**
   * Check if a hook is a data fetching hook
   * Data fetching hooks include useSWR, useQuery, useMutation, useSubscription, etc.
   */
  private isDataFetchingHook(hookName: string): boolean {
    const dataFetchingHooks = [
      'useSWR',
      'useSWRMutation',
      'useSWRInfinite',
      'useQuery',
      'useMutation',
      'useInfiniteQuery',
      'useLazyQuery',
      'useSubscription',
    ];
    
    // Also check for RTK Query generated hooks (use*Query, use*Mutation)
    if (hookName.startsWith('use') && (hookName.endsWith('Query') || hookName.endsWith('Mutation'))) {
      return true;
    }
    
    return dataFetchingHooks.includes(hookName);
  }

  /**
   * Extract API endpoint from hook arguments
   * Returns the first string argument which is typically the API endpoint or query key
   */
  private extractAPIEndpoint(args: Array<{ type: string; value?: string | number | boolean }>): string | undefined {
    // Find the first string argument
    for (const arg of args) {
      if (arg.type === 'string' && typeof arg.value === 'string') {
        return arg.value;
      }
    }
    return undefined;
  }

  /**
   * Create a Server external entity input node for an API endpoint
   * Returns the node ID
   */
  private createServerNode(endpoint: string | undefined, line?: number, column?: number): string {
    const nodeId = this.generateNodeId('server');
    const label = endpoint ? `Server: ${endpoint}` : 'Server';
    const node: DFDNode = {
      id: nodeId,
      label,
      type: 'external-entity-input',
      line,
      column,
      metadata: {
        category: 'server',
        endpoint,
        line,
        column
      }
    };
    
    this.nodes.push(node);
    console.log(`🚚 ✅ Created Server node: ${label}`);
    return nodeId;
  }

  /**
   * Create unified node for custom hooks (data-store)
   * Creates a single node for the hook with only data values
   * Function values are excluded from the node but stored as write methods
   */
  private createCustomHookNode(hook: HookInfo): void {
    console.log(`🚚 Creating custom hook node for: ${hook.hookName}`);
    
    // If no type classification is available, treat all variables as data
    if (!hook.variableTypes || hook.variableTypes.size === 0) {
      console.log(`🚚 No type classification for ${hook.hookName}, treating all as data`);
      // Create a single node with all variables
      const label = hook.variables.length > 0 ? hook.variables.join(', ') : hook.hookName;
      this.nodes.push({
        id: this.generateNodeId('custom_hook'),
        label,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'custom-hook',
          hookName: hook.hookName,
          variables: hook.variables,
          writeMethods: [],
          line: hook.line,
          column: hook.column
        }
      });
      return;
    }

    // Separate data values from function values
    const dataValues: string[] = [];
    const functionValues: string[] = [];
    
    for (const variable of hook.variables) {
      const varType = hook.variableTypes.get(variable);
      if (varType === 'function') {
        functionValues.push(variable);
      } else {
        dataValues.push(variable);
      }
    }

    console.log(`🚚 ${hook.hookName} - Data values:`, dataValues, 'Function values:', functionValues);

    // Create individual nodes for each data value (input subgraph)
    for (const dataValue of dataValues) {
      this.nodes.push({
        id: this.generateNodeId('custom_hook_data'),
        label: dataValue,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'custom-hook-data',
          hookName: hook.hookName,
          variableName: dataValue,
          subgraph: `${hook.hookName}-input`,
          line: hook.line,
          column: hook.column
        }
      });
      console.log(`🚚 Created custom hook data node: ${dataValue}`);
    }

    // Create individual nodes for each function value (output subgraph)
    for (const functionValue of functionValues) {
      this.nodes.push({
        id: this.generateNodeId('custom_hook_function'),
        label: functionValue,
        type: 'external-entity-output',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'custom-hook-function',
          hookName: hook.hookName,
          variableName: functionValue,
          subgraph: `${hook.hookName}-output`,
          line: hook.line,
          column: hook.column
        }
      });
      console.log(`🚚 Created custom hook function node: ${functionValue}`);
    }
  }

  /**
   * Create nodes for data fetching hooks (external-entity-input)
   */
  private createDataFetchingNode(hook: HookInfo): void {
    for (const variable of hook.variables) {
      this.nodes.push({
        id: this.generateNodeId('data_fetch'),
        label: variable,
        type: 'external-entity-input',
        metadata: {
          category: 'data-fetching',
          hookName: hook.hookName
        }
      });
    }
  }

  /**
   * Create nodes for state hooks (data-store)
   */


  /**
   * Create nodes for state management hooks (data-store)
   */
  private createStateManagementNode(hook: HookInfo): void {
    // For read-write pairs, create a single node
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      this.nodes.push({
        id: this.generateNodeId('global_state'),
        label: readVar,
        type: 'data-store',
        metadata: {
          category: 'state-management',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: readVar,
          writeVariable: writeVar
        }
      });
    } else {
      // For other cases, create individual nodes
      for (const variable of hook.variables) {
        this.nodes.push({
          id: this.generateNodeId('global_state'),
          label: variable,
          type: 'data-store',
          metadata: {
            category: 'state-management',
            hookName: hook.hookName
          }
        });
      }
    }
  }

  /**
   * Create nodes for form hooks (data-store)
   */
  private createFormNode(hook: HookInfo): void {
    // For read-write pairs, create a single node
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      this.nodes.push({
        id: this.generateNodeId('form'),
        label: readVar,
        type: 'data-store',
        metadata: {
          category: 'form',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: readVar,
          writeVariable: writeVar
        }
      });
    } else {
      // For other cases, create individual nodes
      for (const variable of hook.variables) {
        this.nodes.push({
          id: this.generateNodeId('form'),
          label: variable,
          type: 'data-store',
          metadata: {
            category: 'form',
            hookName: hook.hookName
          }
        });
      }
    }
  }

  /**
   * Create nodes for routing hooks (external-entity-input)
   */
  private createRoutingNode(hook: HookInfo): void {
    for (const variable of hook.variables) {
      this.nodes.push({
        id: this.generateNodeId('routing'),
        label: variable,
        type: 'external-entity-input',
        metadata: {
          category: 'routing',
          hookName: hook.hookName
        }
      });
    }
  }

  /**
   * Create nodes for server actions (external-entity-input)
   */
  private createServerActionNode(hook: HookInfo): void {
    for (const variable of hook.variables) {
      this.nodes.push({
        id: this.generateNodeId('server_action'),
        label: variable,
        type: 'external-entity-input',
        metadata: {
          category: 'server-action',
          hookName: hook.hookName
        }
      });
    }
  }

  /**
   * Create nodes for processes
   */
  private createProcessNodes(processes: ProcessInfo[]): void {
    for (const process of processes) {
      // Skip inline handlers - they don't need process nodes
      if (process.isInlineHandler) {
        console.log(`[DFDBuilder] Skipping inline handler: ${process.name} (will create direct edges instead)`);
        continue;
      }
      
      const processNodeId = this.generateNodeId('process');
      console.log(`[DFDBuilder] Creating process node: ${process.name}, line: ${process.line}, column: ${process.column}`);
      
      // Regular process node
      this.nodes.push({
        id: processNodeId,
        label: process.name,
        type: 'process',
        line: process.line,
        column: process.column,
        metadata: {
          processType: process.type,
          dependencies: process.dependencies,
          references: process.references,
          line: process.line,
          column: process.column
        }
      });

      // Create nodes for external function calls
      this.createExternalCallNodes(process, processNodeId);

      // Create cleanup process node if exists
      if (process.cleanupProcess) {
        const cleanupNodeId = this.generateNodeId('cleanup');
        this.nodes.push({
          id: cleanupNodeId,
          label: process.cleanupProcess.name,
          type: 'process',
          line: process.cleanupProcess.line,
          column: process.cleanupProcess.column,
          metadata: {
            processType: process.cleanupProcess.type,
            references: process.cleanupProcess.references,
            parentProcess: process.name,
            line: process.cleanupProcess.line,
            column: process.cleanupProcess.column
          }
        });

        // Create edge from parent process to cleanup with cleanup flag
        this.edges.push({
          from: processNodeId,
          to: cleanupNodeId,
          label: 'cleanup',
          isCleanup: true
        });

        // Create nodes for external function calls in cleanup
        this.createExternalCallNodes(process.cleanupProcess, cleanupNodeId);
      }
    }
  }

  /**
   * Create lifecycle hooks subgraph for Vue components
   * Groups lifecycle hook nodes (onMounted, onUpdated, etc.) into a "Lifecycles" subgraph
   * and creates write edges from lifecycle hooks to state variables they modify
   */
  private createLifecycleHooksSubgraph(analysis: ComponentAnalysis): void {
    // Find all lifecycle hook nodes (they were created as process nodes)
    const lifecycleHookNodes = this.nodes.filter(node => 
      node.type === 'process' && 
      (node.metadata?.processType === 'lifecycle' ||
       node.metadata?.category === 'lifecycle' ||
       node.metadata?.isSvelteKitLifecycle === true) &&
      node.label && (
        node.label.startsWith('on') || 
        ['onMounted', 'onUpdated', 'onBeforeMount', 'onBeforeUpdate', 'onUnmounted', 'onBeforeUnmount', 'beforeNavigate', 'afterNavigate'].includes(node.label)
      )
    );
    
    if (lifecycleHookNodes.length === 0) {
      console.log('[DFDBuilder] No lifecycle hooks found, skipping subgraph creation');
      return;
    }
    
    console.log(`[DFDBuilder] Creating lifecycle subgraph with ${lifecycleHookNodes.length} hooks:`, lifecycleHookNodes.map(n => n.label));
    
    // Determine the label based on the framework
    const isSvelteKit = lifecycleHookNodes.some(n => n.metadata?.isSvelteKitLifecycle === true);
    const subgraphLabel = isSvelteKit ? 'Lifecycle' : 'Lifecycles';
    
    // Create the Lifecycle(s) subgraph
    const lifecycleSubgraph: DFDSubgraph = {
      id: this.generateNodeId('lifecycle_subgraph'),
      label: subgraphLabel,
      type: 'lifecycle-hooks',
      elements: lifecycleHookNodes
    };
    
    // Add the subgraph to exportedHandlerSubgroups (reusing existing infrastructure)
    this.exportedHandlerSubgroups.push(lifecycleSubgraph);
    
    console.log(`[DFDBuilder] Created lifecycle subgraph: ${lifecycleSubgraph.id}`);
    
    // Create edges from URL: Input to navigation guard hooks
    this.createNavigationGuardEdges(lifecycleHookNodes);
    
    // Create write edges from lifecycle hooks to state variables they modify
    // Find lifecycle processes that have stateModifications
    const lifecycleProcesses = analysis.processes.filter(process => 
      process.type === 'lifecycle' && 
      (process as any).stateModifications && 
      (process as any).stateModifications.length > 0
    );
    
    console.log(`[DFDBuilder] Found ${lifecycleProcesses.length} lifecycle processes with state modifications`);
    
    for (const process of lifecycleProcesses) {
      const stateModifications = (process as any).stateModifications as string[];
      const hookNode = lifecycleHookNodes.find(n => n.label === process.name);
      
      if (!hookNode) {
        console.log(`[DFDBuilder] Warning: Hook node not found for ${process.name}`);
        continue;
      }
      
      console.log(`[DFDBuilder] Processing ${process.name} with modifications:`, stateModifications);
      
      // Create edges from lifecycle hook to each modified state variable
      for (const stateName of stateModifications) {
        // Find the state node
        const stateNode = this.nodes.find(node => 
          node.type === 'data-store' && 
          node.label === stateName &&
          (node.metadata?.category === 'vue-ref' || 
           node.metadata?.category === 'vue-reactive' ||
           node.metadata?.category === 'vue-computed')
        );
        
        if (stateNode) {
          console.log(`[DFDBuilder] Creating write edge from ${process.name} to ${stateName}`);
          this.edges.push({
            from: hookNode.id,
            to: stateNode.id,
            label: 'writes'
          });
        } else {
          console.log(`[DFDBuilder] Warning: State node not found for ${stateName}`);
        }
      }
    }
  }

  /**
   * Create edges from URL: Input to navigation guard hooks
   * Navigation guards (onBeforeRouteUpdate, onBeforeRouteLeave) receive route information
   */
  private createNavigationGuardEdges(lifecycleHookNodes: DFDNode[]): void {
    // Find navigation guard hooks
    const navigationGuards = lifecycleHookNodes.filter(node => 
      node.label === 'onBeforeRouteUpdate' || node.label === 'onBeforeRouteLeave'
    );
    
    if (navigationGuards.length === 0) {
      return;
    }
    
    console.log(`[DFDBuilder] Creating navigation guard edges for ${navigationGuards.length} guards`);
    
    // Find or create URL: Input node
    let urlInputNode = this.nodes.find(node => 
      node.type === 'external-entity-input' && 
      node.label === 'URL: Input'
    );
    
    if (!urlInputNode) {
      // Create URL: Input node if it doesn't exist
      urlInputNode = {
        id: this.generateNodeId('url_input'),
        label: 'URL: Input',
        type: 'external-entity-input',
        metadata: {
          category: 'url-input',
          description: 'Browser URL input'
        }
      };
      this.nodes.push(urlInputNode);
      console.log(`[DFDBuilder] Created URL: Input node for navigation guards`);
    }
    
    // Create edges from URL: Input to each navigation guard
    for (const guard of navigationGuards) {
      const label = guard.label === 'onBeforeRouteUpdate' ? 'on update' : 'on leave';
      
      this.edges.push({
        from: urlInputNode.id,
        to: guard.id,
        label: label
      });
      
      console.log(`[DFDBuilder] Created edge from URL: Input to ${guard.label} with label "${label}"`);
    }
  }

  /**
   * Create watcher edges for Vue components
   * Creates edges from watched variables to watcher process nodes,
   * and from watcher process nodes to state variables they modify
   */
  private createWatcherEdges(analysis: ComponentAnalysis): void {
    // Find all watcher process nodes
    const watcherNodes = this.nodes.filter(node => 
      node.type === 'process' && 
      node.metadata?.processType === 'watcher' &&
      (node.label === 'watch' || node.label === 'watchEffect')
    );
    
    if (watcherNodes.length === 0) {
      console.log('[DFDBuilder] No watchers found, skipping watcher edges creation');
      return;
    }
    
    console.log(`[DFDBuilder] Creating watcher edges for ${watcherNodes.length} watchers:`, watcherNodes.map(n => n.label));
    
    // Find watcher processes that have dependencies and/or state modifications
    const watcherProcesses = analysis.processes.filter(process => 
      process.type === 'watcher' && 
      (process.name === 'watch' || process.name === 'watchEffect')
    );
    
    console.log(`[DFDBuilder] Found ${watcherProcesses.length} watcher processes`);
    
    for (const process of watcherProcesses) {
      const watcherNode = watcherNodes.find(n => 
        n.label === process.name && 
        n.line === process.line && 
        n.column === process.column
      );
      
      if (!watcherNode) {
        console.log(`[DFDBuilder] Warning: Watcher node not found for ${process.name} at line ${process.line}`);
        continue;
      }
      
      console.log(`[DFDBuilder] Processing watcher ${process.name} at line ${process.line}`);
      console.log(`[DFDBuilder]   Dependencies:`, process.dependencies);
      console.log(`[DFDBuilder]   State modifications:`, (process as any).stateModifications);
      console.log(`[DFDBuilder]   Has cleanup:`, (process as any).hasCleanup);
      
      // Create edges from watched variables (dependencies) to watcher process
      if (process.dependencies && process.dependencies.length > 0) {
        for (const depName of process.dependencies) {
          // Find the state node for this dependency
          const stateNode = this.nodes.find(node => 
            node.type === 'data-store' && 
            node.label === depName &&
            (node.metadata?.category === 'vue-ref' || 
             node.metadata?.category === 'vue-reactive' ||
             node.metadata?.category === 'vue-computed')
          );
          
          if (stateNode) {
            console.log(`[DFDBuilder] Creating edge from ${depName} to watcher ${process.name}`);
            this.edges.push({
              from: stateNode.id,
              to: watcherNode.id,
              label: 'watches'
            });
          } else {
            console.log(`[DFDBuilder] Warning: State node not found for dependency ${depName}`);
          }
        }
      }
      
      // Create edges from watcher process to state variables it modifies
      const stateModifications = (process as any).stateModifications as string[] | undefined;
      if (stateModifications && stateModifications.length > 0) {
        for (const stateName of stateModifications) {
          // Find the state node
          const stateNode = this.nodes.find(node => 
            node.type === 'data-store' && 
            node.label === stateName &&
            (node.metadata?.category === 'vue-ref' || 
             node.metadata?.category === 'vue-reactive' ||
             node.metadata?.category === 'vue-computed')
          );
          
          if (stateNode) {
            console.log(`[DFDBuilder] Creating write edge from watcher ${process.name} to ${stateName}`);
            this.edges.push({
              from: watcherNode.id,
              to: stateNode.id,
              label: 'writes'
            });
          } else {
            console.log(`[DFDBuilder] Warning: State node not found for ${stateName}`);
          }
        }
      }
      
      // Create cleanup process node if watchEffect has cleanup function
      const hasCleanup = (process as any).hasCleanup as boolean | undefined;
      if (hasCleanup && process.name === 'watchEffect') {
        console.log(`[DFDBuilder] Creating cleanup process node for watchEffect at line ${process.line}`);
        
        // Create cleanup process node
        const cleanupNode: DFDNode = {
          id: this.generateNodeId('process'),
          label: 'cleanup',
          type: 'process',
          metadata: {
            processType: 'cleanup',
            category: 'vue-watcher-cleanup',
          },
          line: process.line,
          column: process.column,
        };
        
        this.nodes.push(cleanupNode);
        
        // Create edge from watchEffect to cleanup
        console.log(`[DFDBuilder] Creating edge from watchEffect to cleanup`);
        this.edges.push({
          from: watcherNode.id,
          to: cleanupNode.id,
          label: 'cleanup'
        });
      }
    }
  }

  /**
   * Create emits subgraph for Vue components
   * Groups emit nodes into an "Emits" subgraph and creates data flows from emit calls to emit definitions
   */
  private createEmitsSubgraph(analysis: ComponentAnalysis): void {
    // Find all emit nodes (they were created as external-entity-output nodes)
    const emitNodes = this.nodes.filter(node => 
      node.type === 'external-entity-output' && 
      node.metadata?.category === 'vue-emit'
    );
    
    if (emitNodes.length === 0) {
      console.log('[DFDBuilder] No emits found, skipping subgraph creation');
      return;
    }
    
    console.log(`[DFDBuilder] Creating emits subgraph with ${emitNodes.length} emits:`, emitNodes.map(n => n.label));
    
    // Create the Emits subgraph
    const emitsSubgraph: DFDSubgraph = {
      id: this.generateNodeId('emits_subgraph'),
      label: 'Emits',
      type: 'emits',
      elements: emitNodes
    };
    
    // Add the subgraph to exportedHandlerSubgroups (reusing existing infrastructure)
    this.exportedHandlerSubgroups.push(emitsSubgraph);
    
    console.log(`[DFDBuilder] Created emits subgraph: ${emitsSubgraph.id}`);
    
    // Create data flows from emit calls to emit definitions
    // Get emit calls from analysis
    const emitCalls = (analysis as any).vueEmitCalls || [];
    
    console.log(`[DFDBuilder] Found ${emitCalls.length} emit calls`);
    
    for (const emitCall of emitCalls) {
      const { eventName, callerProcess } = emitCall;
      
      // Find the emit node for this event
      const emitNode = emitNodes.find(n => n.label === eventName);
      
      if (!emitNode) {
        console.log(`[DFDBuilder] Warning: Emit node not found for ${eventName}`);
        continue;
      }
      
      // Find the process node that calls this emit
      const processNode = this.nodes.find(node => 
        node.type === 'process' && 
        node.label === callerProcess
      );
      
      if (processNode) {
        console.log(`[DFDBuilder] Creating emit edge from ${callerProcess} to ${eventName}`);
        this.edges.push({
          from: processNode.id,
          to: emitNode.id,
          label: 'emits'
        });
      } else {
        console.log(`[DFDBuilder] Warning: Process node not found for ${callerProcess}`);
      }
    }
  }

  /**
   * Create edges from processes that call router methods to the useRouter node
   * Handles router.push(), router.replace(), router.back(), etc.
   */
  private createRouterCallEdges(analysis: ComponentAnalysis): void {
    // Find the useRouter node
    const useRouterNode = this.nodes.find(node => 
      node.type === 'process' && 
      node.metadata?.hookName === 'useRouter' &&
      node.metadata?.libraryName === 'vue-router'
    );
    
    if (!useRouterNode) {
      console.log('[DFDBuilder] No useRouter node found, skipping router call edges');
      return;
    }
    
    console.log(`[DFDBuilder] Found useRouter node: ${useRouterNode.id}`);
    
    // Find all processes that reference 'router'
    const routerVariableName = analysis.hooks.find(h => h.hookName === 'useRouter')?.variables[0] || 'router';
    
    console.log(`[DFDBuilder] Looking for processes that reference: ${routerVariableName}`);
    
    for (const process of analysis.processes) {
      // Check if this process references the router variable
      const references = (process as any).references || [];
      
      if (references.includes(routerVariableName)) {
        // Find the process node
        const processNode = this.nodes.find(node => 
          node.type === 'process' && 
          node.label === process.name
        );
        
        if (processNode) {
          console.log(`[DFDBuilder] Creating router call edge from ${process.name} to useRouter`);
          this.edges.push({
            from: processNode.id,
            to: useRouterNode.id,
            label: 'calls'
          });
        }
      }
    }
  }

  /**
   * Create edges from processes that call Pinia store actions to the store nodes
   * Also create display edges from store properties to template elements
   */
  private createPiniaStoreEdges(analysis: ComponentAnalysis): void {
    // Find all Pinia store nodes
    const storeNodes = this.nodes.filter(node => 
      node.metadata?.libraryName === 'pinia' &&
      node.metadata?.isPiniaStore === true
    );
    
    console.log('[DFDBuilder] Looking for Pinia store nodes...');
    console.log('[DFDBuilder] Total nodes:', this.nodes.length);
    console.log('[DFDBuilder] Nodes with pinia library:', this.nodes.filter(n => n.metadata?.libraryName === 'pinia').length);
    console.log('[DFDBuilder] Nodes with isPiniaStore:', this.nodes.filter(n => n.metadata?.isPiniaStore).length);
    
    if (storeNodes.length === 0) {
      console.log('[DFDBuilder] No Pinia store nodes found, skipping store edges');
      return;
    }
    
    console.log(`[DFDBuilder] Found ${storeNodes.length} Pinia store nodes`);
    
    // Find all storeToRefs hooks and add their extracted properties to the corresponding store nodes
    const storeToRefsHooks = analysis.hooks.filter(h => h.hookName === 'storeToRefs');
    console.log(`[DFDBuilder] Found ${storeToRefsHooks.length} storeToRefs hooks`);
    
    for (const storeToRefsHook of storeToRefsHooks) {
      // Get the store variable name from argumentIdentifiers (the first argument to storeToRefs)
      const argumentIdentifiers = (storeToRefsHook as any).argumentIdentifiers || [];
      if (argumentIdentifiers.length === 0) {
        console.log(`[DFDBuilder] Warning: storeToRefs hook has no argumentIdentifiers`);
        continue;
      }
      
      const storeVariableName = argumentIdentifiers[0];
      console.log(`[DFDBuilder] storeToRefs extracts from store: ${storeVariableName}, variables:`, storeToRefsHook.variables);
      
      // Find the store node that matches this store variable
      // The store node's hook should have this variable in its variables array
      const storeNode = storeNodes.find(node => {
        const storeHook = analysis.hooks.find(h => 
          h.hookName === node.label &&
          h.variables.includes(storeVariableName)
        );
        return !!storeHook;
      });
      
      if (storeNode) {
        // Add the extracted properties to the store's dataProperties
        const currentDataProperties = storeNode.metadata?.dataProperties || [];
        const newDataProperties = [...new Set([...currentDataProperties, ...storeToRefsHook.variables])];
        
        if (storeNode.metadata) {
          storeNode.metadata.dataProperties = newDataProperties;
        }
        
        console.log(`[DFDBuilder] Updated ${storeNode.label} dataProperties from`, currentDataProperties, 'to', newDataProperties);
      } else {
        console.log(`[DFDBuilder] Warning: Could not find store node for storeToRefs argument: ${storeVariableName}`);
      }
    }
    
    // Create call edges from processes to stores
    for (const storeNode of storeNodes) {
      // Get the store variable name from the hook
      const storeHook = analysis.hooks.find(h => 
        h.hookName === storeNode.label &&
        h.variables.length > 0
      );
      
      if (!storeHook) {
        console.log(`[DFDBuilder] Warning: No hook found for store ${storeNode.label}`);
        continue;
      }
      
      const storeVariableName = storeHook.variables[0];
      console.log(`[DFDBuilder] Looking for processes that reference store: ${storeVariableName}`);
      
      // Find all processes that reference this store
      for (const process of analysis.processes) {
        const references = (process as any).references || [];
        
        if (references.includes(storeVariableName)) {
          // Find the process node
          const processNode = this.nodes.find(node => 
            node.type === 'process' && 
            node.label === process.name
          );
          
          if (processNode) {
            // Get the action properties from the store node metadata
            const actionProperties = storeNode.metadata?.processProperties || [];
            
            // Try to determine which action is being called
            // For now, use the process name as a heuristic
            const actionName = process.name;
            
            console.log(`[DFDBuilder] Creating store action call edge from ${process.name} to ${storeNode.label}`);
            this.edges.push({
              from: processNode.id,
              to: storeNode.id,
              label: `calls: ${actionName}`
            });
          }
        }
      }
    }
    
    // Create display edges from store properties to template elements
    // Find storeToRefs nodes or use store nodes directly
    const storeToRefsNodes = this.nodes.filter(node => 
      node.metadata?.isStoreToRefs === true
    );
    
    console.log(`[DFDBuilder] Found ${storeToRefsNodes.length} storeToRefs nodes`);
    
    // For each store node, create display edges for its data properties
    for (const storeNode of storeNodes) {
      const dataProperties = storeNode.metadata?.dataProperties || [];
      
      console.log(`[DFDBuilder] Store ${storeNode.label} has data properties:`, dataProperties);
      
      // Find template elements that display these properties
      for (const property of dataProperties) {
        // Find JSX elements that have this property in their display dependencies
        const displayElements = this.nodes.filter(node => 
          node.type === 'external-entity-output' &&
          node.metadata?.category === 'vue-template' &&
          node.metadata?.displayDependencies &&
          node.metadata.displayDependencies.includes(property)
        );
        
        for (const element of displayElements) {
          console.log(`[DFDBuilder] Creating display edge from ${storeNode.label} to ${element.label} for property ${property}`);
          this.edges.push({
            from: storeNode.id,
            to: element.id,
            label: `displays: ${property}`
          });
        }
      }
    }
  }

  /**
   * Create nodes for external function calls (external-entity-output)
   * Skip imperative handle calls - they are handled separately
   */
  private createExternalCallNodes(process: ProcessInfo, processNodeId: string): void {
    for (const externalCall of process.externalCalls) {
      // Skip imperative handle calls - they will be handled in createImperativeHandlerSubgroups
      if (externalCall.isImperativeHandleCall) {
        continue;
      }
      const externalCallNodeId = this.generateNodeId('external_call');
      this.nodes.push({
        id: externalCallNodeId,
        label: externalCall.functionName,
        type: 'external-entity-output',
        metadata: {
          category: 'external-call',
          calledBy: process.name,
          arguments: externalCall.arguments,
          callbackReferences: externalCall.callbackReferences
        }
      });

      // Create edge from process to external call
      this.edges.push({
        from: processNodeId,
        to: externalCallNodeId,
        label: 'calls'
      });
      
      // Create edges from external call to data stores if callback references setters
      if (externalCall.callbackReferences && externalCall.callbackReferences.length > 0) {
        const dataStoreNodes = this.nodes.filter(node => node.type === 'data-store');
        
        for (const ref of externalCall.callbackReferences) {
          for (const dataStoreNode of dataStoreNodes) {
            // Check if this reference is a setter for this data store
            if (dataStoreNode.metadata?.isReadWritePair && 
                dataStoreNode.metadata?.writeVariable === ref) {
              console.log(`🚚 ✅ Creating edge from external call ${externalCall.functionName} to ${dataStoreNode.label} (callback writes)`);
              this.edges.push({
                from: externalCallNodeId,
                to: dataStoreNode.id,
                label: 'callback writes'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Create subgroup for exported handlers
   */
  private createExportedHandlersSubgroup(
    process: ProcessInfo,
    parentId: string
  ): DFDSubgraph {
    // Use SubgraphBuilder to create the subgraph structure
    const subgraphBuilder = new SubgraphBuilder();
    const subgroup = subgraphBuilder.buildExportedHandlersSubgraph(process, parentId);
    
    if (!subgroup) {
      // Fallback to empty subgroup if builder returns null
      return {
        id: `${parentId}-exported-handlers`,
        label: 'exported handlers',
        type: 'exported-handlers',
        elements: [],
        parentProcessId: parentId
      };
    }

    // Add handler nodes to this.nodes for edge creation
    if (process.exportedHandlers) {
      for (const handler of process.exportedHandlers) {
        const handlerNode = subgroup.elements.find(
          (el): el is DFDNode => 'type' in el && el.label === handler.name
        );
        
        if (handlerNode) {
          // Add to this.nodes for edge creation
          this.nodes.push(handlerNode);
          
          // Create edges for this handler
          this.createExportedHandlerEdges(handler, handlerNode);
        }
      }
    }

    return subgroup;
  }

  /**
   * Create node for an exported handler
   */
  private createExportedHandlerNode(
    handler: ExportedHandlerInfo,
    parentId: string
  ): DFDNode {
    return {
      id: `${parentId}-handler-${handler.name}`,
      label: handler.name,
      type: 'process',
      line: handler.line,
      column: handler.column,
      metadata: {
        processType: 'exported-handler',
        parentProcessId: parentId,
        parameters: handler.parameters,
        returnsValue: handler.returnsValue,
        isAsync: handler.isAsync,
        line: handler.line,
        column: handler.column
      }
    };
  }

  /**
   * Create data flow edges for an exported handler
   * Creates edges from state variables, props, context to handlers
   * Creates edges from handlers to state setters and external calls
   */
  private createExportedHandlerEdges(
    handler: ExportedHandlerInfo,
    handlerNode: DFDNode
  ): void {
    // Create edges from referenced variables to handler (reads)
    for (const ref of handler.references) {
      const sourceNode = this.findNodeByVariable(ref, this.nodes);
      if (sourceNode) {
        // Check if this is a setter function (write variable)
        const isSetter = sourceNode.metadata?.isReadWritePair && 
                        sourceNode.metadata?.writeVariable === ref;
        
        if (isSetter) {
          // Handler calls setter - edge from handler to data store (writes)
          this.edges.push({
            from: handlerNode.id,
            to: sourceNode.id,
            label: 'writes'
          });
        } else {
          // Handler reads data - edge from data to handler
          this.edges.push({
            from: sourceNode.id,
            to: handlerNode.id,
            label: 'reads'
          });
        }
      }
    }

    // Create edges from handler to external calls
    for (const call of handler.externalCalls) {
      const callNodeId = this.generateNodeId('external_call');
      const callNode: DFDNode = {
        id: callNodeId,
        label: call.functionName,
        type: 'external-entity-output',
        metadata: {
          category: 'external-call',
          calledBy: handlerNode.label,
          arguments: call.arguments
        }
      };
      
      this.nodes.push(callNode);
      
      // Edge from handler to external call
      this.edges.push({
        from: handlerNode.id,
        to: callNodeId,
        label: 'calls'
      });

      // Create edges from arguments to external call
      for (const arg of call.arguments) {
        const argNode = this.findNodeByVariable(arg, this.nodes);
        if (argNode) {
          this.edges.push({
            from: argNode.id,
            to: callNodeId,
            label: 'passes'
          });
        }
      }
    }
  }

  /**
   * Build edges from condition variables to conditional subgraphs
   * Creates edges labeled "controls visibility" for conditionals
   * Creates edges labeled "iterates over" for loops
   */
  private buildConditionEdges(subgraph: DFDSubgraph, nodes: DFDNode[]): DFDEdge[] {
    const edges: DFDEdge[] = [];

    // Process all elements in the subgraph
    for (const element of subgraph.elements) {
      // Check if this is a subgraph (not a node)
      if ('elements' in element) {
        const childSubgraph = element as DFDSubgraph;
        
        // If this is a conditional subgraph, create edges from condition variables
        if (childSubgraph.type === 'conditional' && childSubgraph.condition) {
          const condition = childSubgraph.condition;
          
          // Determine if this is a loop subgraph
          const isLoop = childSubgraph.label === '{loop}';
          const edgeLabel = isLoop ? 'iterates over' : 'controls visibility';
          
          // Create edges from each condition variable to this subgraph
          for (const varName of condition.variables) {
            // Find the node for this variable
            const sourceNode = this.findNodeByVariable(varName, nodes);
            
            if (sourceNode) {
              edges.push({
                from: sourceNode.id,
                to: childSubgraph.id,
                label: edgeLabel
              });
            }
          }
        }
        
        // Recursively process nested subgraphs
        const nestedEdges = this.buildConditionEdges(childSubgraph, nodes);
        edges.push(...nestedEdges);
      }
    }

    return edges;
  }

  /**
   * Build edges from inline handlers to JSX elements
   * For inline handlers, create edges from JSX element to the variables used in the handler
   * (e.g., setters, context functions) instead of creating a process node
   */
  private buildInlineHandlerEdges(
    analysis: ComponentAnalysis,
    elementNodes: DFDNode[]
  ): void {
    // Find all inline handler processes
    const inlineHandlers = analysis.processes.filter(p => p.isInlineHandler && p.usedInJSXElement);
    
    console.log(`🚚 ========================================`);
    console.log(`🚚 buildInlineHandlerEdges: Found ${inlineHandlers.length} inline handlers`);
    console.log(`🚚 Inline handlers:`, inlineHandlers.map(h => `${h.name} (refs: ${h.references.join(', ')})`));
    
    for (const handler of inlineHandlers) {
      console.log(`🚚 Processing inline handler: ${handler.name}`);
      console.log(`🚚   References: ${handler.references.join(', ')}`);
      console.log(`🚚   Used in element at line ${handler.usedInJSXElement?.line}, column ${handler.usedInJSXElement?.column}`);
      
      // Find the JSX element node by position
      const elementNode = elementNodes.find(
        n => n.line === handler.usedInJSXElement?.line && 
             n.column === handler.usedInJSXElement?.column
      );
      
      if (!elementNode) {
        console.log(`🚚   ⚠️ JSX element not found for inline handler: ${handler.name} at line ${handler.usedInJSXElement?.line}, column ${handler.usedInJSXElement?.column}`);
        continue;
      }
      
      console.log(`🚚   ✅ Found element node: ${elementNode.id}: ${elementNode.label}`);
      
      const attributeName = handler.usedInJSXElement?.attributeName || 'onClick';
      
      // Create edges from JSX element to each referenced variable (setter, context function, etc.)
      for (const varName of handler.references) {
        console.log(`🚚   Processing reference: ${varName}`);
        const targetNode = this.findNodeByVariable(varName, this.nodes);
        
        if (!targetNode) {
          console.log(`🚚   ⚠️ Target node not found for variable: ${varName}`);
          continue;
        }
        
        console.log(`🚚   ✅ Found target node: ${targetNode.id}: ${targetNode.label} (${targetNode.type})`);
        
        // Classify the variable type
        const typeClassifier = new TypeClassifier();
        const varType = this.classifyVariable(varName, typeClassifier, targetNode);
        console.log(`🚚   Variable ${varName} classified as: ${varType}`);
        
        if (varType === 'function') {
          // Create label with variable name for library hook process properties
          let edgeLabel = attributeName;
          if (targetNode.metadata?.isLibraryHook && targetNode.metadata?.processProperties?.includes(varName)) {
            edgeLabel = `${attributeName}: ${varName}`;
          }
          
          // Check if edge already exists
          const existingEdge = this.edges.find(
            e => e.from === elementNode.id && e.to === targetNode.id && e.label === edgeLabel
          );
          
          if (existingEdge) {
            console.log(`🚚   ⚠️ Edge already exists from ${elementNode.id} to ${targetNode.id} (${edgeLabel}), skipping duplicate`);
          } else {
            // Function variable: create edge from element to function
            console.log(`🚚   ✅ Creating edge from ${elementNode.id} to ${targetNode.id} (${edgeLabel})`);
            this.edges.push({
              from: elementNode.id,
              to: targetNode.id,
              label: edgeLabel
            });
          }
        } else {
          console.log(`🚚   ⏭️ Skipping data variable: ${varName} (handled by display edges)`);
        }
        // For data variables, we don't create edges here (they're already handled by display edges)
      }
    }
    console.log(`🚚 ========================================`);
  }

  /**
   * Build edges from stores/processes to JSX elements based on attribute references
   * Uses TypeClassifier to determine if referenced variable is function or data
   */
  private buildAttributeReferenceEdges(
    element: JSXElementStructure,
    elementNode: DFDNode,
    nodes: DFDNode[],
    typeClassifier: TypeClassifier
  ): DFDEdge[] {
    const edges: DFDEdge[] = [];

    if (!element.attributeReferences || element.attributeReferences.length === 0) {
      return edges;
    }

    console.log(`🚚 ========================================`);
    console.log(`🚚 buildAttributeReferenceEdges: Processing element ${elementNode.label} (${elementNode.id})`);
    console.log(`🚚   Attributes:`, element.attributeReferences.map(a => `${a.attributeName}=${a.referencedVariable}`));

    for (const attrRef of element.attributeReferences) {
      const varName = attrRef.referencedVariable;
      console.log(`🚚   Processing attribute: ${attrRef.attributeName}=${varName}`);
      
      // Skip constants or undefined variables
      if (!varName || varName.startsWith('"') || varName.startsWith("'") || varName === 'undefined') {
        console.log(`🚚   ⏭️ Skipping constant/undefined: ${varName}`);
        continue;
      }

      // Skip inline handlers (they're handled by buildInlineHandlerEdges)
      if (varName.startsWith('inline_')) {
        console.log(`🚚   ⏭️ Skipping inline handler: ${varName} (handled separately)`);
        continue;
      }

      // Find the source node for this variable
      const sourceNode = this.findNodeByVariable(varName, nodes);
      
      if (!sourceNode) {
        console.log(`🚚   ⚠️ Source node not found for variable: ${varName}`);
        continue;
      }

      console.log(`🚚   ✅ Found source node: ${sourceNode.id}: ${sourceNode.label} (${sourceNode.type})`);

      // Check if there's a custom edge builder for this variable
      const customEdgeBuilder = this.customEdgeBuilders.get(varName);
      if (customEdgeBuilder) {
        const customEdges = customEdgeBuilder({
          elementNode,
          sourceNode,
          attributeRef: attrRef,
          element,
          nodes
        });
        edges.push(...customEdges);
        continue; // Skip default edge creation
      }

      // Classify the variable type (considering property name if available)
      let varType = this.classifyVariable(varName, typeClassifier, sourceNode);
      
      // If property name is provided, check if it's a function property
      if (attrRef.propertyName) {
        // Use property name to determine if it's a function
        const propertyType = this.classifyPropertyType(attrRef.propertyName);
        if (propertyType) {
          varType = propertyType;
        }
      }
      
      console.log(`🚚   Variable ${varName}${attrRef.propertyName ? '.' + attrRef.propertyName : ''} classified as: ${varType}`);
      
      // Create edge based on variable type
      if (varType === 'function') {
        // Create label with variable name for library hook process properties
        let edgeLabel = attrRef.attributeName;
        
        // If property name is provided, use it
        if (attrRef.propertyName) {
          edgeLabel = `${attrRef.attributeName}: ${attrRef.propertyName}`;
        }
        // If this is a library hook process property, include the variable name
        else if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.processProperties?.includes(varName)) {
          edgeLabel = `${attrRef.attributeName}: ${varName}`;
        }
        
        // Check if edge already exists
        const existingEdge = edges.find(
          e => e.from === elementNode.id && e.to === sourceNode.id && e.label === edgeLabel
        );
        
        if (existingEdge) {
          console.log(`🚚   ⚠️ Edge already exists from ${elementNode.id} to ${sourceNode.id} (${edgeLabel}), skipping duplicate`);
        } else {
          // Function variable: create edge from element to function (element triggers function)
          console.log(`🚚   ✅ Creating edge from ${elementNode.id} to ${sourceNode.id} (${edgeLabel})`);
          edges.push({
            from: elementNode.id,
            to: sourceNode.id,
            label: edgeLabel
          });
        }
      } else {
        // Data variable: create edge from data to element (data binds to element attribute)
        // For reducer state, add property name to label
        let finalLabel = 'binds';
        if (sourceNode.metadata?.isReducer && sourceNode.metadata?.stateProperties) {
          const stateProps = sourceNode.metadata.stateProperties as string[];
          if (stateProps.includes(varName)) {
            finalLabel = `binds: ${varName}`;
          }
        }
        // For library hooks (useSWR, useSWRMutation), add property name to label
        if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.properties) {
          const properties = sourceNode.metadata.properties as string[];
          if (properties.includes(varName)) {
            finalLabel = `binds: ${varName}`;
          }
        }
        // For library hooks (Next.js, etc.), add property name to label
        if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.dataProperties) {
          const dataProps = sourceNode.metadata.dataProperties as string[];
          if (dataProps.includes(varName)) {
            finalLabel = `binds: ${varName}`;
          }
        }
        // If property name is provided, add it to the label
        if (attrRef.propertyName) {
          finalLabel = `binds: ${attrRef.propertyName}`;
        }
        
        console.log(`🚚   ✅ Creating edge from ${sourceNode.id} to ${elementNode.id} (${finalLabel})`);
        edges.push({
          from: sourceNode.id,
          to: elementNode.id,
          label: finalLabel
        });
      }
    }

    return edges;
  }

  /**
   * Build edges from stores to JSX elements for content variables
   * Creates edges labeled "display"
   */
  private buildDisplayEdges(subgraph: DFDSubgraph, nodes: DFDNode[]): DFDEdge[] {
    const edges: DFDEdge[] = [];

    this.log('🚚 buildDisplayEdges: Starting');

    // First, create control visibility/iterates over edges for conditional subgraphs
    const conditionalSubgraphs = this.collectConditionalSubgraphs(subgraph);
    console.log(`🚚 buildDisplayEdges: Found ${conditionalSubgraphs.length} conditional subgraphs`);
    
    for (const conditionalSubgraph of conditionalSubgraphs) {
      if (conditionalSubgraph.condition) {
        // Determine edge label based on subgraph type
        const isLoop = conditionalSubgraph.label === '{loop}';
        const edgeLabel = isLoop ? 'iterates over' : 'control visibility';
        
        console.log(`🚚 buildDisplayEdges: Processing ${isLoop ? 'loop' : 'conditional'} subgraph ${conditionalSubgraph.id}, variables:`, conditionalSubgraph.condition.variables);
        
        for (const varName of conditionalSubgraph.condition.variables) {
          // Find the source node for this variable
          const sourceNode = this.findNodeByVariable(varName, nodes);
          
          if (sourceNode) {
            // For reducer state, add property name to label
            let finalLabel = edgeLabel;
            if (sourceNode.metadata?.isReducer && sourceNode.metadata?.stateProperties) {
              const stateProps = sourceNode.metadata.stateProperties as string[];
              if (stateProps.includes(varName)) {
                finalLabel = `${edgeLabel}: ${varName}`;
              }
            }
            // For library hooks (useSWR, useSWRMutation), add property name to label
            if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.properties) {
              const properties = sourceNode.metadata.properties as string[];
              if (properties.includes(varName)) {
                finalLabel = `${edgeLabel}: ${varName}`;
              }
            }
            // For library hooks (Next.js, etc.), add property name to label
            if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.dataProperties) {
              const dataProps = sourceNode.metadata.dataProperties as string[];
              if (dataProps.includes(varName)) {
                finalLabel = `${edgeLabel}: ${varName}`;
              }
            }
            
            console.log(`🚚   ✅ Creating ${finalLabel} edge from ${sourceNode.id} to ${conditionalSubgraph.id}`);
            edges.push({
              from: sourceNode.id,
              to: conditionalSubgraph.id,
              label: finalLabel
            });
          } else {
            console.log(`🚚   ⚠️ Source node not found for variable: ${varName}`);
          }
        }
      }
    }

    // Then, create display edges for ALL elements (including those in conditionals)
    const allElementNodes = this.collectElementNodes(subgraph);
    console.log(`🚚 buildDisplayEdges: Found ${allElementNodes.length} total element nodes`);

    for (const elementNode of allElementNodes) {
      const displayDependencies = elementNode.metadata?.displayDependencies || [];
      
      for (const varName of displayDependencies) {
        // Find the source node for this variable
        const sourceNode = this.findNodeByVariable(varName, nodes);
        
        if (sourceNode) {
          // For reducer state, add property name to label
          let finalLabel = 'display';
          if (sourceNode.metadata?.isReducer && sourceNode.metadata?.stateProperties) {
            const stateProps = sourceNode.metadata.stateProperties as string[];
            if (stateProps.includes(varName)) {
              finalLabel = `display: ${varName}`;
            }
          }
          // For library hooks (useSWR, useSWRMutation), add property name to label
          if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.properties) {
            const properties = sourceNode.metadata.properties as string[];
            if (properties.includes(varName)) {
              finalLabel = `display: ${varName}`;
            }
          }
          // For library hooks (Next.js, etc.), add property name to label
          if (sourceNode.metadata?.isLibraryHook && sourceNode.metadata?.dataProperties) {
            const dataProps = sourceNode.metadata.dataProperties as string[];
            if (dataProps.includes(varName)) {
              finalLabel = `display: ${varName}`;
            }
          }
          
          console.log(`🚚   Creating ${finalLabel} edge from ${sourceNode.id} to ${elementNode.id}`);
          edges.push({
            from: sourceNode.id,
            to: elementNode.id,
            label: finalLabel
          });
        }
      }
    }

    console.log(`🚚 buildDisplayEdges: Created ${edges.length} edges`);
    return edges;
  }

  /**
   * Build display edges for Vue components
   * Creates direct edges from props/state to JSX elements (no intermediate _display nodes)
   */
  private buildVueDisplayEdges(subgraph: DFDSubgraph, nodes: DFDNode[]): DFDEdge[] {
    const edges: DFDEdge[] = [];

    console.log('🚚 buildVueDisplayEdges: Starting');

    // First, create control visibility/iterates over edges for conditional subgraphs
    const conditionalSubgraphs = this.collectConditionalSubgraphs(subgraph);
    console.log(`🚚 buildVueDisplayEdges: Found ${conditionalSubgraphs.length} conditional subgraphs`);
    
    for (const conditionalSubgraph of conditionalSubgraphs) {
      if (conditionalSubgraph.condition) {
        // Determine edge label based on subgraph type
        const isLoop = conditionalSubgraph.type === 'loop' || conditionalSubgraph.label?.includes('v-for');
        const edgeLabel = isLoop ? 'iterates over' : 'control visibility';
        
        console.log(`🚚 buildVueDisplayEdges: Processing ${isLoop ? 'loop' : 'conditional'} subgraph ${conditionalSubgraph.id}, variables:`, conditionalSubgraph.condition.variables);
        
        for (const varName of conditionalSubgraph.condition.variables) {
          // Find the source node for this variable
          const sourceNode = this.findVueNodeByVariable(varName, nodes);
          
          if (sourceNode) {
            console.log(`🚚   ✅ Creating ${edgeLabel} edge from ${sourceNode.id} to ${conditionalSubgraph.id}`);
            edges.push({
              from: sourceNode.id,
              to: conditionalSubgraph.id,
              label: edgeLabel
            });
          } else {
            console.log(`🚚   ⚠️ Source node not found for variable: ${varName}`);
          }
        }
      }
    }

    // Then, create display/binds edges for ALL elements (including those in conditionals)
    const allElementNodes = this.collectElementNodes(subgraph);
    console.log(`🚚 buildVueDisplayEdges: Found ${allElementNodes.length} total element nodes`);

    for (const elementNode of allElementNodes) {
      // Handle v-bind attributes with "binds" label
      const vBindAttributes = elementNode.metadata?.vBindAttributes || [];
      
      for (const vBind of vBindAttributes) {
        const sourceNode = this.findVueNodeByVariable(vBind.variable, nodes);
        
        if (sourceNode) {
          console.log(`🚚   Creating binds edge from ${sourceNode.id} to ${elementNode.id} for :${vBind.attribute}`);
          edges.push({
            from: sourceNode.id,
            to: elementNode.id,
            label: 'binds'
          });
        } else {
          console.log(`🚚   ⚠️ Source node not found for v-bind variable: ${vBind.variable}`);
        }
      }

      // Handle v-model with bidirectional data flows
      const vModelVariable = elementNode.metadata?.vModelVariable;
      
      if (vModelVariable) {
        const sourceNode = this.findVueNodeByVariable(vModelVariable, nodes);
        
        if (sourceNode) {
          console.log(`🚚   Creating bidirectional v-model edges for ${vModelVariable}`);
          
          // Data to element (binds)
          edges.push({
            from: sourceNode.id,
            to: elementNode.id,
            label: 'binds'
          });
          
          // Element to data (updates)
          edges.push({
            from: elementNode.id,
            to: sourceNode.id,
            label: 'updates'
          });
        } else {
          console.log(`🚚   ⚠️ Source node not found for v-model variable: ${vModelVariable}`);
        }
      }

      // Handle regular display dependencies (mustache bindings)
      const displayDependencies = elementNode.metadata?.displayDependencies || [];
      
      for (const varName of displayDependencies) {
        // Skip if this variable is already handled by v-bind or v-model
        const isHandledByVBind = vBindAttributes.some((vb: any) => vb.variable === varName);
        const isHandledByVModel = vModelVariable === varName;
        
        if (isHandledByVBind || isHandledByVModel) {
          continue;
        }

        // Find the source node for this variable
        const sourceNode = this.findVueNodeByVariable(varName, nodes);
        
        if (sourceNode) {
          // Determine edge label based on source node type
          let edgeLabel = 'display';
          
          // If source is a composable, use "display: propertyName" as the label
          if (sourceNode.metadata?.isCustomComposable && sourceNode.metadata?.dataProperties) {
            const dataProperties = sourceNode.metadata.dataProperties as string[];
            if (dataProperties.includes(varName)) {
              edgeLabel = `display: ${varName}`;
            }
          }
          
          console.log(`🚚   Creating display edge from ${sourceNode.id} (${sourceNode.label}) to ${elementNode.id} (${elementNode.label}) with label "${edgeLabel}"`);
          edges.push({
            from: sourceNode.id,
            to: elementNode.id,
            label: edgeLabel
          });
        } else {
          console.log(`🚚   ⚠️ Source node not found for display variable: ${varName}`);
        }
      }
    }

    console.log(`🚚 buildVueDisplayEdges: Created ${edges.length} edges`);
    return edges;
  }

  /**
   * Find a Vue node by variable name
   * Searches for props, state, computed, and other Vue-specific nodes
   */
  private findVueNodeByVariable(varName: string, nodes: DFDNode[]): DFDNode | undefined {
    // Search for the variable in various node types
    return nodes.find(node => {
      // Match by label for simple cases
      if (node.label === varName) {
        return (
          node.type === 'external-entity-input' ||
          node.type === 'data-store' ||
          node.metadata?.category === 'vue-state' ||
          node.metadata?.category === 'vue-computed' ||
          node.metadata?.category === 'state-management'
        );
      }
      
      // For library hooks, check if the variable is in properties
      if (node.metadata?.isLibraryHook && node.metadata?.properties) {
        const properties = node.metadata.properties as string[];
        if (properties.includes(varName)) {
          return true;
        }
      }
      
      // For library hooks (including Pinia stores), check if the variable is in dataProperties
      if (node.metadata?.isLibraryHook && node.metadata?.dataProperties) {
        const dataProperties = node.metadata.dataProperties as string[];
        if (dataProperties.includes(varName)) {
          return true;
        }
      }
      
      // For composables, check if the variable is in dataProperties
      if (node.metadata?.isCustomComposable && node.metadata?.dataProperties) {
        const dataProperties = node.metadata.dataProperties as string[];
        if (dataProperties.includes(varName)) {
          return true;
        }
      }
      
      return false;
    });
  }

  /**
   * Recursively collect all element nodes from subgraph tree
   */
  private collectElementNodes(subgraph: DFDSubgraph): DFDNode[] {
    const nodes: DFDNode[] = [];

    for (const element of subgraph.elements) {
      // Check if this is a node (not a subgraph)
      if ('type' in element && element.type !== 'conditional' && element.type !== 'jsx-output') {
        // This is a DFDNode
        nodes.push(element as DFDNode);
      } else if ('elements' in element) {
        // This is a DFDSubgraph, recurse
        const childNodes = this.collectElementNodes(element as DFDSubgraph);
        nodes.push(...childNodes);
      }
    }

    return nodes;
  }

  /**
   * Collect conditional subgraphs as nodes (for control visibility edges)
   */
  private collectConditionalSubgraphNodes(subgraph: DFDSubgraph): DFDNode[] {
    const nodes: DFDNode[] = [];

    console.log(`🚚 collectConditionalSubgraphNodes: Processing subgraph ${subgraph.id}, type: ${subgraph.type}, elements: ${subgraph.elements.length}`);

    for (const element of subgraph.elements) {
      if ('elements' in element) {
        const childSubgraph = element as DFDSubgraph;
        console.log(`🚚   Found child subgraph: ${childSubgraph.id}, type: ${childSubgraph.type}, has condition: ${!!childSubgraph.condition}`);
        
        // If this is a conditional subgraph, create a node for it
        if (childSubgraph.type === 'conditional' && childSubgraph.condition) {
          const subgraphNode: DFDNode = {
            id: childSubgraph.id,
            label: childSubgraph.label,
            type: 'subgraph',
            metadata: {
              subgraphType: 'conditional',
              condition: childSubgraph.condition,
            }
          };
          console.log(`🚚   ✅ Created subgraph node: ${subgraphNode.id}, label: ${subgraphNode.label}`);
          nodes.push(subgraphNode);
        }
        
        // Recurse into child subgraphs
        const childNodes = this.collectConditionalSubgraphNodes(childSubgraph);
        nodes.push(...childNodes);
      }
    }

    console.log(`🚚 collectConditionalSubgraphNodes: Returning ${nodes.length} nodes`);
    return nodes;
  }

  /**
   * Collect all conditional subgraphs (not as nodes, but as subgraph objects)
   */
  private collectConditionalSubgraphs(subgraph: DFDSubgraph): DFDSubgraph[] {
    const subgraphs: DFDSubgraph[] = [];

    console.log(`🚚 collectConditionalSubgraphs: Processing subgraph ${subgraph.id}, type: ${subgraph.type}`);

    for (const element of subgraph.elements) {
      if ('elements' in element) {
        const childSubgraph = element as DFDSubgraph;
        
        // If this is a conditional subgraph, add it
        if (childSubgraph.type === 'conditional') {
          console.log(`🚚   ✅ Found conditional subgraph: ${childSubgraph.id}, condition:`, childSubgraph.condition);
          subgraphs.push(childSubgraph);
        }
        
        // Recurse into child subgraphs
        const childSubgraphs = this.collectConditionalSubgraphs(childSubgraph);
        subgraphs.push(...childSubgraphs);
      }
    }

    console.log(`🚚 collectConditionalSubgraphs: Returning ${subgraphs.length} subgraphs`);
    return subgraphs;
  }

  /**
   * Collect element nodes that are NOT inside conditional subgraphs
   * (only direct children of jsx-output subgraph)
   */
  private collectElementNodesNotInConditionals(subgraph: DFDSubgraph): DFDNode[] {
    const nodes: DFDNode[] = [];

    for (const element of subgraph.elements) {
      // Check if this is a node (not a subgraph)
      if ('type' in element && element.type !== 'conditional' && element.type !== 'jsx-output' && element.type !== 'subgraph') {
        // This is a DFDNode at the root level (not in a conditional)
        nodes.push(element as DFDNode);
      } else if ('elements' in element) {
        const childSubgraph = element as DFDSubgraph;
        // Only recurse if this is NOT a conditional subgraph
        if (childSubgraph.type !== 'conditional') {
          const childNodes = this.collectElementNodesNotInConditionals(childSubgraph);
          nodes.push(...childNodes);
        }
        // If it IS a conditional subgraph, don't recurse - those elements are controlled by the condition
      }
    }

    return nodes;
  }

  /**
   * Find node by variable name
   * Searches through all nodes to find one that represents the given variable
   */
  private findNodeByVariable(variableName: string, nodes: DFDNode[]): DFDNode | undefined {
    // First, try exact label match
    let node = nodes.find(n => n.label === variableName);
    if (node) {
      return node;
    }

    // For read-write pairs, check if this is the read variable
    node = nodes.find(n => 
      n.metadata?.isReadWritePair && 
      n.metadata?.readVariable === variableName
    );
    if (node) {
      return node;
    }

    // For read-write pairs, check if this is the write variable (setter)
    node = nodes.find(n => 
      n.metadata?.isReadWritePair && 
      n.metadata?.writeVariable === variableName
    );
    if (node) {
      return node;
    }

    // For Jotai atoms (read-only or write-only), check if this is the read variable
    node = nodes.find(n => 
      n.metadata?.category === 'jotai-atom' && 
      n.metadata?.readVariable === variableName
    );
    if (node) {
      return node;
    }

    // For Jotai atoms (write-only), check if this is the write variable
    node = nodes.find(n => 
      n.metadata?.category === 'jotai-atom' && 
      n.metadata?.writeVariable === variableName
    );
    if (node) {
      return node;
    }

    // For reducer state, check if this is a state property
    node = nodes.find(n => 
      n.metadata?.isReducer && 
      n.metadata?.stateProperties &&
      (n.metadata.stateProperties as string[]).includes(variableName)
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found reducer node for state property "${variableName}":`, node.label);
      return node;
    }

    // For reducer state, check if this is the state variable itself
    node = nodes.find(n => 
      n.metadata?.isReducer && 
      n.metadata?.readVariable === variableName
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found reducer node for state variable "${variableName}":`, node.label);
      return node;
    }

    // For library hooks (useSWR, useSWRMutation), check if this is one of the properties
    node = nodes.find(n => 
      n.metadata?.isLibraryHook && 
      n.metadata?.properties &&
      (n.metadata.properties as string[]).includes(variableName)
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found library hook node for property "${variableName}":`, node.label);
      return node;
    }

    // For library hooks (Next.js, etc.), check if this is one of the data properties
    node = nodes.find(n => 
      n.metadata?.isLibraryHook && 
      n.metadata?.dataProperties &&
      (n.metadata.dataProperties as string[]).includes(variableName)
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found library hook node for data property "${variableName}":`, node.label);
      return node;
    }

    // For library hooks (Next.js, etc.), check if this is one of the process properties
    node = nodes.find(n => 
      n.metadata?.isLibraryHook && 
      n.metadata?.processProperties &&
      (n.metadata.processProperties as string[]).includes(variableName)
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found library hook node for process property "${variableName}":`, node.label);
      return node;
    }

    // For custom hooks, check if this is one of the data values
    node = nodes.find(n => 
      n.metadata?.dataValues &&
      (n.metadata.dataValues as string[]).includes(variableName)
    );
    if (node) {
      return node;
    }

    // For context-data nodes, check the variableName metadata
    node = nodes.find(n => 
      n.metadata?.category === 'context-data' &&
      n.metadata?.variableName === variableName
    );
    if (node) {
      return node;
    }

    // For context-function nodes, check the variableName metadata
    node = nodes.find(n => 
      n.metadata?.category === 'context-function' &&
      n.metadata?.variableName === variableName
    );
    if (node) {
      return node;
    }

    return undefined;
  }

  /**
   * Classify a property name as 'data' or 'function' based on naming patterns
   */
  private classifyPropertyType(propertyName: string): 'data' | 'function' | null {
    // Common function/action patterns
    const functionPatterns = [
      /^(set|update|add|remove|delete|clear|reset|toggle|increment|decrement)/i,
      /^(on|handle)/i,
      /Action$/i,
      /^(fetch|load|save|submit|send|post|get|put|patch)/i,
    ];
    
    if (functionPatterns.some(pattern => pattern.test(propertyName))) {
      return 'function';
    }
    
    // If it doesn't match function patterns, assume it's data
    // (we could add data patterns here if needed)
    return null; // Return null to use default classification
  }

  /**
   * Classify variable as function or data using TypeClassifier
   */
  private classifyVariable(
    variableName: string,
    typeClassifier: TypeClassifier,
    sourceNode: DFDNode
  ): 'function' | 'data' {
    // Check node metadata first
    if (sourceNode.metadata?.isFunctionType) {
      return 'function';
    }

    // Check if this is a process node (always function)
    if (sourceNode.type === 'process') {
      return 'function';
    }

    // Check if this is a context-function node
    if (sourceNode.metadata?.category === 'context-function') {
      return 'function';
    }

    // Check if this is a custom-hook-function node
    if (sourceNode.metadata?.category === 'custom-hook-function') {
      return 'function';
    }

    // Check if this is a write variable (setter function)
    if (sourceNode.metadata?.isReadWritePair && 
        sourceNode.metadata?.writeVariable === variableName) {
      return 'function';
    }

    // Check if this is in writeMethods
    if (sourceNode.metadata?.writeMethods &&
        (sourceNode.metadata.writeMethods as string[]).includes(variableName)) {
      return 'function';
    }

    // For library hooks (useSWR, useSWRMutation), check if this is a process property
    if (sourceNode.metadata?.isLibraryHook) {
      const processProperties = sourceNode.metadata.processProperties as string[] | undefined;
      if (processProperties && processProperties.includes(variableName)) {
        console.log(`🔍 classifyVariable: ${variableName} is a process property (function)`);
        return 'function';
      }
      const dataProperties = sourceNode.metadata.dataProperties as string[] | undefined;
      if (dataProperties && dataProperties.includes(variableName)) {
        console.log(`🔍 classifyVariable: ${variableName} is a data property (data)`);
        return 'data';
      }
    }

    // Use TypeClassifier with event handler usage information
    const typeString = (sourceNode.metadata?.typeString as string) || '';
    const eventHandlerUsage = this.eventHandlerUsageMap[variableName];
    
    const classification = typeClassifier.classifyWithUsage(
      typeString,
      variableName,
      eventHandlerUsage
    );
    
    if (classification.isFunction) {
      return 'function';
    }

    // Check naming patterns as fallback
    if (variableName.startsWith('on') || 
        variableName.startsWith('handle') ||
        variableName.startsWith('set')) {
      return 'function';
    }

    // Default to data
    return 'data';
  }

  /**
   * Collect all attribute references from JSX structure
   * Recursively traverses the JSX tree to gather all attribute references
   */
  private collectAllAttributeReferences(structure: JSXStructure): JSXAttributeReference[] {
    const references: JSXAttributeReference[] = [];

    // Check if this structure is an element
    if ('type' in structure && structure.type === 'element') {
      const element = structure as JSXElementStructure;
      
      // Add this element's attribute references
      if (element.attributeReferences && element.attributeReferences.length > 0) {
        references.push(...element.attributeReferences);
      }
      
      // Recursively collect from children
      for (const child of element.children) {
        const childRefs = this.collectAllAttributeReferences(child);
        references.push(...childRefs);
      }
    } else {
      // This is a conditional branch
      const branch = structure as ConditionalBranch;
      
      if (branch.trueBranch) {
        const trueRefs = this.collectAllAttributeReferences(branch.trueBranch);
        references.push(...trueRefs);
      }
      
      if (branch.falseBranch) {
        const falseRefs = this.collectAllAttributeReferences(branch.falseBranch);
        references.push(...falseRefs);
      }
    }

    return references;
  }

  /**
   * Find JSXElementStructure by line and column
   */
  private findElementStructure(
    structure: JSXStructure,
    line?: number,
    column?: number
  ): JSXElementStructure | undefined {
    if (!line || !column) {
      return undefined;
    }

    // Check if this structure is an element
    if ('type' in structure && structure.type === 'element') {
      const element = structure as JSXElementStructure;
      if (element.line === line && element.column === column) {
        return element;
      }
      
      // Search in children
      for (const child of element.children) {
        const found = this.findElementStructure(child, line, column);
        if (found) {
          return found;
        }
      }
    } else {
      // This is a conditional branch
      const branch = structure as ConditionalBranch;
      
      if (branch.trueBranch) {
        const found = this.findElementStructure(branch.trueBranch, line, column);
        if (found) {
          return found;
        }
      }
      
      if (branch.falseBranch) {
        const found = this.findElementStructure(branch.falseBranch, line, column);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Build edges from JSX elements with ref attribute to exported handlers subgroups
   * Creates edges showing that a component exports handlers through ref
   */
  private buildJSXToExportedHandlersEdges(rootSubgraph?: DFDSubgraph): void {
    // Collect all JSX elements from both this.nodes and rootSubgraph
    const allJSXElements: DFDNode[] = [];
    
    // Add JSX elements from this.nodes
    const jsxFromNodes = this.nodes.filter(
      node => node.type === 'external-entity-output' && node.metadata?.category === 'jsx-element'
    );
    allJSXElements.push(...jsxFromNodes);
    
    // Add JSX elements from rootSubgraph
    if (rootSubgraph) {
      const jsxFromSubgraph = this.collectJSXElementsFromSubgraph(rootSubgraph);
      allJSXElements.push(...jsxFromSubgraph);
    }
    
    const jsxElementsWithRef = allJSXElements.filter(
      node => node.metadata?.attributeReferences?.some(
        (ref: JSXAttributeReference) => ref.attributeName === 'ref'
      )
    );
    
    console.log(`🚚 buildJSXToExportedHandlersEdges: Found ${jsxElementsWithRef.length} JSX elements with ref attribute`);
    
    for (const jsxElement of jsxElementsWithRef) {
      // Find ref attribute
      const refAttribute = jsxElement.metadata?.attributeReferences?.find(
        (ref: JSXAttributeReference) => ref.attributeName === 'ref'
      );
      
      if (!refAttribute || !refAttribute.referencedVariable) {
        continue;
      }
      
      // Get ref variable name (e.g., "childRef")
      const refVarName = refAttribute.referencedVariable;
      
      // Find corresponding exported handlers subgroup
      const subgroupId = `${refVarName}-exported-handlers`;
      const subgroup = this.exportedHandlerSubgroups.find(sg => sg.id === subgroupId);
      
      if (subgroup) {
        console.log(`🚚   ✅ Creating edge: ${jsxElement.label} -> ${subgroupId}`);
        
        // Create edge from JSX element to subgroup (using subgroup ID as target)
        this.edges.push({
          from: jsxElement.id,
          to: subgroupId,
          label: 'exports',
          isLongArrow: true // Use longer arrow for better visibility
        });
      }
    }
  }
  
  /**
   * Recursively collect JSX elements from a subgraph
   */
  private collectJSXElementsFromSubgraph(subgraph: DFDSubgraph): DFDNode[] {
    const jsxElements: DFDNode[] = [];
    
    for (const element of subgraph.elements) {
      // Check if it's a nested subgraph
      if ('type' in element && (element.type === 'jsx-output' || element.type === 'conditional' || element.type === 'exported-handlers')) {
        // Recurse into nested subgraph
        jsxElements.push(...this.collectJSXElementsFromSubgraph(element as DFDSubgraph));
      } else {
        // It's a node - check if it's a JSX element
        const node = element as DFDNode;
        
        // JSX elements are external-entity-output nodes (they represent JSX output)
        if (node.type === 'external-entity-output') {
          jsxElements.push(node);
        }
      }
    }
    
    return jsxElements;
  }

  /**
   * Build edges from processes to function props (calls)
   * Creates edges when a process calls a function prop
   */
  private buildProcessToFunctionPropEdges(analysis: ComponentAnalysis): void {
    // Find all props first
    const allPropNodes = this.nodes.filter(
      node => node.type === 'external-entity-input' && node.metadata?.category === 'prop'
    );
    this.log('🚚 buildProcessToFunctionPropEdges: All prop nodes:', allPropNodes.map(n => ({ 
      label: n.label, 
      isFunctionType: n.metadata?.isFunctionType 
    })));
    
    // Find all function props (props with isFunction metadata or output props)
    const functionPropNodes = this.nodes.filter(
      node => node.type === 'external-entity-output' && 
              node.metadata?.category === 'prop'
    );
    
    this.log('🚚 buildProcessToFunctionPropEdges: Function prop nodes (output):', functionPropNodes.length);
    this.log('🚚 buildProcessToFunctionPropEdges: Function props:', functionPropNodes.map(n => n.label));
    
    for (const process of analysis.processes) {
      // Skip inline handlers
      if (process.isInlineHandler) {
        continue;
      }
      
      const processNode = this.nodes.find(
        node => node.type === 'process' && node.label === process.name
      );
      
      if (!processNode) {
        continue;
      }
      
      // Check if process references any function props
      for (const functionPropNode of functionPropNodes) {
        if (process.references.includes(functionPropNode.label)) {
          console.log(`🚚 ✅ Creating call edge from ${process.name} to function prop ${functionPropNode.label}`);
          this.edges.push({
            from: processNode.id,
            to: functionPropNode.id,
            label: 'calls'
          });
        }
      }
      
      // Also check cleanup process
      if (process.cleanupProcess) {
        const cleanupNode = this.nodes.find(
          node => node.type === 'process' && node.label === process.cleanupProcess!.name
        );
        
        if (cleanupNode) {
          for (const functionPropNode of functionPropNodes) {
            if (process.cleanupProcess.references.includes(functionPropNode.label)) {
              this.edges.push({
                from: cleanupNode.id,
                to: functionPropNode.id,
                label: 'calls'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Build edges from processes to Vue emits
   * Creates edges when a process calls emit()
   */
  private buildProcessToVueEmitsEdges(analysis: ComponentAnalysis): void {
    if (!analysis.vueEmitCalls || analysis.vueEmitCalls.length === 0) {
      return;
    }
    
    this.log('🚚 buildProcessToVueEmitsEdges: Starting');
    this.log('🚚 buildProcessToVueEmitsEdges: Emit calls:', analysis.vueEmitCalls.length);
    
    // Find all Vue emit nodes
    const emitNodes = this.nodes.filter(
      node => node.type === 'external-entity-output' && node.metadata?.category === 'vue-emit'
    );
    
    this.log('🚚 buildProcessToVueEmitsEdges: Emit nodes:', emitNodes.map(n => n.label));
    
    // Process each emit call
    for (const emitCall of analysis.vueEmitCalls) {
      // Find the emit node for this event
      const emitNode = emitNodes.find(node => node.label === emitCall.eventName);
      
      if (!emitNode) {
        console.log(`🚚 ⚠️ No emit node found for event: ${emitCall.eventName}`);
        continue;
      }
      
      // If the emit call has a caller process, create edge from process to emit
      if (emitCall.callerProcess) {
        const processNode = this.nodes.find(
          node => node.type === 'process' && node.label === emitCall.callerProcess
        );
        
        if (processNode) {
          console.log(`🚚 ✅ Creating emit edge from ${emitCall.callerProcess} to ${emitCall.eventName}`);
          this.edges.push({
            from: processNode.id,
            to: emitNode.id,
            label: 'emits'
          });
        } else {
          console.log(`🚚 ⚠️ No process node found for: ${emitCall.callerProcess}`);
        }
      } else {
        // Top-level emit call (not in a function) - could create edge from component itself
        // For now, we'll skip these as they're less common
        console.log(`🚚 ℹ️ Top-level emit call for event: ${emitCall.eventName}`);
      }
    }
  }

  /**
   * Create exported handlers subgroups for imperative handle calls
   * Collects all ref.current.method() calls across all processes and groups them by ref name
   */
  private createImperativeHandlerSubgroups(processes: ProcessInfo[]): void {
    // Collect all imperative handle calls from all processes
    const imperativeHandleCallsByRef = new Map<string, Map<string, { call: ExternalCallInfo; callingProcesses: string[] }>>();
    const processNodeMap = new Map<string, string>(); // process name -> node ID
    
    // Build process node map
    for (const node of this.nodes) {
      if (node.type === 'process' && node.label) {
        processNodeMap.set(node.label, node.id);
      }
    }
    
    // Collect all imperative handle calls
    for (const process of processes) {
      for (const externalCall of process.externalCalls) {
        if (externalCall.isImperativeHandleCall && externalCall.refName && externalCall.methodName) {
          // Get or create ref group
          if (!imperativeHandleCallsByRef.has(externalCall.refName)) {
            imperativeHandleCallsByRef.set(externalCall.refName, new Map());
          }
          
          const refGroup = imperativeHandleCallsByRef.get(externalCall.refName)!;
          
          // Get or create method entry
          if (!refGroup.has(externalCall.methodName)) {
            refGroup.set(externalCall.methodName, {
              call: externalCall,
              callingProcesses: []
            });
          }
          
          // Add calling process
          refGroup.get(externalCall.methodName)!.callingProcesses.push(process.name);
        }
      }
      
      // Also check cleanup process
      if (process.cleanupProcess) {
        for (const externalCall of process.cleanupProcess.externalCalls) {
          if (externalCall.isImperativeHandleCall && externalCall.refName && externalCall.methodName) {
            if (!imperativeHandleCallsByRef.has(externalCall.refName)) {
              imperativeHandleCallsByRef.set(externalCall.refName, new Map());
            }
            
            const refGroup = imperativeHandleCallsByRef.get(externalCall.refName)!;
            
            if (!refGroup.has(externalCall.methodName)) {
              refGroup.set(externalCall.methodName, {
                call: externalCall,
                callingProcesses: []
              });
            }
            
            refGroup.get(externalCall.methodName)!.callingProcesses.push(process.cleanupProcess.name);
          }
        }
      }
    }
    
    // Create subgroups for each ref
    for (const [refName, methodsMap] of imperativeHandleCallsByRef.entries()) {
      const subgroupId = `${refName}-exported-handlers`;
      const handlerNodes: DFDNode[] = [];
      
      // Create handler nodes
      for (const [methodName, { call, callingProcesses }] of methodsMap.entries()) {
        const handlerNodeId = `${subgroupId}-${methodName}`;
        const handlerNode: DFDNode = {
          id: handlerNodeId,
          label: methodName,
          type: 'process',
          metadata: {
            processType: 'exported-handler',
            refName: call.refName,
            methodName: call.methodName
          }
        };
        
        handlerNodes.push(handlerNode);
        this.nodes.push(handlerNode);
        
        // Create edges from all calling processes to this handler
        for (const callingProcessName of callingProcesses) {
          const callingProcessNodeId = processNodeMap.get(callingProcessName);
          if (callingProcessNodeId) {
            this.edges.push({
              from: callingProcessNodeId,
              to: handlerNodeId,
              label: 'calls'
            });
          }
        }
      }
      
      // Create subgroup
      const subgroup: DFDSubgraph = {
        id: subgroupId,
        label: 'exported handlers',
        type: 'exported-handlers',
        elements: handlerNodes
      };
      
      this.exportedHandlerSubgroups.push(subgroup);
      
      console.log(`[DFDBuilder] Created exported handlers subgroup for ${refName}: ${subgroup.id} with ${handlerNodes.length} handlers`);
    }
  }
}
