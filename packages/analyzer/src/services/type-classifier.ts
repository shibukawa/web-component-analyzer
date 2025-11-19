import type { EventHandlerUsageInfo } from '../parser/types.js';

/**
 * Classification result for a TypeScript type
 */
export interface TypeClassification {
  isFunction: boolean;
  isFunctionLike: boolean; // Includes callable objects
  isUnion: boolean;
  unionTypes?: string[];
  baseType: string;
}

/**
 * Parses TypeScript type strings and classifies them
 */
export class TypeClassifier {
  /**
   * Classify a TypeScript type string
   */
  classify(typeString: string): TypeClassification {
    const normalized = typeString.trim();
    const isUnion = this.isUnionType(normalized);
    const unionTypes = isUnion ? this.extractUnionTypes(normalized) : undefined;
    const isFunction = this.isFunction(normalized);
    const isFunctionLike = isFunction || this.isCallableInterface(normalized);

    return {
      isFunction,
      isFunctionLike,
      isUnion,
      unionTypes,
      baseType: normalized
    };
  }

  /**
   * Classify a variable with optional event handler usage information
   * 
   * This method enhances type classification by considering how a variable is used
   * in JSX event handlers when TypeScript type inference is unavailable or ambiguous.
   * 
   * @param typeString - TypeScript type string from type inference
   * @param variableName - Name of the variable being classified
   * @param eventHandlerUsage - Optional usage information from JSX analysis
   * @returns Classification result
   */
  classifyWithUsage(
    typeString: string,
    variableName: string,
    eventHandlerUsage?: EventHandlerUsageInfo
  ): TypeClassification {
    const normalized = typeString.trim();
    
    console.log(`[TypeClassifier] classifyWithUsage for "${variableName}" with type "${normalized}"`);
    
    // First, try type-based classification
    const typeBasedClassification = this.classify(normalized);
    
    // If type information clearly indicates a function, use it
    if (typeBasedClassification.isFunction) {
      console.log(`[TypeClassifier] Type-based classification indicates function for "${variableName}"`);
      return typeBasedClassification;
    }
    
    // Note: Event handler usage heuristic has been removed.
    // The heuristic was incorrectly classifying data references
    // (like `count` in `onClick={() => setCount(count + 1)}`) as functions.
    // Data references used as arguments should remain classified as data.
    // 
    // Type-based classification and process analysis are sufficient for accurate
    // function detection without relying on usage patterns.
    
    // Default: return type-based classification
    return typeBasedClassification;
  }

  /**
   * Check if type string represents a function
   */
  isFunction(typeString: string): boolean {
    const normalized = typeString.trim();
    
    console.log(`[TypeClassifier] Checking if type is function: "${normalized}"`);

    // Union types - check FIRST before other checks to avoid false positives
    if (this.isUnionType(normalized)) {
      const types = this.extractUnionTypes(normalized);
      console.log(`[TypeClassifier] "${normalized}" is union type with members:`, types);
      // A union type is considered a function if ALL non-undefined/non-null members are functions
      // This handles optional function props like: ((value: string) => void) | undefined
      const nonNullableTypes = types.filter(t => {
        const trimmed = t.trim();
        return trimmed !== 'undefined' && trimmed !== 'null';
      });
      if (nonNullableTypes.length === 0) {
        console.log(`[TypeClassifier] Union has no non-nullable types`);
        return false;
      }
      const allAreFunctions = nonNullableTypes.every(t => this.isFunction(t));
      console.log(`[TypeClassifier] Union type, all non-nullable are functions: ${allAreFunctions}`);
      return allAreFunctions;
    }

    // Arrow function types: () => void, (arg: string) => number
    if (this.isArrowFunction(normalized)) {
      console.log(`[TypeClassifier] "${normalized}" is arrow function`);
      return true;
    }

    // Function keyword types: function(arg: string): void
    if (this.isFunctionKeyword(normalized)) {
      console.log(`[TypeClassifier] "${normalized}" is function keyword`);
      return true;
    }

    // Generic Function type
    if (normalized === 'Function') {
      console.log(`[TypeClassifier] "${normalized}" is generic Function`);
      return true;
    }

    // Named function types (event handlers, callbacks)
    if (this.isEventHandler(normalized)) {
      console.log(`[TypeClassifier] "${normalized}" is event handler`);
      return true;
    }

    // React-specific types
    if (this.isReactRefType(normalized)) {
      console.log(`[TypeClassifier] "${normalized}" is React ref type`);
      return true;
    }

    // Vue-specific types
    if (this.isVueEmitOrAction(normalized)) {
      console.log(`[TypeClassifier] "${normalized}" is Vue emit/action`);
      return true;
    }

    // Svelte-specific types
    if (this.isSvelteStoreOrDispatcher(normalized)) {
      console.log(`[TypeClassifier] "${normalized}" is Svelte store/dispatcher`);
      return true;
    }

    console.log(`[TypeClassifier] "${normalized}" is NOT a function`);
    return false;
  }

