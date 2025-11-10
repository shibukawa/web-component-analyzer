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
  JSXInfo
} from './types';

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

    // Create nodes for all elements
    this.createPropsNodes(analysis.props);
    this.createHookNodes(analysis.hooks);
    console.log('🚚 DFD Builder: Nodes after hooks:', this.nodes.length);
    this.createProcessNodes(analysis.processes);
    this.createJSXOutputNode(analysis.jsxOutput);

    // Infer edges based on data flow
    this.inferEdges(analysis);

    return {
      nodes: this.nodes,
      edges: this.edges
    };
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
      // Determine if this prop is a function type (event handler)
      const isFunctionType = this.isFunctionTypeProp(prop);
      
      this.nodes.push({
        id: this.generateNodeId('prop'),
        label: prop.name,
        type: isFunctionType ? 'external-entity-output' : 'external-entity-input',
        metadata: {
          category: 'prop',
          dataType: prop.type,
          isDestructured: prop.isDestructured,
          isFunctionType,
          typeString: prop.typeString // Include full TypeScript type string
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
    // Use type resolution result if available (from TypeResolver)
    if (prop.isFunction !== undefined) {
      return prop.isFunction;
    }

    // Fallback to heuristics if type information is not available
    
    // Check for common event handler naming patterns first
    const name = prop.name.toLowerCase();
    if (name.startsWith('on')) {
      return true;
    }

    // Check type information if available
    if (!prop.type) {
      return false;
    }

    const type = prop.type.toLowerCase();
    
    // Check for explicit function type
    if (type === 'function') {
      return true;
    }

    // Check for function-like type annotations
    if (type.includes('=>') || type.includes('function')) {
      return true;
    }

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

    // Create a single data-store node with only data values
    if (dataValues.length > 0) {
      const label = dataValues.join(', ');
      this.nodes.push({
        id: this.generateNodeId('context'),
        label,
        type: 'data-store',
        metadata: {
          category: 'context',
          hookName: hook.hookName,
          dataValues,
          writeMethods: functionValues, // Store function names for edge inference
          hasTypeClassification: true
        }
      });
      console.log(`🚚 Created data-store node: ${label}`);
    }

    // If there are only functions and no data, this is a write-only context
    // Don't create a node for write-only contexts (functions will be used for edge inference)
    if (dataValues.length === 0 && functionValues.length > 0) {
      console.log(`🚚 Write-only context (no node created), functions:`, functionValues);
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
        metadata: {
          category: 'custom-hook',
          hookName: hook.hookName,
          variables: hook.variables,
          writeMethods: []
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

    // Only create node if there are data values
    if (dataValues.length > 0) {
      const label = dataValues.join(', ');
      this.nodes.push({
        id: this.generateNodeId('custom_hook'),
        label,
        type: 'data-store',
        metadata: {
          category: 'custom-hook',
          hookName: hook.hookName,
          variables: dataValues,
          writeMethods: functionValues // Store function names for edge inference
        }
      });
    } else {
      console.log(`🚚 No data values for ${hook.hookName}, skipping node creation`);
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
    // Special handling for useReducer - always treat as read-write pair
    if (hook.hookName === 'useReducer' && hook.variables.length === 2) {
      const [stateVar, dispatchVar] = hook.variables;
      
      // If we have state properties from TypeResolver, use them in the label
      const label = hook.stateProperties && hook.stateProperties.length > 0
        ? hook.stateProperties.join(', ')
        : stateVar;
      
      this.nodes.push({
        id: this.generateNodeId('state'),
        label,
        type: 'data-store',
        metadata: {
          category: 'state',
          hookName: hook.hookName,
          isReadWritePair: true,
          readVariable: stateVar,
          writeVariable: dispatchVar,
          stateProperties: hook.stateProperties,
          isReducer: true
        }
      });
      return;
    }

    // For read-write pairs (e.g., [count, setCount]), create a single node
    // using the read variable name
    if (hook.isReadWritePair && hook.variables.length === 2) {
      const [readVar, writeVar] = hook.variables;
      this.nodes.push({
        id: this.generateNodeId('state'),
        label: readVar,
        type: 'data-store',
        metadata: {
          category: 'state',
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
          id: this.generateNodeId('state'),
          label: variable,
          type: 'data-store',
          metadata: {
            category: 'state',
            hookName: hook.hookName,
            isReadWritePair: hook.isReadWritePair
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
      const processNodeId = this.generateNodeId('process');
      this.nodes.push({
        id: processNodeId,
        label: process.name,
        type: 'process',
        metadata: {
          processType: process.type,
          dependencies: process.dependencies,
          references: process.references
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
          metadata: {
            processType: process.cleanupProcess.type,
            references: process.cleanupProcess.references,
            parentProcess: process.name
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
   */
  private createExternalCallNodes(process: ProcessInfo, processNodeId: string): void {
    for (const externalCall of process.externalCalls) {
      const externalCallNodeId = this.generateNodeId('external_call');
      this.nodes.push({
        id: externalCallNodeId,
        label: externalCall.functionName,
        type: 'external-entity-output',
        metadata: {
          category: 'external-call',
          calledBy: process.name,
          arguments: externalCall.arguments
        }
      });

      // Create edge from process to external call
      this.edges.push({
        from: processNodeId,
        to: externalCallNodeId,
        label: 'calls'
      });
    }
  }

  /**
   * Create node for JSX output (external-entity-output)
   */
  private createJSXOutputNode(jsxInfo: JSXInfo): void {
    if (jsxInfo.simplified) {
      this.nodes.push({
        id: this.generateNodeId('jsx'),
        label: 'JSX Output',
        type: 'external-entity-output',
        metadata: {
          category: 'jsx',
          simplified: jsxInfo.simplified,
          placeholders: jsxInfo.placeholders
        }
      });
    }
  }

  /**
   * Infer edges based on data flow patterns
   */
  private inferEdges(analysis: ComponentAnalysis): void {
    // Infer edges from external entities to processes
    this.inferExternalEntitiesToProcesses(analysis);

    // Infer edges from processes to data stores
    this.inferProcessesToDataStores(analysis);

    // Infer edges from data stores to processes
    this.inferDataStoresToProcesses(analysis);

    // Infer edges from data stores to JSX output
    this.inferDataStoresToJSXOutput(analysis);

    // Infer edges from processes to external outputs
    this.inferProcessesToExternalOutputs(analysis);

    // Infer edges for inline callback processes
    this.inferInlineCallbackEdges(analysis);

    // Infer edges from JSX to custom hook functions (direct references)
    this.inferJSXToCustomHookFunctions(analysis);
  }

  /**
   * Infer edges from external entities (props, context, data fetching, routing, server actions) to processes
   */
  /**
   * Infer edges from external entities (props, context, data fetching, routing, server actions) to processes
   */
  private inferExternalEntitiesToProcesses(analysis: ComponentAnalysis): void {
    const externalEntityNodes = this.nodes.filter(
      node => node.type === 'external-entity-input'
    );

    for (const process of analysis.processes) {
      const processNode = this.findNodeByLabel(process.name, 'process');
      if (!processNode) {
        continue;
      }

      // Check if process references any external entity
      for (const externalNode of externalEntityNodes) {
        if (process.references.includes(externalNode.label)) {
          // Create data-flow edge for value props and other external inputs
          this.edges.push({
            from: externalNode.id,
            to: processNode.id,
            label: externalNode.metadata?.category === 'prop' ? 'data-flow' : 'reads'
          });
        }
      }
    }
  }

  /**
   * Infer edges from processes to data stores
   * (when a process calls a state setter function or context function)
   */
  private inferProcessesToDataStores(analysis: ComponentAnalysis): void {
    const dataStoreNodes = this.nodes.filter(
      node => node.type === 'data-store'
    );

    for (const process of analysis.processes) {
      // Skip inline callbacks - they are handled separately in inferInlineCallbackEdges
      if (process.name.startsWith('inline_')) {
        continue;
      }

      const processNode = this.findNodeByLabel(process.name, 'process');
      if (!processNode) {
        continue;
      }

      // Check if process references any setter functions
      for (const dataStoreNode of dataStoreNodes) {
        // For read-write pairs (including useReducer), check if the write variable is referenced
        if (dataStoreNode.metadata?.isReadWritePair && dataStoreNode.metadata?.writeVariable) {
          if (process.references.includes(dataStoreNode.metadata.writeVariable)) {
            this.edges.push({
              from: processNode.id,
              to: dataStoreNode.id,
              label: 'writes'
            });
          }
        }
        // For custom hooks, check if any write methods are referenced
        else if (dataStoreNode.metadata?.category === 'custom-hook' && dataStoreNode.metadata?.writeMethods) {
          const writeMethods = dataStoreNode.metadata.writeMethods as string[];
          for (const writeMethod of writeMethods) {
            if (process.references.includes(writeMethod)) {
              this.edges.push({
                from: processNode.id,
                to: dataStoreNode.id,
                label: 'writes'
              });
              break; // Only create one edge per process-datastore pair
            }
          }
        }
        // For useContext with type classification, check if any write methods are referenced
        else if (dataStoreNode.metadata?.category === 'context' && dataStoreNode.metadata?.writeMethods) {
          const writeMethods = dataStoreNode.metadata.writeMethods as string[];
          for (const writeMethod of writeMethods) {
            if (process.references.includes(writeMethod)) {
              this.edges.push({
                from: processNode.id,
                to: dataStoreNode.id,
                label: 'writes'
              });
              break; // Only create one edge per process-datastore pair
            }
          }
        }
        else {
          // For non-paired variables, use the standard setter name pattern
          const setterName = this.getSetterName(dataStoreNode.label);
          if (process.references.includes(setterName)) {
            this.edges.push({
              from: processNode.id,
              to: dataStoreNode.id,
              label: 'writes'
            });
          }
        }
      }
    }
  }

  /**
   * Infer edges from data stores to processes
   * (when a process reads from a state variable)
   */
  private inferDataStoresToProcesses(analysis: ComponentAnalysis): void {
    const dataStoreNodes = this.nodes.filter(
      node => node.type === 'data-store'
    );

    for (const process of analysis.processes) {
      const processNode = this.findNodeByLabel(process.name, 'process');
      if (!processNode) {
        continue;
      }

      // Combine references and dependencies for checking
      const allReferences = [
        ...process.references,
        ...(process.dependencies || [])
      ];

      // Check if process references any state variables
      for (const dataStoreNode of dataStoreNodes) {
        // For useReducer, check if any state property or state variable is referenced
        if (dataStoreNode.metadata?.isReducer && dataStoreNode.metadata?.readVariable) {
          const stateProperties = dataStoreNode.metadata.stateProperties as string[] || [];
          const stateVariable = dataStoreNode.metadata.readVariable as string;
          
          // Check if state variable itself is referenced (e.g., state.count)
          const hasStateVarReference = stateVariable && allReferences.includes(stateVariable);
          // Check if any state property is referenced directly
          const hasPropertyReference = stateProperties.length > 0 && 
                                       stateProperties.some(prop => allReferences.includes(prop));
          
          if (hasStateVarReference || hasPropertyReference) {
            this.edges.push({
              from: dataStoreNode.id,
              to: processNode.id,
              label: 'reads'
            });
          }
        }
        // For unified nodes (custom hooks, useContext), check if any data value is referenced
        else if (dataStoreNode.metadata?.dataValues) {
          const dataValues = dataStoreNode.metadata.dataValues as string[];
          const hasReference = dataValues.some(value => allReferences.includes(value));
          if (hasReference) {
            this.edges.push({
              from: dataStoreNode.id,
              to: processNode.id,
              label: 'reads'
            });
          }
        }
        // For simple nodes, check the label directly
        else if (allReferences.includes(dataStoreNode.label)) {
          this.edges.push({
            from: dataStoreNode.id,
            to: processNode.id,
            label: 'reads'
          });
        }
      }
    }
  }

  /**
   * Infer edges from data stores to JSX output
   * (when JSX displays state variables)
   */
  private inferDataStoresToJSXOutput(analysis: ComponentAnalysis): void {
    const dataStoreNodes = this.nodes.filter(
      node => node.type === 'data-store'
    );

    const jsxNode = this.nodes.find(
      node => node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );

    if (!jsxNode) {
      return;
    }

    // Check if JSX placeholders reference any state variables
    const jsxInfo = analysis.jsxOutput;
    for (const dataStoreNode of dataStoreNodes) {
      let isReferencedInJSX = false;
      
      // For useReducer, check if any state property or state variable is referenced
      if (dataStoreNode.metadata?.isReducer && dataStoreNode.metadata?.readVariable) {
        const stateProperties = dataStoreNode.metadata.stateProperties as string[] || [];
        const stateVariable = dataStoreNode.metadata.readVariable as string;
        
        isReferencedInJSX = jsxInfo.placeholders.some(placeholder => {
          // Check if state variable itself is referenced
          const hasStateVarReference = stateVariable && placeholder.variables.includes(stateVariable);
          // Check if any state property is referenced
          const hasPropertyReference = stateProperties.length > 0 &&
                                       stateProperties.some(prop => placeholder.variables.includes(prop));
          return hasStateVarReference || hasPropertyReference;
        });
      }
      // For unified nodes (custom hooks, useContext), check if any data value is referenced
      else if (dataStoreNode.metadata?.dataValues) {
        const dataValues = dataStoreNode.metadata.dataValues as string[];
        isReferencedInJSX = jsxInfo.placeholders.some(
          placeholder => dataValues.some(value => placeholder.variables.includes(value))
        );
      }
      // For simple nodes, check the label directly
      else {
        isReferencedInJSX = jsxInfo.placeholders.some(
          placeholder => placeholder.variables.includes(dataStoreNode.label)
        );
      }

      if (isReferencedInJSX) {
        this.edges.push({
          from: dataStoreNode.id,
          to: jsxNode.id,
          label: 'displays'
        });
      }
    }
  }

  /**
   * Infer edges from processes to external outputs
   * (JSX output and function-type props)
   * Note: External function call edges are created in createExternalCallNodes
   */
  /**
   * Infer edges from processes to external outputs
   * (JSX output and function-type props)
   * Note: External function call edges are created in createExternalCallNodes
   */
  /**
   * Infer edges from processes to external outputs
   * (JSX output and function-type props)
   * Note: External function call edges are created in createExternalCallNodes
   */
  private inferProcessesToExternalOutputs(analysis: ComponentAnalysis): void {
    const jsxNode = this.nodes.find(
      node => node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );

    // Connect processes to JSX output if JSX references process results
    if (jsxNode) {
      for (const process of analysis.processes) {
        const processNode = this.findNodeByLabel(process.name, 'process');
        if (!processNode) {
          continue;
        }

        // Check if JSX placeholders reference this process
        const jsxInfo = analysis.jsxOutput;
        const referencesProcess = jsxInfo.placeholders.some(
          placeholder => placeholder.variables.includes(process.name)
        );

        if (referencesProcess) {
          this.edges.push({
            from: processNode.id,
            to: jsxNode.id,
            label: 'outputs to'
          });
        }
      }
    }

    // Connect processes to function-type props (event handlers)
    for (const process of analysis.processes) {
      const processNode = this.findNodeByLabel(process.name, 'process');
      if (!processNode) {
        continue;
      }

      const functionPropNodes = this.nodes.filter(
        node => node.type === 'external-entity-output' && 
                node.metadata?.category === 'prop' &&
                node.metadata?.isFunctionType
      );

      for (const propNode of functionPropNodes) {
        // Check if process references this prop
        if (process.references.includes(propNode.label)) {
          // Use 'calls' label for consistency with external function calls
          this.edges.push({
            from: processNode.id,
            to: propNode.id,
            label: 'calls'
          });
        }
      }
    }
  }

  /**
   * Find node by label and type
   */
  private findNodeByLabel(label: string, type: string): DFDNode | undefined {
    return this.nodes.find(node => node.label === label && node.type === type);
  }

  /**
   * Get setter name for a state variable
   * e.g., "count" → "setCount"
   */
  private getSetterName(variableName: string): string {
    return `set${variableName.charAt(0).toUpperCase()}${variableName.slice(1)}`;
  }

  /**
   * Infer edges for inline callback processes
   * Creates edges: JSX → inline callback → data store
   */
  private inferInlineCallbackEdges(analysis: ComponentAnalysis): void {
    const jsxNode = this.nodes.find(
      node => node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );

    if (!jsxNode) {
      return;
    }

    const dataStoreNodes = this.nodes.filter(
      node => node.type === 'data-store'
    );

    // Find all inline callback process nodes
    const inlineCallbackNodes = this.nodes.filter(
      node => node.type === 'process' && node.label.startsWith('inline_')
    );

    for (const inlineCallbackNode of inlineCallbackNodes) {
      // Create edge from JSX output to inline callback process
      this.edges.push({
        from: jsxNode.id,
        to: inlineCallbackNode.id,
        label: 'triggers'
      });

      // Create edges from inline callback to data stores (when calling setters)
      const references = inlineCallbackNode.metadata?.references || [];
      
      for (const dataStoreNode of dataStoreNodes) {
        // For read-write pairs (including useReducer), check if the write variable is referenced
        if (dataStoreNode.metadata?.isReadWritePair && dataStoreNode.metadata?.writeVariable) {
          if (references.includes(dataStoreNode.metadata.writeVariable)) {
            this.edges.push({
              from: inlineCallbackNode.id,
              to: dataStoreNode.id,
              label: 'writes'
            });
          }
        }
        // For custom hooks, check if any write methods are referenced
        else if (dataStoreNode.metadata?.category === 'custom-hook' && dataStoreNode.metadata?.writeMethods) {
          const writeMethods = dataStoreNode.metadata.writeMethods as string[];
          for (const writeMethod of writeMethods) {
            if (references.includes(writeMethod)) {
              this.edges.push({
                from: inlineCallbackNode.id,
                to: dataStoreNode.id,
                label: 'writes'
              });
              break; // Only create one edge per inline callback-datastore pair
            }
          }
        }
        else {
          // For non-paired variables, use the standard setter name pattern
          const setterName = this.getSetterName(dataStoreNode.label);
          if (references.includes(setterName)) {
            this.edges.push({
              from: inlineCallbackNode.id,
              to: dataStoreNode.id,
              label: 'writes'
            });
          }
        }
      }
    }
  }

  /**
   * Infer edges from JSX output to custom hook functions (direct references)
   * Handles cases like onClick={increment} where increment is a custom hook function
   */
  private inferJSXToCustomHookFunctions(analysis: ComponentAnalysis): void {
    const jsxNode = this.nodes.find(
      node => node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );

    if (!jsxNode) {
      return;
    }

    // Get JSX output info to find referenced functions
    const jsxOutput = analysis.jsxOutput;
    if (!jsxOutput || !jsxOutput.placeholders) {
      return;
    }

    // Extract all identifiers referenced in JSX
    const referencedIdentifiers = new Set<string>();
    for (const placeholder of jsxOutput.placeholders) {
      // Add all variables from each placeholder
      for (const variable of placeholder.variables) {
        referencedIdentifiers.add(variable);
      }
    }

    // Find custom hook data stores
    const customHookNodes = this.nodes.filter(
      node => node.type === 'data-store' && node.metadata?.category === 'custom-hook'
    );

    // Create edges from JSX to custom hook data stores when write methods are referenced
    for (const customHookNode of customHookNodes) {
      const writeMethods = (customHookNode.metadata?.writeMethods || []) as string[];
      
      for (const writeMethod of writeMethods) {
        if (referencedIdentifiers.has(writeMethod)) {
          // Create edge: JSX → custom hook data store (via write method)
          this.edges.push({
            from: jsxNode.id,
            to: customHookNode.id,
            label: 'writes'
          });
          break; // Only create one edge per JSX-datastore pair
        }
      }
    }
  }
}
