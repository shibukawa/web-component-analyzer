/**
 * Vue Core Library Processor
 * 
 * Handles Vue 3 core composables:
 * - provide: Provide values to descendant components (output)
 * - inject: Inject values from ancestor components (input)
 * - Custom composables that return reactive values
 * 
 * This processor creates:
 * - External Entity Input nodes for inject
 * - External Entity Output nodes for provide
 * - Appropriate data flows for custom composables
 * 
 * Example:
 * ```vue
 * // Parent component
 * provide('theme', theme);
 * 
 * // Child component
 * const theme = inject('theme');
 * ```
 * 
 * Results in:
 * - External Entity Output node for provide
 * - External Entity Input node for inject
 */

import {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo,
  DFDNode,
  DFDEdge
} from '../parser/types';
import { processHookWithSubgraphs } from './helpers';

/**
 * Vue core library processor
 * Handles provide/inject and custom composables for Vue 3
 */
export class VueCoreLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'vue',
    libraryName: 'vue',
    packagePatterns: ['vue'],
    hookNames: ['provide', 'inject', /^use[A-Z]\w+$/],
    priority: 90, // Higher than custom hooks, lower than specific libraries
    description: 'Vue 3 core library processor for provide/inject and custom composables'
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    const { logger } = context;

    // Check if hook name matches the pattern (provide, inject, or useXxx)
    const matchesPattern = this.metadata.hookNames.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(hook.hookName);
      }
      return pattern === hook.hookName;
    });

    if (!matchesPattern) {
      logger.debug(`Hook ${hook.hookName} does not match Vue core pattern`);
      return false;
    }

    // For provide/inject, always handle
    if (hook.hookName === 'provide' || hook.hookName === 'inject') {
      logger.debug(`Hook ${hook.hookName} will be handled by Vue core processor`);
      return true;
    }

    // For custom composables (useXxx), handle them
    // These are detected by the composables analyzer
    if (/^use[A-Z]\w+$/.test(hook.hookName)) {
      logger.debug(`Hook ${hook.hookName} will be handled by Vue core processor`);
      return true;
    }

    logger.debug(`Hook ${hook.hookName} does not match Vue core pattern, skipping Vue core processor`);
    return false;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // Delegate to specific handler based on hook name
    if (hook.hookName === 'provide') {
      return this.processProvide(hook, context);
    } else if (hook.hookName === 'inject') {
      return this.processInject(hook, context);
    } else if (/^use[A-Z]\w+$/.test(hook.hookName)) {
      return this.processCustomComposable(hook, context);
    }

    logger.warn(`Unknown Vue core composable: ${hook.hookName}`);
    return { nodes: [], edges: [], handled: false };
  }

  /**
   * Process provide composable
   * Creates an external entity output node for provided values
   */
  private processProvide(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // provide() typically takes a key and value
    // Example: provide('theme', theme)
    // We create an output node for the provided value
    
    // The hook.variables contains the key being provided
    // For simplicity, we'll create a single output node
    const nodeId = generateNodeId('provide');
    
    const label = hook.variables.length > 0 
      ? `provide: ${hook.variables[0]}` 
      : 'provide';

    const node: DFDNode = {
      id: nodeId,
      label,
      type: 'external-entity-output',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'provide-inject',
        hookName: hook.hookName,
        libraryName: 'vue',
        isProvide: true,
        providedKeys: hook.variables,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process inject composable
   * Creates an external entity input node for injected values
   */
  private processInject(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // inject() typically takes a key and optional default value
    // Example: const theme = inject('theme')
    // We create an input node for the injected value
    
    // The hook.variables contains the variable receiving the injected value
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('inject');
      
      const node: DFDNode = {
        id: nodeId,
        label: variable,
        type: 'external-entity-input',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'provide-inject',
          hookName: hook.hookName,
          libraryName: 'vue',
          isInject: true,
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Process custom composable (useXxx)
   * Creates appropriate nodes based on return values
   * 
   * Custom composables can return:
   * - Reactive values (ref, reactive, computed) → data nodes
   * - Functions → function nodes
   * - Mixed values → separate into data and function nodes
   */
  private processCustomComposable(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // If no type classification is available, treat all as data
    if (!hook.variableTypes || hook.variableTypes.size === 0) {
      logger.warn(`No type classification for ${hook.hookName}, treating all as data`);
      return this.processCustomComposableLegacy(hook, context);
    }

    // Separate data properties from function properties
    const dataProperties: string[] = [];
    const functionProperties: string[] = [];
    const propertyMetadata: Record<string, any> = {};

    for (const variable of hook.variables) {
      const varType = hook.variableTypes.get(variable);
      if (varType === 'function') {
        functionProperties.push(variable);
        propertyMetadata[variable] = {
          dfdElementType: 'function',
          isFunction: true
        };
      } else {
        dataProperties.push(variable);
        propertyMetadata[variable] = {
          dfdElementType: 'data',
          isData: true
        };
      }
    }

    logger.debug(`${hook.hookName} - Data properties: ${dataProperties.join(', ')}, Function properties: ${functionProperties.join(', ')}`);

    // Create single composable node (data-store type with composable category)
    const nodeId = generateNodeId('composable');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'composable',
        hookName: hook.hookName,
        libraryName: 'vue',
        isCustomComposable: true,
        properties: [...dataProperties, ...functionProperties],
        dataProperties,
        functionProperties,
        propertyMetadata,
        line: hook.line,
        column: hook.column
      }
    };

    nodes.push(node);
    logger.node('created', node);

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }

  /**
   * Legacy custom composable processing without type classification
   * Treats all return values as data by default
   */
  private processCustomComposableLegacy(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Create data nodes for all variables
    for (const variable of hook.variables) {
      const nodeId = generateNodeId('composable');
      
      const node: DFDNode = {
        id: nodeId,
        label: variable,
        type: 'external-entity-input',
        line: hook.line,
        column: hook.column,
        metadata: {
          category: 'composable',
          hookName: hook.hookName,
          libraryName: 'vue',
          isCustomComposable: true,
          variableName: variable,
          line: hook.line,
          column: hook.column
        }
      };

      nodes.push(node);
      logger.node('created', node);
    }

    logger.complete({ nodes, edges, handled: true });
    return { nodes, edges, handled: true };
  }
}
