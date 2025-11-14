"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeClassifier = void 0;
/**
 * Parses TypeScript type strings and classifies them
 */
class TypeClassifier {
    /**
     * Classify a TypeScript type string
     */
    classify(typeString) {
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
     * Check if type string represents a function
     */
    isFunction(typeString) {
        const normalized = typeString.trim();
        // Arrow function types: () => void, (arg: string) => number
        if (this.isArrowFunction(normalized)) {
            return true;
        }
        // Function keyword types: function(arg: string): void
        if (this.isFunctionKeyword(normalized)) {
            return true;
        }
        // Generic Function type
        if (normalized === 'Function') {
            return true;
        }
        // Named function types (event handlers, callbacks)
        if (this.isEventHandler(normalized)) {
            return true;
        }
        // React-specific types
        if (this.isReactRefType(normalized)) {
            return true;
        }
        // Vue-specific types
        if (this.isVueEmitOrAction(normalized)) {
            return true;
        }
        // Svelte-specific types
        if (this.isSvelteStoreOrDispatcher(normalized)) {
            return true;
        }
        // Union types - check if any member is a function
        if (this.isUnionType(normalized)) {
            const types = this.extractUnionTypes(normalized);
            return types.some(t => this.isFunction(t));
        }
        return false;
    }
    /**
     * Check if type is a known event handler type
     */
    isEventHandler(typeString) {
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
    isReactComponentType(typeString) {
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
    isReactRefType(typeString) {
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
    isCustomHookReturnType(typeString) {
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
    isVueEmitOrAction(typeString) {
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
    isPiniaStoreType(typeString) {
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
    isSvelteStoreOrDispatcher(typeString) {
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
    detectFramework(typeString) {
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
    extractFunctionSignature(typeString) {
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
    isArrowFunction(typeString) {
        // Match patterns like: () => void, (arg: string) => number, <T>(arg: T) => T
        return /^(<[^>]+>)?\s*\([^)]*\)\s*=>\s*.+/.test(typeString);
    }
    /**
     * Check if type uses function keyword
     */
    isFunctionKeyword(typeString) {
        // Match patterns like: function(arg: string): void
        return /^function\s*\([^)]*\)\s*:\s*.+/.test(typeString);
    }
    /**
     * Check if type is a union type
     */
    isUnionType(typeString) {
        // Simple check for | character (may need refinement for nested types)
        return typeString.includes('|');
    }
    /**
     * Extract individual types from a union type
     */
    extractUnionTypes(typeString) {
        // Split by | but be careful with nested generics
        const types = [];
        let current = '';
        let depth = 0;
        for (let i = 0; i < typeString.length; i++) {
            const char = typeString[i];
            if (char === '<' || char === '(' || char === '[') {
                depth++;
                current += char;
            }
            else if (char === '>' || char === ')' || char === ']') {
                depth--;
                current += char;
            }
            else if (char === '|' && depth === 0) {
                types.push(current.trim());
                current = '';
            }
            else {
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
    isCallableInterface(typeString) {
        // This is a simplified check - in practice, we'd need to resolve the interface
        // For now, we'll rely on the Language Server to provide the full type signature
        // If it includes a call signature, it should be formatted as a function type
        return false;
    }
}
exports.TypeClassifier = TypeClassifier;