  /**
   * Check if type is a known event handler type
   */
  isEventHandler(typeString: string): boolean {
    const normalized = typeString.trim();

    // React event handlers
    const reactEventHandlers = [
      'MouseEventHandler',
      'ChangeEventHandler',
      'ClickEventHandler',
      'KeyboardEventHandler',
      'FocusEventHandler',
      'FormEventHandler',
      'TouchEventHandler',
      'PointerEventHandler',
      'WheelEventHandler',
      'AnimationEventHandler',
      'TransitionEventHandler',
      'DragEventHandler',
      'ClipboardEventHandler',
      'CompositionEventHandler',
      'UIEventHandler',
      'EventHandler'
    ];

    // Check for exact matches or generic versions
    for (const handler of reactEventHandlers) {
      if (normalized === handler || normalized.startsWith(`${handler}<`)) {
        return true;
      }
      // Also check for React.MouseEventHandler format
      if (normalized === `React.${handler}` || normalized.startsWith(`React.${handler}<`)) {
        return true;
      }
    }

    // Generic callback/handler patterns
    if (normalized.endsWith('Callback') || normalized.endsWith('Handler')) {
      return true;
    }

    return false;
  }

  /**
   * Check if type is a React component type (React.FC, React.ComponentType, etc.)
   */
  isReactComponentType(typeString: string): boolean {
    const normalized = typeString.trim();

    // React.FC, React.FunctionComponent
    if (normalized === 'React.FC' || normalized.startsWith('React.FC<')) {
      return false; // Component types themselves are not functions, but their props might contain functions
    }

    if (normalized === 'React.FunctionComponent' || normalized.startsWith('React.FunctionComponent<')) {
      return false;
    }

    if (normalized === 'React.ComponentType' || normalized.startsWith('React.ComponentType<')) {
      return false;
    }

    return false;
  }

  /**
   * Check if type is a React ref callback or imperative handle
   */
  isReactRefType(typeString: string): boolean {
    const normalized = typeString.trim();

    // Ref callbacks: (instance: T | null) => void
    if (normalized.startsWith('React.Ref<') || normalized.startsWith('Ref<')) {
      return false; // Refs themselves are not functions, but ref callbacks are
    }

    // RefCallback pattern: (instance: T | null) => void
    if (normalized.match(/^\([^)]*:\s*\w+\s*\|\s*null\)\s*=>\s*void$/)) {
      return true;
    }

    // ForwardedRef
    if (normalized.startsWith('React.ForwardedRef<') || normalized.startsWith('ForwardedRef<')) {
      return false;
    }

