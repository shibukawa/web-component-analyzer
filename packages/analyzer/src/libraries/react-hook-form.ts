/**
 * React Hook Form Library Processor
 * 
 * Handles React Hook Form hooks:
 * - useForm: Form state management with register, handleSubmit, formState, setValue, reset
 * - useController: Individual field control
 * - useWatch: Watch specific field values
 * - useFormState: Access form state
 * 
 * This processor consolidates form-related return values into library-hook nodes
 * and creates appropriate DFD elements for form state and handlers.
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

/**
 * Return value mapping configuration for React Hook Form hooks
 */
interface ReturnValueMapping {
  propertyName: string;
  dfdElementType: 'external-entity-input' | 'data-store' | 'process';
  metadata?: Record<string, any>;
}

/**
 * React Hook Form library processor
 * Handles useForm, useController, useWatch, and useFormState hooks
 */
export class ReactHookFormLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'react-hook-form',
    libraryName: 'react-hook-form',
    packagePatterns: ['react-hook-form'],
    hookNames: ['useForm', 'useController', 'useWatch', 'useFormState'],
    priority: 50, // Medium priority for third-party libraries
    description: 'React Hook Form library processor'
  };

  /**
   * Return value mappings for each React Hook Form hook
   * Defines how hook return values map to DFD element types
   */
  private readonly returnValueMappings: Record<string, ReturnValueMapping[]> = {
    useForm: [
      {
        propertyName: 'register',
        dfdElementType: 'process',
        metadata: { isFormHandler: true }
      },
      {
        propertyName: 'handleSubmit',
        dfdElementType: 'process',
        metadata: { isFormHandler: true }
      },
      {
        propertyName: 'formState',
        dfdElementType: 'data-store',
        metadata: { isFormState: true }
      },
      {
        propertyName: 'setValue',
        dfdElementType: 'process',
        metadata: { isFormHandler: true }
      },
      {
        propertyName: 'reset',
        dfdElementType: 'process',
        metadata: { isFormHandler: true }
      },
      {
        propertyName: 'watch',
        dfdElementType: 'process',
        metadata: { isFormHandler: true }
      },
      {
        propertyName: 'getValues',
        dfdElementType: 'process',
        metadata: { isFormHandler: true }
      },
      {
        propertyName: 'control',
        dfdElementType: 'data-store',
        metadata: { isFormControl: true }
      }
    ],
    useController: [
      {
        propertyName: 'field',
        dfdElementType: 'data-store',
        metadata: { isFieldState: true }
      },
      {
        propertyName: 'fieldState',
        dfdElementType: 'data-store',
        metadata: { isFieldState: true }
      }
    ],
    useWatch: [
      {
        propertyName: 'value',
        dfdElementType: 'external-entity-input',
        metadata: { isWatchedValue: true }
      }
    ],
    useFormState: [
      {
        propertyName: 'isDirty',
        dfdElementType: 'data-store',
        metadata: { isFormState: true }
      },
      {
        propertyName: 'isValid',
        dfdElementType: 'data-store',
        metadata: { isFormState: true }
      },
      {
        propertyName: 'errors',
        dfdElementType: 'data-store',
        metadata: { isFormState: true, isError: true }
      },
      {
        propertyName: 'isSubmitting',
        dfdElementType: 'data-store',
        metadata: { isFormState: true }
      },
      {
        propertyName: 'isLoading',
        dfdElementType: 'data-store',
        metadata: { isFormState: true, isLoading: true }
      }
    ]
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Check if this is a known React Hook Form hook
    if (!this.metadata.hookNames.includes(hook.hookName)) {
      return false;
    }
    
    // Check if React Hook Form library is active (imported in the file)
    const enrichedHook = hook as any;
    if (enrichedHook.libraryName) {
      // If library name is set, check if it matches
      return this.metadata.packagePatterns.includes(enrichedHook.libraryName);
    }
    
    // If no library name is set, accept the hook if it's a known React Hook Form hook name
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
      case 'useForm':
        return this.processUseForm(hook, context);
      case 'useController':
        return this.processUseController(hook, context);
      case 'useWatch':
        return this.processUseWatch(hook, context);
      case 'useFormState':
        return this.processUseFormState(hook, context);
      default:
        logger.warn(`Unknown React Hook Form hook: ${hook.hookName}`);
        return { nodes: [], edges: [], handled: false };
    }
  }

  /**
   * Process useForm hook
   * Creates consolidated library-hook node with form handlers and state
   */
  private processUseForm(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'react-hook-form',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
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
   * Process useController hook
   * Creates consolidated library-hook node with field state
   */
  private processUseController(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'react-hook-form',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
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
   * Process useWatch hook
   * Creates consolidated library-hook node with watched field value
   */
  private processUseWatch(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'react-hook-form',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
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
   * Process useFormState hook
   * Creates consolidated library-hook node with form state properties
   */
  private processUseFormState(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { generateNodeId, logger } = context;
    const nodes: DFDNode[] = [];
    const edges: DFDEdge[] = [];

    // Map hook variables to their types using the return value mappings
    const mappings = this.returnValueMappings[hook.hookName] || [];
    const { dataProperties, processProperties, propertyMetadata } = 
      this.mapVariablesToTypes(hook.variables, mappings);

    // Create consolidated library-hook node
    const allProperties = [...dataProperties, ...processProperties];
    const nodeId = generateNodeId('library_hook');
    
    const node: DFDNode = {
      id: nodeId,
      label: hook.hookName,
      type: 'data-store',
      line: hook.line,
      column: hook.column,
      metadata: {
        category: 'library-hook',
        hookName: hook.hookName,
        libraryName: 'react-hook-form',
        isLibraryHook: true,
        properties: allProperties,
        dataProperties,
        processProperties,
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
   * Map hook variables to their types using return value mappings
   * Matches variables from the hook destructuring to the known property mappings
   */
  private mapVariablesToTypes(
    variables: string[],
    mappings: ReturnValueMapping[]
  ): {
    dataProperties: string[];
    processProperties: string[];
    propertyMetadata: Record<string, any>;
  } {
    const dataProperties: string[] = [];
    const processProperties: string[] = [];
    const propertyMetadata: Record<string, any> = {};

    // For each variable extracted from the hook, find its mapping
    for (const variable of variables) {
      // Try to find a mapping for this variable
      const mapping = mappings.find(m => m.propertyName === variable);
      
      if (mapping) {
        propertyMetadata[variable] = {
          dfdElementType: mapping.dfdElementType,
          ...mapping.metadata
        };

        if (mapping.dfdElementType === 'process') {
          processProperties.push(variable);
        } else {
          dataProperties.push(variable);
        }
      } else {
        // Unknown property - treat as data by default
        propertyMetadata[variable] = {
          dfdElementType: 'data-store'
        };
        dataProperties.push(variable);
      }
    }

    return { dataProperties, processProperties, propertyMetadata };
  }
}
