/**
 * Jotai Library Processor
 * 
 * Handles Jotai atomic state management hooks:
 * - useAtom: Read and write atom state (returns [value, setValue])
 * - useAtomValue: Read-only atom access (returns value)
 * - useSetAtom: Write-only atom access (returns setValue function)
 * 
 * Jotai uses atomic state management where each atom is an independent unit of state.
 * This processor creates appropriate DFD nodes for atom values and setters.
 * 
 * Also handles atom definition analysis to detect derived atom dependencies.
 */

import * as swc from '@swc/core';
import {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo,
  DFDNode,
  DFDEdge,
  AtomDefinition
} from '../parser/types';

/**
 * Return value mapping configuration for Jotai hooks
 */
interface ReturnValueMapping {
  propertyName?: string; // For object destructuring
  arrayIndex?: number; // For array destructuring
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * Jotai library processor
 * Handles useAtom, useAtomValue, and useSetAtom hooks
 */
export class JotaiLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'jotai',
    libraryName: 'jotai',
    packagePatterns: ['jotai', 'jotai/react'],
    hookNames: ['useAtom', 'useAtomValue', 'useSetAtom'],
    priority: 50, // Medium priority for third-party libraries
    description: 'Jotai atomic state management library processor'
  };

  /**
   * Return value mappings for each Jotai hook
   * Defines how Jotai hook return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useAtom: [
      {
        arrayIndex: 0,
        dfdElementType: 'external-entity-input',
        metadata: { isAtomValue: true }
      },
      {
        arrayIndex: 1,
        dfdElementType: 'process',
        metadata: { isAtomSetter: true }
      }
    ],
    useAtomValue: [
      {
        dfdElementType: 'external-entity-input',
        metadata: { isAtomValue: true, isReadOnly: true }
      }
    ],
    useSetAtom: [
      {
        dfdElementType: 'process',
        metadata: { isAtomSetter: true, isWriteOnly: true }
      }
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known Jotai hook
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if Jotai library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known Jotai hook name
    // This is a fallback for when library detection isn't working
    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific hook handlers
    switch (hook.hookName) {
      case 'useAtom':
        return this.processUseAtom(hook, context);
      case 'useAtomValue':
        return this.processUseAtomValue(hook, context);
      case 'useSetAtom':
        return this.processUseSetAtom(hook, context);
      default:
        logger.warn(`Unknown Jotai hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useAtom hook
   * Creates a data-store node for the atom (similar to useState)
   * Pattern: const [value, setValue] = useAtom(atomName)
   */
  private processUseAtom(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger, nodes: existingNodes, analysis } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract atom name from hook arguments
    const atomName = this.extractAtomName(hook);
    
    if (!atomName) {
      logger.warn('No atom name found for useAtom - cannot create atom node');
      return { nodes: [], edges: [], handled: true };
    }
    
    // useAtom returns [value, setValue] - array destructuring
    // We expect 2 variables: [0] = value, [1] = setter
    const variables = hook.variables || [];
    
    if (variables.length === 0) {
      logger.warn('No variables found for useAtom - hook result may not be destructured');
      return { nodes: [], edges: [], handled: true };
    }

    // Check if atom node already exists (multiple hooks using same atom)
    const existingAtomNode = existingNodes.find(
      n => n.type === 'data-store' && 
           n.metadata?.category === 'jotai-atom' && 
           n.metadata?.atomName === atomName
    );

    let atomNode: DFDNode;
    
    if (existingAtomNode) {
      // Reuse existing atom node
      atomNode = existingAtomNode;
      logger.debug(`Reusing existing atom node: ${atomName}`);
    } else {
      // Find atom definition to get dependencies
      const atomDef = analysis.atomDefinitions?.find(def => def.name === atomName);
      
      // Create new data-store node for the atom
      const atomNodeId = generateNodeId('jotai_atom');
      
      atomNode = {
        id: atomNodeId,
        label: atomName,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'jotai-atom',
          hookName: hook.hookName,
          libraryName: 'jotai',
          atomName,
          isReadWritePair: variables.length >= 2,
          readVariable: variables[0],
          writeVariable: variables.length >= 2 ? variables[1] : undefined,
          isDerived: atomDef?.isDerived || false,
          atomDependencies: atomDef?.dependencies || [],
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(atomNode);
      logger.node('created', atomNode);
    }

    // Create "reads" edge from atom to value variable (handled by DFD builder)
    // Create "set" edge from setter to atom (handled by DFD builder)
    // These edges are created automatically by buildProcessToDataStoreEdges and buildProcessToDataStoreWriteEdges

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useAtomValue hook
   * Creates a data-store node for the atom (read-only)
   * Pattern: const value = useAtomValue(atomName)
   */
  private processUseAtomValue(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger, nodes: existingNodes, analysis } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract atom name from hook arguments
    const atomName = this.extractAtomName(hook);
    
    if (!atomName) {
      logger.warn('No atom name found for useAtomValue - cannot create atom node');
      return { nodes: [], edges: [], handled: true };
    }
    
    // useAtomValue returns a single value
    const variables = hook.variables || [];
    
    if (variables.length === 0) {
      logger.warn('No variables found for useAtomValue');
      return { nodes: [], edges: [], handled: true };
    }

    // Check if atom node already exists (multiple hooks using same atom)
    const existingAtomNode = existingNodes.find(
      n => n.type === 'data-store' && 
           n.metadata?.category === 'jotai-atom' && 
           n.metadata?.atomName === atomName
    );

    let atomNode: DFDNode;
    
    if (existingAtomNode) {
      // Reuse existing atom node
      atomNode = existingAtomNode;
      logger.debug(`Reusing existing atom node: ${atomName}`);
    } else {
      // Find atom definition to get dependencies
      const atomDef = analysis.atomDefinitions?.find(def => def.name === atomName);
      
      // Create new data-store node for the atom (read-only)
      const atomNodeId = generateNodeId('jotai_atom');
      const valueVar = variables[0];
      
      atomNode = {
        id: atomNodeId,
        label: atomName,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'jotai-atom',
          hookName: hook.hookName,
          libraryName: 'jotai',
          atomName,
          isReadWritePair: false,
          readVariable: valueVar,
          isReadOnly: true,
          isDerived: atomDef?.isDerived || false,
          atomDependencies: atomDef?.dependencies || [],
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(atomNode);
      logger.node('created', atomNode);
    }

    // Create "reads" edge from atom to value variable (handled by DFD builder)

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process useSetAtom hook
   * Creates a data-store node for the atom (write-only)
   * Pattern: const setValue = useSetAtom(atomName)
   */
  private processUseSetAtom(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger, nodes: existingNodes, analysis } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Extract atom name from hook arguments
    const atomName = this.extractAtomName(hook);
    
    if (!atomName) {
      logger.warn('No atom name found for useSetAtom - cannot create atom node');
      return { nodes: [], edges: [], handled: true };
    }
    
    // useSetAtom returns a setter function
    const variables = hook.variables || [];
    
    if (variables.length === 0) {
      logger.warn('No variables found for useSetAtom');
      return { nodes: [], edges: [], handled: true };
    }

    // Check if atom node already exists (multiple hooks using same atom)
    const existingAtomNode = existingNodes.find(
      n => n.type === 'data-store' && 
           n.metadata?.category === 'jotai-atom' && 
           n.metadata?.atomName === atomName
    );

    let atomNode: DFDNode;
    
    if (existingAtomNode) {
      // Reuse existing atom node and add write variable
      atomNode = existingAtomNode;
      if (!atomNode.metadata!.writeVariable) {
        atomNode.metadata!.writeVariable = variables[0];
        atomNode.metadata!.isReadWritePair = !!atomNode.metadata!.readVariable;
      }
      logger.debug(`Reusing existing atom node: ${atomName}`);
    } else {
      // Find atom definition to get dependencies
      const atomDef = analysis.atomDefinitions?.find(def => def.name === atomName);
      
      // Create new data-store node for the atom (write-only)
      const atomNodeId = generateNodeId('jotai_atom');
      const setterVar = variables[0];
      
      atomNode = {
        id: atomNodeId,
        label: atomName,
        type: 'data-store',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'jotai-atom',
          hookName: hook.hookName,
          libraryName: 'jotai',
          atomName,
          isReadWritePair: false,
          writeVariable: setterVar,
          isWriteOnly: true,
          isDerived: atomDef?.isDerived || false,
          atomDependencies: atomDef?.dependencies || [],
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(atomNode);
      logger.node('created', atomNode);
    }

    // Create "set" edge from setter to atom (handled by DFD builder)

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Extract atom name from hook arguments
   * Handles atom variable references
   */
  private extractAtomName(hook: HookInfo): string | undefined {
    const hookAny = hook as any;
    
    // Check argumentIdentifiers first (most reliable for identifier references)
    if (hookAny.argumentIdentifiers && hookAny.argumentIdentifiers.length > 0) {
      return hookAny.argumentIdentifiers[0];
    }
    
    // Fallback: Check if atom name is available in hook arguments
    if (hookAny.arguments && hookAny.arguments.length > 0) {
      const firstArg = hookAny.arguments[0];
      
      // Handle string literals (unlikely for atoms, but possible)
      if (typeof firstArg === 'string') {
        return firstArg;
      }
      
      // Handle identifier references (most common: countAtom, userAtom, etc.)
      if (firstArg && typeof firstArg === 'object') {
        if ('name' in firstArg) {
          return String(firstArg.name);
        }
        if ('value' in firstArg) {
          return String(firstArg.value);
        }
      }
    }
    
    return undefined;
  }
}


/**
 * Analyze module body to find Jotai atom definitions
 * This function detects atom() calls and extracts their dependencies
 */
export function analyzeJotaiAtoms(moduleBody: swc.ModuleItem[]): AtomDefinition[] {
  const atoms: AtomDefinition[] = [];

  for (const item of moduleBody) {
    if (item.type === 'VariableDeclaration') {
      const atomDefs = extractAtomsFromVariableDeclaration(item);
      atoms.push(...atomDefs);
    }
  }

  console.log('🔬 Jotai Atom Analyzer: Found', atoms.length, 'atom definitions');
  atoms.forEach(atom => {
    console.log(`🔬   - ${atom.name}:`, atom.isDerived ? 'derived' : 'primitive', 
                atom.dependencies.length > 0 ? `depends on [${atom.dependencies.join(', ')}]` : '');
  });

  return atoms;
}

/**
 * Extract atom definitions from a variable declaration
 */
function extractAtomsFromVariableDeclaration(varDecl: swc.VariableDeclaration): AtomDefinition[] {
  const atoms: AtomDefinition[] = [];

  for (const declarator of varDecl.declarations) {
    // Check if this is an atom() call
    if (declarator.init?.type === 'CallExpression') {
      const callExpr = declarator.init as swc.CallExpression;
      
      // Check if the callee is 'atom'
      if (callExpr.callee.type === 'Identifier' && callExpr.callee.value === 'atom') {
        const atomName = declarator.id.type === 'Identifier' ? declarator.id.value : undefined;
        
        if (atomName) {
          const atomDef = analyzeAtomDefinition(atomName, callExpr, declarator);
          atoms.push(atomDef);
        }
      }
    }
  }

  return atoms;
}

/**
 * Analyze an atom() call to extract dependencies
 */
function analyzeAtomDefinition(
  name: string, 
  callExpr: swc.CallExpression,
  declarator: swc.VariableDeclarator
): AtomDefinition {
  const dependencies: string[] = [];
  let isDerived = false;

  // Check if the first argument is a function (derived atom)
  if (callExpr.arguments.length > 0 && !callExpr.arguments[0].spread) {
    const firstArg = callExpr.arguments[0].expression;
    
    if (firstArg.type === 'ArrowFunctionExpression' || firstArg.type === 'FunctionExpression') {
      isDerived = true;
      
      // Extract dependencies from get() calls in the function body
      const deps = extractDependenciesFromFunction(firstArg);
      dependencies.push(...deps);
    }
  }

  return {
    name,
    line: declarator.span?.start,
    column: declarator.span?.start,
    dependencies,
    isDerived
  };
}

/**
 * Extract atom dependencies from a function (looks for get(atomName) calls)
 */
function extractDependenciesFromFunction(
  func: swc.ArrowFunctionExpression | swc.FunctionExpression
): string[] {
  const dependencies: string[] = [];

  // Traverse the function body to find get() calls
  if (func.body) {
    traverseForGetCalls(func.body, dependencies);
  }

  return dependencies;
}

/**
 * Recursively traverse AST nodes to find get() calls
 */
function traverseForGetCalls(node: any, dependencies: string[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  // Check if this is a get() call
  if (node.type === 'CallExpression') {
    const callExpr = node as swc.CallExpression;
    
    // Check if callee is 'get'
    if (callExpr.callee.type === 'Identifier' && callExpr.callee.value === 'get') {
      // Extract the atom name from the first argument
      if (callExpr.arguments.length > 0 && !callExpr.arguments[0].spread) {
        const arg = callExpr.arguments[0].expression;
        
        if (arg.type === 'Identifier') {
          dependencies.push(arg.value);
        }
      }
    }
  }

  // Recursively traverse child nodes
  for (const key in node) {
    if (key === 'span' || key === 'type') {continue;}
    
    const value = node[key];
    
    if (Array.isArray(value)) {
      value.forEach(item => traverseForGetCalls(item, dependencies));
    } else if (value && typeof value === 'object') {
      traverseForGetCalls(value, dependencies);
    }
  }
}
