/**
 * MobX Library Processor
 * 
 * Handles MobX reactive state management hooks:
 * - useLocalObservable: Creates local observable state
 * 
 * Note: MobX primarily uses the observer() HOC rather than hooks.
 * The observer HOC wraps components to make them reactive to observable changes.
 * This processor focuses on the useLocalObservable hook which creates local observable state.
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
import { processHookWithSubgraphs } from './helpers';

/**
 * MobX library processor
 * Handles MobX hooks for reactive state management
 */
export class MobXLibraryProcessor implements HookProcessor {
  readonly metadata: ProcessorMetadata = {
    id: 'mobx',
    libraryName: 'mobx-react-lite',
    packagePatterns: ['mobx-react-lite', 'mobx-react'],
    hookNames: ['useLocalObservable', 'useObserver'],
    priority: 50,
    description: 'MobX reactive state management hooks'
  };

  /**
   * Check if this processor should handle the given hook
   */
  shouldHandle(hook: HookInfo, context: ProcessorContext): boolean {
    return this.metadata.hookNames.includes(hook.hookName);
  }

  /**
   * Process the hook and return DFD elements
   */
  process(hook: HookInfo, context: ProcessorContext): ProcessorResult {
    const { logger } = context;
    logger.start(hook.hookName, hook);

    // MobX hooks return observable objects with both data and action properties
    // We need to classify them based on whether they look like actions
    const classifyVariable = (varName: string): 'data' | 'function' => {
      // Common MobX action patterns
      const actionPatterns = [
        /^(set|update|add|remove|delete|clear|reset|toggle|increment|decrement)/i,
        /^(on|handle)/i,
        /Action$/i
      ];
      
      return actionPatterns.some(pattern => pattern.test(varName)) ? 'function' : 'data';
    };

    // Use the common helper function with MobX configuration
    return processHookWithSubgraphs(hook, context, {
      dataCategory: 'mobx-observable',
      functionCategory: 'mobx-action',
      dataNodeType: 'data-store',
      functionNodeType: 'external-entity-output',
      classifyVariable
    });
  }
}
