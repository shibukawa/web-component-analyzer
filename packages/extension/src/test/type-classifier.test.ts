import * as assert from 'assert';
import { TypeClassifier } from '@web-component-analyzer/analyzer';

suite('TypeClassifier Test Suite', () => {
  let classifier: TypeClassifier;

  setup(() => {
    classifier = new TypeClassifier();
  });

  suite('Basic Function Type Detection (3.1)', () => {
    test('should detect arrow function types', () => {
      assert.strictEqual(classifier.isFunction('() => void'), true);
      assert.strictEqual(classifier.isFunction('(arg: string) => number'), true);
      assert.strictEqual(classifier.isFunction('(a: number, b: string) => boolean'), true);
    });

    test('should detect Function type', () => {
      assert.strictEqual(classifier.isFunction('Function'), true);
    });

    test('should detect function keyword types', () => {
      assert.strictEqual(classifier.isFunction('function(arg: string): void'), true);
      assert.strictEqual(classifier.isFunction('function(): number'), true);
    });

    test('should not detect non-function types', () => {
      assert.strictEqual(classifier.isFunction('string'), false);
      assert.strictEqual(classifier.isFunction('number'), false);
      assert.strictEqual(classifier.isFunction('boolean'), false);
      assert.strictEqual(classifier.isFunction('object'), false);
    });
  });

  suite('Named Function Type Detection (3.2)', () => {
    test('should detect React event handler types', () => {
      assert.strictEqual(classifier.isFunction('MouseEventHandler'), true);
      assert.strictEqual(classifier.isFunction('ChangeEventHandler'), true);
      assert.strictEqual(classifier.isFunction('ClickEventHandler'), true);
      assert.strictEqual(classifier.isFunction('KeyboardEventHandler'), true);
    });

    test('should detect React event handlers with generics', () => {
      assert.strictEqual(classifier.isFunction('MouseEventHandler<HTMLButtonElement>'), true);
      assert.strictEqual(classifier.isFunction('ChangeEventHandler<HTMLInputElement>'), true);
    });

    test('should detect React namespace event handlers', () => {
      assert.strictEqual(classifier.isFunction('React.MouseEventHandler'), true);
      assert.strictEqual(classifier.isFunction('React.ChangeEventHandler<HTMLInputElement>'), true);
    });

    test('should detect callback and handler patterns', () => {
      assert.strictEqual(classifier.isFunction('Callback'), true);
      assert.strictEqual(classifier.isFunction('Handler'), true);
      assert.strictEqual(classifier.isFunction('OnClickCallback'), true);
      assert.strictEqual(classifier.isFunction('ErrorHandler'), true);
    });
  });

  suite('Union Type Handling (3.3)', () => {
    test('should detect functions in union types', () => {
      assert.strictEqual(classifier.isFunction('string | (() => void)'), true);
      assert.strictEqual(classifier.isFunction('number | ((x: number) => string)'), true);
      assert.strictEqual(classifier.isFunction('(() => void) | null'), true);
    });

    test('should handle complex union types', () => {
      assert.strictEqual(classifier.isFunction('string | number | (() => void)'), true);
      assert.strictEqual(classifier.isFunction('MouseEventHandler | ChangeEventHandler'), true);
    });

    test('should not detect non-function unions', () => {
      assert.strictEqual(classifier.isFunction('string | number'), false);
      assert.strictEqual(classifier.isFunction('boolean | null | undefined'), false);
    });
  });

  suite('Classify Method', () => {
    test('should classify arrow functions correctly', () => {
      const result = classifier.classify('() => void');
      assert.strictEqual(result.isFunction, true);
      assert.strictEqual(result.isFunctionLike, true);
      assert.strictEqual(result.isUnion, false);
    });

    test('should classify union types correctly', () => {
      const result = classifier.classify('string | (() => void)');
      assert.strictEqual(result.isFunction, true);
      assert.strictEqual(result.isUnion, true);
      assert.strictEqual(result.unionTypes?.length, 2);
    });

    test('should classify non-functions correctly', () => {
      const result = classifier.classify('string');
      assert.strictEqual(result.isFunction, false);
      assert.strictEqual(result.isFunctionLike, false);
      assert.strictEqual(result.isUnion, false);
    });
  });

  suite('Extract Function Signature', () => {
    test('should extract arrow function signatures', () => {
      const sig = classifier.extractFunctionSignature('() => void');
      assert.strictEqual(sig, '() => void');
    });

    test('should extract function keyword signatures', () => {
      const sig = classifier.extractFunctionSignature('function(arg: string): void');
      assert.strictEqual(sig, 'function(arg: string): void');
    });

    test('should return null for non-function types', () => {
      const sig = classifier.extractFunctionSignature('string');
      assert.strictEqual(sig, null);
    });
  });

  suite('React-Specific Type Handling (7.1)', () => {
    test('should detect React event handler types', () => {
      assert.strictEqual(classifier.isFunction('MouseEventHandler'), true);
      assert.strictEqual(classifier.isFunction('React.MouseEventHandler'), true);
      assert.strictEqual(classifier.isFunction('React.ChangeEventHandler<HTMLInputElement>'), true);
    });

    test('should detect React ref callbacks', () => {
      assert.strictEqual(classifier.isReactRefType('(instance: HTMLDivElement | null) => void'), true);
      assert.strictEqual(classifier.isReactRefType('(instance: MyComponent | null) => void'), true);
    });

    test('should not classify React component types as functions', () => {
      assert.strictEqual(classifier.isReactComponentType('React.FC'), false);
      assert.strictEqual(classifier.isReactComponentType('React.FC<Props>'), false);
      assert.strictEqual(classifier.isReactComponentType('React.ComponentType<Props>'), false);
    });

    test('should not classify React refs as functions', () => {
      assert.strictEqual(classifier.isReactRefType('React.Ref<HTMLDivElement>'), false);
      assert.strictEqual(classifier.isReactRefType('React.ForwardedRef<HTMLDivElement>'), false);
    });

    test('should detect framework as React', () => {
      assert.strictEqual(classifier.detectFramework('React.MouseEventHandler'), 'react');
      assert.strictEqual(classifier.detectFramework('MouseEventHandler<HTMLButtonElement>'), 'react');
      assert.strictEqual(classifier.detectFramework('ChangeEventHandler'), 'react');
    });
  });

  suite('Vue-Specific Type Handling (7.2)', () => {
    test('should detect Vue emit functions', () => {
      assert.strictEqual(classifier.isVueEmitOrAction('(event: string, ...args: any[]) => void'), true);
    });

    test('should detect Pinia action types', () => {
      assert.strictEqual(classifier.isVueEmitOrAction('Action'), true);
      assert.strictEqual(classifier.isVueEmitOrAction('StoreAction'), true);
    });

    test('should not classify Vue setup context as function', () => {
      assert.strictEqual(classifier.isVueEmitOrAction('SetupContext'), false);
      assert.strictEqual(classifier.isVueEmitOrAction('EmitFn<Events>'), false);
    });

    test('should not classify Pinia store as function', () => {
      assert.strictEqual(classifier.isPiniaStoreType('Store<State>'), false);
      assert.strictEqual(classifier.isPiniaStoreType('StoreDefinition<Id, State, Getters, Actions>'), false);
    });

    test('should detect framework as Vue', () => {
      assert.strictEqual(classifier.detectFramework('EmitFn<Events>'), 'vue');
      assert.strictEqual(classifier.detectFramework('Store<State>'), 'vue');
      assert.strictEqual(classifier.detectFramework('defineProps'), 'vue');
    });
  });

  suite('Svelte-Specific Type Handling (7.3)', () => {
    test('should detect Svelte event dispatcher as function', () => {
      assert.strictEqual(classifier.isSvelteStoreOrDispatcher('EventDispatcher'), true);
      assert.strictEqual(classifier.isSvelteStoreOrDispatcher('EventDispatcher<Events>'), true);
    });

    test('should detect Svelte store update functions', () => {
      assert.strictEqual(classifier.isSvelteStoreOrDispatcher('(value: number) => void'), true);
    });

    test('should not classify Svelte stores as functions', () => {
      assert.strictEqual(classifier.isSvelteStoreOrDispatcher('Writable<number>'), false);
      assert.strictEqual(classifier.isSvelteStoreOrDispatcher('Readable<string>'), false);
    });

    test('should detect framework as Svelte', () => {
      assert.strictEqual(classifier.detectFramework('Writable<number>'), 'svelte');
      assert.strictEqual(classifier.detectFramework('EventDispatcher<Events>'), 'svelte');
      assert.strictEqual(classifier.detectFramework('Readable<string>'), 'svelte');
    });
  });

  suite('Framework Detection', () => {
    test('should detect unknown framework for generic types', () => {
      assert.strictEqual(classifier.detectFramework('string'), 'unknown');
      assert.strictEqual(classifier.detectFramework('() => void'), 'unknown');
      assert.strictEqual(classifier.detectFramework('CustomType'), 'unknown');
    });

    test('should prioritize React detection', () => {
      assert.strictEqual(classifier.detectFramework('React.FC<Props>'), 'react');
    });

    test('should prioritize Vue detection', () => {
      assert.strictEqual(classifier.detectFramework('defineEmits<Events>'), 'vue');
    });

    test('should prioritize Svelte detection', () => {
      assert.strictEqual(classifier.detectFramework('Writable<State>'), 'svelte');
    });
  });
});
