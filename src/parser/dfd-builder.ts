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

  /**
   * Build DFD source data from component analysis
   */
  build(analysis: ComponentAnalysis): DFDSourceData {
    console.log('🚚 DFD Builder: Starting build');
    console.log('🚚 DFD Builder: Hooks to process:', analysis.hooks.length);
    console.log('🚚 DFD Builder: Hooks:', analysis.hooks.map(h => ({ name: h.hookName, category: h.category, vars: h.variables })));
    
    // Reset state
    this.nodes = [];
    this.edges = [];
    this.nodeIdCounter = 0;
    this.exportedHandlerSubgroups = [];

    // Create nodes for all elements
    this.createPropsNodes(analysis.props);
    this.createHookNodes(analysis.hooks);
    console.log('🚚 DFD Builder: Nodes after hooks:', this.nodes.length);
    this.createProcessNodes(analysis.processes);
    
    // Create exported handlers subgroups for imperative handle calls
    this.createImperativeHandlerSubgroups(analysis.processes);

    // Build subgraph structure if JSX structure exists
    if (analysis.jsxOutput.structure) {
      const subgraphBuilder = new SubgraphBuilder();
      const rootSubgraph = subgraphBuilder.buildRootSubgraph(analysis.jsxOutput.structure);
      analysis.jsxOutput.rootSubgraph = rootSubgraph;
      console.log('🚚 DFD Builder: Built root subgraph with', rootSubgraph.elements.length, 'elements');
      
      // Collect all nodes from subgraph structure and add to this.nodes
      const subgraphNodes = this.collectElementNodes(rootSubgraph);
      this.nodes.push(...subgraphNodes);
      console.log('🚚 DFD Builder: Added', subgraphNodes.length, 'nodes from subgraph structure');
      
      // Collect conditional subgraphs as nodes
      const conditionalSubgraphNodes = this.collectConditionalSubgraphNodes(rootSubgraph);
      this.nodes.push(...conditionalSubgraphNodes);
      console.log('🚚 DFD Builder: Added', conditionalSubgraphNodes.length, 'conditional subgraph nodes');
      
      // Build display and control visibility edges
      const displayEdges = this.buildDisplayEdges(rootSubgraph, this.nodes);
      this.edges.push(...displayEdges);
      console.log('🚚 DFD Builder: Created', displayEdges.length, 'display/control edges');
      
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
      console.log('🚚 DFD Builder: Created attribute reference edges');
      
      // Build edges from inline handlers to JSX elements
      this.buildInlineHandlerEdges(analysis, elementNodes);
      console.log('🚚 DFD Builder: Created inline handler edges');
      
      // Build edges from processes to context functions
      this.buildProcessToContextFunctionEdges(analysis);
      console.log('🚚 DFD Builder: Created process to context function edges');
      
      // Build edges from processes to custom hook functions
      this.buildProcessToCustomHookFunctionEdges(analysis);
      console.log('🚚 DFD Builder: Created process to custom hook function edges');
      
      // Build edges from data stores to processes (reads)
      this.buildProcessToDataStoreEdges(analysis);
      console.log('🚚 DFD Builder: Created data store to process edges');
      
      // Build edges from processes to data stores (writes)
      this.buildProcessToDataStoreWriteEdges(analysis);
      console.log('🚚 DFD Builder: Created process to data store write edges');
      
      // Build edges from external entity inputs to processes (reads)
      this.buildProcessToExternalEntityEdges(analysis);
      console.log('🚚 DFD Builder: Created external entity to process edges');
      
      // Build edges from processes to function props (calls)
      this.buildProcessToFunctionPropEdges(analysis);
      console.log('🚚 DFD Builder: Created process to function prop edges');
      
      // Build edges from JSX elements with ref to exported handlers subgroups
      this.buildJSXToExportedHandlersEdges(rootSubgraph);
      console.log('🚚 DFD Builder: Created JSX to exported handlers edges');
    }

    console.log('🚚 DFD Builder: Exported handler subgroups:', this.exportedHandlerSubgroups.length);
    if (this.exportedHandlerSubgroups.length > 0) {
      console.log('🚚 DFD Builder: Subgroups:', this.exportedHandlerSubgroups.map(sg => ({ id: sg.id, elements: sg.elements.length })));
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
   * Creates edges when a process calls a function from useContext
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

    console.log('🚚 buildProcessToCustomHookFunctionEdges: Custom hook function nodes:', customHookFunctionNodes.length);

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
   * Applies to both useContext and custom hooks
   */


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
        // For useReducer, check if any state property is referenced
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
        // For simple nodes, check the label directly
        else if (process.references.includes(dataStoreNode.label)) {
          isReferenced = true;
        }
        
        if (isReferenced) {
          // For useReducer, include matched properties in label
          let edgeLabel = 'reads';
          if (dataStoreNode.metadata?.isReducer && (dataStoreNode as any).__matchedProps) {
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
            } else if (process.cleanupProcess.references.includes(dataStoreNode.label)) {
              isReferenced = true;
            }
            
            if (isReferenced) {
              // For useReducer, include matched properties in label
              let edgeLabel = 'reads';
              if (dataStoreNode.metadata?.isReducer && (dataStoreNode as any).__matchedPropsCleanup) {
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

    console.log('🚚 buildProcessToExternalEntityEdges: External entity nodes:', externalEntityNodes.length);
    console.log('🚚 buildProcessToExternalEntityEdges: Processes:', analysis.processes.length);

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

    console.log('🚚 buildProcessToDataStoreWriteEdges: Data store nodes:', dataStoreNodes.length);
    console.log('🚚 buildProcessToDataStoreWriteEdges: Data stores:', dataStoreNodes.map(n => ({ label: n.label, writeVar: n.metadata?.writeVariable })));
    console.log('🚚 buildProcessToDataStoreWriteEdges: Processes:', analysis.processes.length);

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
            // Use "dispatch" label for useReducer, "writes" for others
            const label = dataStoreNode.metadata?.isReducer ? 'dispatch' : 'writes';
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
                // Use "dispatch" label for useReducer, "writes" for others
                const label = dataStoreNode.metadata?.isReducer ? 'dispatch' : 'writes';
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
   * Generate unique node ID
   */
  private generateNodeId(prefix: string): string {
    return `${prefix}_${this.nodeIdCounter++}`;
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
  private createHookNodes(hooks: HookInfo[]): void {
    for (const hook of hooks) {
      // Check if this is a custom hook (no category in registry)
      if (!hook.category) {
        this.createCustomHookNode(hook);
        continue;
      }

      switch (hook.category) {
        case 'context':
          this.createContextNode(hook);
          break;
        case 'data-fetching':
          this.createDataFetchingNode(hook);
          break;
        case 'state':
          this.createStateNode(hook);
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
   * Create unified node for useContext based on type classification
   * Similar to custom hooks, creates a single data-store node with only data values
   * Function values are excluded from the node but stored as write methods
   */
  private createContextNode(hook: HookInfo): void {
    console.log(`🚚 Creating useContext node for: ${hook.hookName}`);
    
    // If no type classification is available, fall back to old behavior
    if (!hook.variableTypes || hook.variableTypes.size === 0) {
      console.log(`🚚 No type classification for ${hook.hookName}, using legacy classification`);
      this.createContextNodeLegacy(hook);
      return;
    }

    // Separate data values from function values
    const dataValues: string[] = [];
    const functionValues: string[] = [];
    
    for (const [varName, varType] of hook.variableTypes.entries()) {
      if (varType === 'function') {
        functionValues.push(varName);
      } else {
        dataValues.push(varName);
      }
    }

    console.log(`🚚 Data values:`, dataValues);
    console.log(`🚚 Function values:`, functionValues);

    // Create individual nodes for each data value (input subgraph)
    for (const dataValue of dataValues) {
      this.nodes.push({
        id: this.generateNodeId('context-data'),
        label: dataValue,
        type: 'external-entity-input',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'context-data',
          hookName: hook.hookName,
          variableName: dataValue,
          subgraph: `${hook.hookName}-input`,
          line: hook.line,
          column: hook.column
        }
      });
      console.log(`🚚 Created context data node: ${dataValue}`);
    }

    // Create individual nodes for each function value (output subgraph)
    for (const functionValue of functionValues) {
      this.nodes.push({
        id: this.generateNodeId('context-function'),
        label: functionValue,
        type: 'external-entity-output',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'context-function',
          hookName: hook.hookName,
          variableName: functionValue,
          subgraph: `${hook.hookName}-output`,
          line: hook.line,
          column: hook.column
        }
      });
      console.log(`🚚 Created context function node: ${functionValue}`);
    }
  }

  /**
   * Legacy createContextNode implementation for contexts without type classification
   * Uses heuristic-based classification (isReadWritePair, isFunctionOnly)
   */
  private createContextNodeLegacy(hook: HookInfo): void {
    // Classify based on pattern
    let nodeType: 'external-entity-input' | 'data-store' | 'external-entity-output';
    
    if (hook.isFunctionOnly) {
      // Write-only functions → external-entity-output
      nodeType = 'external-entity-output';
    } else if (hook.isReadWritePair) {
      // Read-write pair → data-store
      nodeType = 'data-store';
    } else {
      // Read-only → external-entity-input
      nodeType = 'external-entity-input';
    }

    // For read-write pairs, create a single node
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      this.nodes.push({
        id: this.generateNodeId('context'),
        label: readVar,
        type: nodeType,
        metadata: {
          category: 'context',
          hookName: hook.hookName,
          isReadWritePair: true,
          isFunctionOnly: hook.isFunctionOnly,
          readVariable: readVar,
          writeVariable: writeVar
        }
      });
    } else {
      // For other cases, create individual nodes
      for (const variable of hook.variables) {
        this.nodes.push({
          id: this.generateNodeId('context'),
          label: variable,
          type: nodeType,
          metadata: {
            category: 'context',
            hookName: hook.hookName,
            isReadWritePair: hook.isReadWritePair,
            isFunctionOnly: hook.isFunctionOnly
          }
        });
      }
    }
  }

  /**
   * Create unified node for custom hooks (data-store)
   * Similar to useState, creates a single node for the hook with only data values
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
  private createStateNode(hook: HookInfo): void {
    // Skip useRef - refs don't participate in data flow
    if (hook.hookName === 'useRef') {
      console.log(`[DFDBuilder] Skipping useRef: ${hook.variables.join(', ')}`);
      return;
    }
    
    // Special handling for useReducer - always treat as read-write pair
    if (hook.hookName === 'useReducer' && hook.variables.length === 2) {
      const [stateVar, dispatchVar] = hook.variables;
      console.log(`[DFDBuilder] Creating useReducer node: stateVar=${stateVar}, dispatchVar=${dispatchVar}, reducerName=${hook.reducerName}, stateProperties=`, hook.stateProperties);
      
      // Use reducer function name as label (e.g., "counterReducer")
      // If not available, fall back to state variable name
      const label = hook.reducerName || stateVar;
      console.log(`[DFDBuilder] useReducer label: ${label}`);
      
      this.nodes.push({
        id: this.generateNodeId('state'),
        label,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'state',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: stateVar,
          writeVariable: dispatchVar,
          stateProperties: hook.stateProperties,
          reducerName: hook.reducerName,
          isReducer: true,
          line: hook.line,
          column: hook.column
        }
      });
      return;
    }

    // For read-write pairs (e.g., [count, setCount]), create a single node
    // using the read variable name
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      console.log(`[DFDBuilder] Creating state node: ${readVar}, line: ${hook.line}, column: ${hook.column}`);
      this.nodes.push({
        id: this.generateNodeId('state'),
        label: readVar,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'state',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: readVar,
          writeVariable: writeVar,
          line: hook.line,
          column: hook.column
        }
      });
    } else {
      // For other cases, create individual nodes
      for (const variable of hook.variables) {
        this.nodes.push({
          id: this.generateNodeId('state'),
          label: variable,
          type: 'data-store',
          line: hook.line,
          column: hook.column,
          metadata: {
            category: 'state',
            hookName: hook.hookName,
            isReadWritePair: hook.isReadWritePair,
            line: hook.line,
            column: hook.column
          }
        });
      }
    }
  }

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
      
      // Check if this is useImperativeHandle with exported handlers
      if (process.type === 'useImperativeHandle' && process.exportedHandlers && process.exportedHandlers.length > 0) {
        console.log(`[DFDBuilder] Creating useImperativeHandle with ${process.exportedHandlers.length} exported handlers`);
        
        // Don't create parent useImperativeHandle process node - only create the subgroup
        // The exported handlers will be shown in the subgroup instead
        
        // Create subgroup for exported handlers
        const subgroup = this.createExportedHandlersSubgroup(process, processNodeId);
        
        // Store subgroup in a temporary array (will be added to DFDSourceData later)
        if (!this.exportedHandlerSubgroups) {
          this.exportedHandlerSubgroups = [];
        }
        this.exportedHandlerSubgroups.push(subgroup);
        
        console.log(`[DFDBuilder] Created exported handlers subgroup: ${subgroup.id}`);
      } else {
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
      }

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
   * Create subgroup for exported handlers from useImperativeHandle
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
   * Create node for an exported handler from useImperativeHandle
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
    
    console.log(`🚚 buildInlineHandlerEdges: Found ${inlineHandlers.length} inline handlers`);
    
    for (const handler of inlineHandlers) {
      // Find the JSX element node by position
      const elementNode = elementNodes.find(
        n => n.line === handler.usedInJSXElement?.line && 
             n.column === handler.usedInJSXElement?.column
      );
      
      if (!elementNode) {
        console.log(`🚚   ⚠️ JSX element not found for inline handler: ${handler.name} at line ${handler.usedInJSXElement?.line}, column ${handler.usedInJSXElement?.column}`);
        continue;
      }
      
      const attributeName = handler.usedInJSXElement?.attributeName || 'onClick';
      
      // Create edges from JSX element to each referenced variable (setter, context function, etc.)
      for (const varName of handler.references) {
        const targetNode = this.findNodeByVariable(varName, this.nodes);
        
        if (!targetNode) {
          console.log(`🚚   ⚠️ Target node not found for variable: ${varName}`);
          continue;
        }
        
        // Classify the variable type
        const typeClassifier = new TypeClassifier();
        const varType = this.classifyVariable(varName, typeClassifier, targetNode);
        
        if (varType === 'function') {
          // Function variable: create edge from element to function
          console.log(`🚚   ✅ Creating edge from ${elementNode.id} to ${targetNode.id} (${attributeName})`);
          this.edges.push({
            from: elementNode.id,
            to: targetNode.id,
            label: attributeName
          });
        }
        // For data variables, we don't create edges here (they're already handled by display edges)
      }
    }
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

    console.log(`🚚 buildAttributeReferenceEdges: Processing element ${elementNode.label}, attributes:`, element.attributeReferences.map(a => `${a.attributeName}=${a.referencedVariable}`));

    for (const attrRef of element.attributeReferences) {
      const varName = attrRef.referencedVariable;
      
      // Skip constants or undefined variables
      if (!varName || varName.startsWith('"') || varName.startsWith("'") || varName === 'undefined') {
        continue;
      }

      // Find the source node for this variable
      const sourceNode = this.findNodeByVariable(varName, nodes);
      
      if (!sourceNode) {
        console.log(`🚚   ⚠️ Source node not found for variable: ${varName}`);
        continue;
      }

      // Classify the variable type
      const varType = this.classifyVariable(varName, typeClassifier, sourceNode);
      console.log(`🚚   Variable ${varName} classified as: ${varType}, sourceNode type: ${sourceNode.type}`);
      
      // Create edge based on variable type
      if (varType === 'function') {
        // Function variable: create edge from element to function (element triggers function)
        console.log(`🚚   ✅ Creating edge from ${elementNode.id} to ${sourceNode.id} (${attrRef.attributeName})`);
        edges.push({
          from: elementNode.id,
          to: sourceNode.id,
          label: attrRef.attributeName
        });
      } else {
        // Data variable: create edge from data to element (data binds to element attribute)
        // For useReducer, add property name to label
        let finalLabel = 'binds';
        if (sourceNode.metadata?.isReducer && sourceNode.metadata?.stateProperties) {
          const stateProps = sourceNode.metadata.stateProperties as string[];
          if (stateProps.includes(varName)) {
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

    console.log('🚚 buildDisplayEdges: Starting');

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
            // For useReducer, add property name to label
            let finalLabel = edgeLabel;
            if (sourceNode.metadata?.isReducer && sourceNode.metadata?.stateProperties) {
              const stateProps = sourceNode.metadata.stateProperties as string[];
              if (stateProps.includes(varName)) {
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
          // For useReducer, add property name to label
          let finalLabel = 'display';
          if (sourceNode.metadata?.isReducer && sourceNode.metadata?.stateProperties) {
            const stateProps = sourceNode.metadata.stateProperties as string[];
            if (stateProps.includes(varName)) {
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

    // For useReducer, check if this is a state property
    node = nodes.find(n => 
      n.metadata?.isReducer && 
      n.metadata?.stateProperties &&
      (n.metadata.stateProperties as string[]).includes(variableName)
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found reducer node for state property "${variableName}":`, node.label);
      return node;
    }

    // For useReducer, check if this is the state variable itself
    node = nodes.find(n => 
      n.metadata?.isReducer && 
      n.metadata?.readVariable === variableName
    );
    if (node) {
      console.log(`🔍 findNodeByVariableName: Found reducer node for state variable "${variableName}":`, node.label);
      return node;
    }

    // For custom hooks and useContext, check if this is one of the data values
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
    console.log('🚚 buildProcessToFunctionPropEdges: All prop nodes:', allPropNodes.map(n => ({ 
      label: n.label, 
      isFunctionType: n.metadata?.isFunctionType 
    })));
    
    // Find all function props (props with isFunction metadata or output props)
    const functionPropNodes = this.nodes.filter(
      node => node.type === 'external-entity-output' && 
              node.metadata?.category === 'prop'
    );
    
    console.log('🚚 buildProcessToFunctionPropEdges: Function prop nodes (output):', functionPropNodes.length);
    console.log('🚚 buildProcessToFunctionPropEdges: Function props:', functionPropNodes.map(n => n.label));
    
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