    return false;
  }

  /**
   * Check if type is a custom hook return type that contains functions
   * This is a heuristic check - we look for tuple or object types that might contain functions
   */
  isCustomHookReturnType(typeString: string): boolean {
    const normalized = typeString.trim();

    // Tuple types like [state, setState] - common hook pattern
    if (normalized.startsWith('[') && normalized.includes(',')) {
      return false; // The tuple itself is not a function, but may contain functions
    }

    // Object types with function properties
    if (normalized.startsWith('{') && normalized.includes('=>')) {
      return false; // The object itself is not a function
    }

    return false;
  }

  /**
   * Check if type is a Vue emit function or Pinia action
   */
  isVueEmitOrAction(typeString: string): boolean {
    const normalized = typeString.trim();

    // Vue emit function types - arrow functions with 'event' parameter
    if (this.isArrowFunction(normalized) && normalized.includes('event')) {
      return true;
    }

    // Pinia action types - functions in store
    if (normalized.includes('Action') || normalized.includes('StoreAction')) {
      return true;
    }

    // Vue defineEmits return type
    if (normalized.startsWith('EmitFn<') || normalized.startsWith('SetupContext')) {
      return false; // The context itself is not a function, but emit is
    }

    return false;
  }

  /**
   * Check if type is a Pinia store getter or action
   */
  isPiniaStoreType(typeString: string): boolean {
    const normalized = typeString.trim();

    // Pinia store types
    if (normalized.includes('Store<') || normalized.includes('StoreDefinition<')) {
      return false; // Store itself is not a function
    }

    // Store actions are functions
    if (normalized.includes('StoreActions<') || normalized.includes('_ActionsTree')) {
      return false; // The actions tree is not a function, but individual actions are
    }

    return false;
  }

  /**
   * Check if type is a Svelte store subscription or event dispatcher
   */
  isSvelteStoreOrDispatcher(typeString: string): boolean {
    const normalized = typeString.trim();

    // Svelte writable/readable store
    if (normalized.startsWith('Writable<') || normalized.startsWith('Readable<')) {
      return false; // Store itself is not a function, but subscribe/set/update are
    }

    // Svelte event dispatcher
    if (normalized.startsWith('EventDispatcher<') || normalized === 'EventDispatcher') {
      return true; // Dispatcher is callable
    }

    // Store update function: (value: T) => void or (updater: (value: T) => T) => void
    if (normalized.match(/^\(.*\)\s*=>\s*void$/) && normalized.includes('value')) {
      return true;
    }

    return false;
  }

  /**
   * Detect framework from type string patterns
   */
  detectFramework(typeString: string): 'react' | 'vue' | 'svelte' | 'unknown' {
    const normalized = typeString.trim();

    // React patterns
    if (normalized.includes('React.') || 
        normalized.includes('MouseEventHandler') ||
        normalized.includes('ChangeEventHandler') ||
        normalized.includes('EventHandler')) {
      return 'react';
    }

    // Vue patterns
    if (normalized.includes('defineProps') ||
        normalized.includes('defineEmits') ||
        normalized.includes('EmitFn') ||
        normalized.includes('Pinia') ||
        normalized.includes('Store<')) {
      return 'vue';
    }

    // Svelte patterns
    if (normalized.includes('Writable<') ||
        normalized.includes('Readable<') ||
        normalized.includes('EventDispatcher')) {
      return 'svelte';
    }

    return 'unknown';
  }

  /**
   * Extract function signature from type
   */
  extractFunctionSignature(typeString: string): string | null {
    const normalized = typeString.trim();

    if (this.isArrowFunction(normalized)) {
      return normalized;
    }

    if (this.isFunctionKeyword(normalized)) {
      return normalized;
    }

    return null;
  }

  /**
   * Check if type is an arrow function
   */
  private isArrowFunction(typeString: string): boolean {
    // Match patterns like: () => void, (arg: string) => number, <T>(arg: T) => T
    return /^(<[^>]+>)?\s*\([^)]*\)\s*=>\s*.+/.test(typeString);
  }

  /**
   * Check if type uses function keyword
   */
  private isFunctionKeyword(typeString: string): boolean {
    // Match patterns like: function(arg: string): void
    return /^function\s*\([^)]*\)\s*:\s*.+/.test(typeString);
  }

  /**
   * Check if type is a union type
   */
  private isUnionType(typeString: string): boolean {
    // Simple check for | character (may need refinement for nested types)
    return typeString.includes('|');
  }

  /**
   * Extract individual types from a union type
   */
  private extractUnionTypes(typeString: string): string[] {
    // Split by | but be careful with nested generics
    const types: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < typeString.length; i++) {
      const char = typeString[i];

      if (char === '<' || char === '(' || char === '[') {
        depth++;
        current += char;
      } else if (char === '>' || char === ')' || char === ']') {
        depth--;
        current += char;
      } else if (char === '|' && depth === 0) {
        types.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      types.push(current.trim());
    }

    return types;
  }

  /**
   * Check if type is a callable interface
   */
  private isCallableInterface(typeString: string): boolean {
    // This is a simplified check - in practice, we'd need to resolve the interface
    // For now, we'll rely on the Language Server to provide the full type signature
    // If it includes a call signature, it should be formatted as a function type
    return false;
  }
}
