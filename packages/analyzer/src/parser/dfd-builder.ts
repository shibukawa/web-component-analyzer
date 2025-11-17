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
import { getLibraryHandlerRegistry, resetLibraryHandlerRegistry } from '../third-party/index.js';
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
  private exportedHandlerSubgroups: DFDSubgraph[] = [];
  private currentAnalysis: ComponentAnalysis | null = null;
  private verbose: boolean = false; // Set to true to enable detailed logging

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
    
    // Reset library handlers for new component analysis
    resetLibraryHandlerRegistry();
    
    // Reset processor registry (resets stateful processors like Next.js)
    const processorRegistry = getProcessorRegistry();
    processorRegistry.reset();
    
    // Reset state
    this.nodes = [];
    this.edges = [];
    this.nodeIdCounter = 0;
    this.exportedHandlerSubgroups = [];

    // Create nodes for all elements
    this.createPropsNodes(analysis.props);
    this.createHookNodes(analysis.hooks);
    this.log('🚚 DFD Builder: Nodes after hooks:', this.nodes.length);
    this.createProcessNodes(analysis.processes);
    
    // Create exported handlers subgroups for imperative handle calls
    this.createImperativeHandlerSubgroups(analysis.processes);

    // Build subgraph structure if JSX structure exists
    if (analysis.jsxOutput.structure) {
      const subgraphBuilder = new SubgraphBuilder();
      const rootSubgraph = subgraphBuilder.buildRootSubgraph(analysis.jsxOutput.structure);
      analysis.jsxOutput.rootSubgraph = rootSubgraph;
      this.log('🚚 DFD Builder: Built root subgraph with', rootSubgraph.elements.length, 'elements');
      
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
      
      // Build edges from props to states (initial values)
      this.buildPropToStateInitialValueEdges(analysis);
      this.log('🚚 DFD Builder: Created prop to state initial value edges');
      
      // Build edges from data stores to processes (reads)
      this.buildProcessToDataStoreEdges(analysis);
      this.log('🚚 DFD Builder: Created data store to process edges');
      
      // Build edges from processes to data stores (writes)
      this.buildProcessToDataStoreWriteEdges(analysis);
      this.log('🚚 DFD Builder: Created process to data store write edges');
      
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
    
    const stateNodes = this.nodes.filter(
      node => node.type === 'data-store' && node.metadata?.category === 'state'
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
   * Create nodes for hooks based on their category
   */
  /**
   * Create nodes for hooks based on their category
   */
  private createHookNodes(hooks: HookInfo[]): void {
    for (const hook of hooks) {
      // Check if this hook should be processed by a registered processor
      const handled = this.processHookWithRegistry(hook);
      if (handled) {
        continue;
      }

      // Check if this hook has library adapter mappings
      const enrichedHook = hook as any;
      if (enrichedHook.libraryName && enrichedHook.returnValueMappings) {
        console.log(`🚚 Processing library hook: ${hook.hookName} from ${enrichedHook.libraryName}`);
        this.buildNodesFromLibraryHook(hook);
        continue;
      }

      // Check if this is a custom hook (no category in registry)
      if (!hook.category) {
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
   * Build nodes from library hook with return value mappings
   * Creates nodes based on the library adapter's DFD element type mappings
   */
  private buildNodesFromLibraryHook(hook: HookInfo): void {
    // Check if this is an enriched hook with library mappings
    const enrichedHook = hook as any;
    if (!enrichedHook.libraryName || !enrichedHook.returnValueMappings) {
      console.log(`🚚 ⚠️ Skipping hook ${hook.hookName} - no library mappings`);
      console.log(`🚚    libraryName: ${enrichedHook.libraryName}`);
      console.log(`🚚    returnValueMappings: ${enrichedHook.returnValueMappings}`);
      return;
    }

    console.log(`🚚 ========================================`);
    console.log(`🚚 Building nodes from library hook: ${hook.hookName} (${enrichedHook.libraryName})`);
    console.log(`🚚 Return value mappings:`, enrichedHook.returnValueMappings);
    console.log(`🚚 Hook arguments:`, hook.arguments);
    console.log(`🚚 Hook dependencies:`, hook.dependencies);
    console.log(`🚚 Hook variables:`, hook.variables);

    // Check if this is a data fetching hook and create Server node
    const isDataFetchingHook = this.isDataFetchingHook(hook.hookName);
    console.log(`🚚 Is data fetching hook: ${isDataFetchingHook}`);
    let serverNodeId: string | null = null;
    
    if (isDataFetchingHook) {
      // Always create a Server node for data fetching hooks
      let endpoint: string | undefined;
      
      if (hook.arguments && hook.arguments.length > 0) {
        console.log(`🚚 Extracting API endpoint from arguments:`, hook.arguments);
        endpoint = this.extractAPIEndpoint(hook.arguments);
      }
      
      // Create Server node with endpoint if available, otherwise just "Server"
      if (endpoint) {
        console.log(`🚚 ✅ Creating Server node with endpoint: ${endpoint}`);
        serverNodeId = this.createServerNode(endpoint, hook.line, hook.column);
      } else {
        console.log(`🚚 ✅ Creating Server node without specific endpoint (dynamic URL)`);
        serverNodeId = this.createServerNode(undefined, hook.line, hook.column);
      }
    } else {
      console.log(`🚚 ⚠️ Not a data fetching hook, no Server node needed`);
    }

    // Check if there's a specialized handler for this library hook
    const registry = getLibraryHandlerRegistry();
    const handler = registry.findHandler(hook.hookName, enrichedHook.libraryName);
    
    if (handler) {
      console.log(`🚚 Using specialized handler for ${hook.hookName} from ${enrichedHook.libraryName}`);
      
      // Use the handler to create nodes and edges
      const result = handler.createNodes(
        hook,
        enrichedHook,
        serverNodeId,
        (prefix: string) => this.generateNodeId(prefix)
      );
      
      // Add the created nodes and edges
      this.nodes.push(...result.nodes);
      this.edges.push(...result.edges);
      
      // For SWR hooks, check if the first argument is a variable and create edge
      if (enrichedHook.libraryName === 'swr' && hook.argumentIdentifiers && hook.argumentIdentifiers.length > 0) {
        const firstArgId = hook.argumentIdentifiers[0];
        const hookNodeId = result.nodes[0]?.id; // The main hook node
        
        if (hookNodeId) {
          console.log(`🚚 ========================================`);
          console.log(`🚚 Processing first argument: ${firstArgId}`);
          console.log(`🚚 Looking for existing node for first argument: ${firstArgId}`);
          
          // Find any existing node with this variable name
          const sourceNode = this.findNodeByVariable(firstArgId, this.nodes);
          
          if (sourceNode) {
            console.log(`🚚 ✅ Found existing node: ${sourceNode.id}: ${sourceNode.label} (${sourceNode.type})`);
            
            // Check if edge already exists
            const existingEdge = this.edges.find(
              e => e.from === sourceNode.id && e.to === hookNodeId && e.label === 'provides key'
            );
            
            if (!existingEdge) {
              this.edges.push({
                from: sourceNode.id,
                to: hookNodeId,
                label: 'provides key'
              });
              console.log(`🚚 ✅ Created edge from ${sourceNode.label} (${sourceNode.id}) to ${hook.hookName} (${hookNodeId}) - provides key`);
            } else {
              console.log(`🚚 ⚠️ Edge already exists, skipping duplicate`);
            }
          } else {
            console.log(`🚚 ⚠️ No existing node found for: ${firstArgId}`);
          }
          console.log(`🚚 ========================================`);
        }
      }
      
      console.log(`🚚 ========================================`);
      return;
    }

    // For other library hooks, create individual nodes (existing behavior)
    for (const [variableName, mapping] of enrichedHook.returnValueMappings.entries()) {
      const { dfdElementType, metadata } = mapping;
      
      console.log(`🚚   Creating ${dfdElementType} node for variable: ${variableName}`);
      
      // Generate appropriate node ID prefix based on element type
      let nodeIdPrefix: string;
      switch (dfdElementType) {
        case 'external-entity-input':
          nodeIdPrefix = 'library_input';
          break;
        case 'data-store':
          nodeIdPrefix = 'library_store';
          break;
        case 'process':
          nodeIdPrefix = 'library_process';
          break;
        default:
          nodeIdPrefix = 'library_node';
      }

      // Create the node
      const node: DFDNode = {
        id: this.generateNodeId(nodeIdPrefix),
        label: variableName,
        type: dfdElementType,
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'library-hook',
          hookName: hook.hookName,
          libraryName: enrichedHook.libraryName,
          variableName,
          line: hook.line,
          column: hook.column,
          ...this.applyLibraryMetadata(metadata)
        }
      };

      this.nodes.push(node);
      console.log(`🚚   ✅ Created ${dfdElementType} node: ${variableName}`);
    }
  }

  /**
   * Apply library-specific metadata to node metadata
   * Transforms library adapter metadata into node metadata format
   */
  private applyLibraryMetadata(adapterMetadata?: Record<string, any>): Record<string, any> {
    if (!adapterMetadata) {
      return {};
    }

    const nodeMetadata: Record<string, any> = {};

    // Map common metadata fields
    if (adapterMetadata.isLoading !== undefined) {
      nodeMetadata.isLoading = adapterMetadata.isLoading;
    }
    if (adapterMetadata.isError !== undefined) {
      nodeMetadata.isError = adapterMetadata.isError;
    }
    if (adapterMetadata.isMutation !== undefined) {
      nodeMetadata.isMutation = adapterMetadata.isMutation;
    }
    if (adapterMetadata.isRefetch !== undefined) {
      nodeMetadata.isRefetch = adapterMetadata.isRefetch;
    }

    // Copy any other metadata fields
    for (const [key, value] of Object.entries(adapterMetadata)) {
      if (!nodeMetadata.hasOwnProperty(key)) {
        nodeMetadata[key] = value;
      }
    }

    return nodeMetadata;
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

      // Classify the variable type
      const varType = this.classifyVariable(varName, typeClassifier, sourceNode);
      console.log(`🚚   Variable ${varName} classified as: ${varType}`);
      
      // Create edge based on variable type
      if (varType === 'function') {
        // Check if edge already exists
        const existingEdge = edges.find(
          e => e.from === elementNode.id && e.to === sourceNode.id && e.label === attrRef.attributeName
        );
        
        if (existingEdge) {
          console.log(`🚚   ⚠️ Edge already exists from ${elementNode.id} to ${sourceNode.id} (${attrRef.attributeName}), skipping duplicate`);
        } else {
          // Function variable: create edge from element to function (element triggers function)
          console.log(`🚚   ✅ Creating edge from ${elementNode.id} to ${sourceNode.id} (${attrRef.attributeName})`);
          edges.push({
            from: elementNode.id,
            to: sourceNode.id,
            label: attrRef.attributeName
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

    // Use TypeClassifier if available
    if (sourceNode.metadata?.typeString) {
      const isFunction = typeClassifier.isFunction(sourceNode.metadata.typeString as string);
      return isFunction ? 'function' : 'data';
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
