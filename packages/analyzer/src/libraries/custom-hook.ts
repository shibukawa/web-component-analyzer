/**
 * Custom Hook Processor
 * 
 * Handles user-defined custom hooks that follow the useXxx naming convention.
 * 
 * Custom hooks are detected by:
 * - Hook name starts with 'use' followed by uppercase letter
 * - Not handled by any other processor (React, third-party libraries)
 * 
 * Processing strategy:
 * - Separates data values from function values using type classification
 * - Creates input subgraph for data values
 * - Creates output subgraph for function values
 */

import {
  HookProcessor,
  ProcessorMetadata,
  ProcessorContext,
  ProcessorResult
} from './types';
import {
  HookInfo
} from '../parser/types';
import { processHookWithSubgraphs, looksLikeAction } from './helpers';

/**
 * Custom hook processor
 * Handles user-defined hooks with lowest priority (fallback)
 */
export class CustomHookProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'custom-hook',
    libraryName: 'custom',
    packagePatterns: [], // Custom hooks don't have package patterns
    hookNames: [/^use[A-Z]\w*/], // Matches useXxx pattern
    priority: 0, // Lowest priority - fallback for unhandled hooks
    description: 'Custom hook processor for user-defined hooks'
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    // Only handle hooks that match the useXxx pattern
    const matchesPattern = this.metadata.hookNames.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(hook.hookName);
      }
      return pattern === hook.hookName;
    });

    if (!matchesPattern) {
      return false;
    }

    // Custom hooks should not have a category (not handled by other processors)
    if (hook.category) {
      return false;
    }

    return true;
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // If no type classification is available, use heuristic-based classification
    const classifyVariable = hook.variableTypes && hook.variableTypes.size > 0
      ? undefined // Use hook.variableTypes
      : (varName: string) => looksLikeAction(varName) ? 'function' : 'data';

    // Use the common helper function with custom hook configuration
    return processHookWithSubgraphs(hook, context, {
      dataCategory: 'custom-hook-data',
      functionCategory: 'custom-hook-function',
      dataNodeType: 'data-store',
      functionNodeType: 'external-entity-output',
      classifyVariable
    });
  }
}
