/**
 * Tests for Vue Composables and Lifecycle Analyzer
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSync } from '@swc/core';
import { VueComposablesAnalyzer } from './vue-composables-analyzer.js';

describe('VueComposablesAnalyzer', () => {
  it('should detect composable calls', async () => {
    const code = `
      const route = useRoute();
      const router = useRouter();
      const { data, error } = useQuery();
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables, lifecycle } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 3, 'Should find 3 composables');
    assert.strictEqual(lifecycle.length, 0, 'Should find no lifecycle hooks');

    // Check useRoute
    const useRouteHook = composables.find(h => h.hookName === 'useRoute');
    assert.ok(useRouteHook, 'Should find useRoute');
    assert.strictEqual(useRouteHook?.variables.length, 1);
    assert.strictEqual(useRouteHook?.variables[0], 'route');
    assert.strictEqual(useRouteHook?.category, 'routing');

    // Check useRouter
    const useRouterHook = composables.find(h => h.hookName === 'useRouter');
    assert.ok(useRouterHook, 'Should find useRouter');
    assert.strictEqual(useRouterHook?.variables.length, 1);
    assert.strictEqual(useRouterHook?.variables[0], 'router');
    assert.strictEqual(useRouterHook?.category, 'routing');

    // Check useQuery
    const useQueryHook = composables.find(h => h.hookName === 'useQuery');
    assert.ok(useQueryHook, 'Should find useQuery');
    assert.strictEqual(useQueryHook?.variables.length, 2);
    assert.ok(useQueryHook?.variables.includes('data'));
    assert.ok(useQueryHook?.variables.includes('error'));
    assert.strictEqual(useQueryHook?.category, 'data-fetching');
  });

  it('should detect lifecycle hooks', async () => {
    const code = `
      onMounted(() => {
        console.log('mounted');
      });

      onBeforeUnmount(() => {
        console.log('cleanup');
      });

      onUpdated(() => {
        console.log('updated');
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables, lifecycle } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 0, 'Should find no composables');
    assert.strictEqual(lifecycle.length, 3, 'Should find 3 lifecycle hooks');

    // Check onMounted
    const onMountedHook = lifecycle.find(h => h.hookName === 'onMounted');
    assert.ok(onMountedHook, 'Should find onMounted');
    assert.strictEqual(onMountedHook?.category, 'effect');

    // Check onBeforeUnmount
    const onBeforeUnmountHook = lifecycle.find(h => h.hookName === 'onBeforeUnmount');
    assert.ok(onBeforeUnmountHook, 'Should find onBeforeUnmount');
    assert.strictEqual(onBeforeUnmountHook?.category, 'effect');

    // Check onUpdated
    const onUpdatedHook = lifecycle.find(h => h.hookName === 'onUpdated');
    assert.ok(onUpdatedHook, 'Should find onUpdated');
    assert.strictEqual(onUpdatedHook?.category, 'effect');
  });

  it('should extract dependencies from lifecycle hooks', async () => {
    const code = `
      const count = ref(0);
      const message = ref('');

      onMounted(() => {
        console.log('mounted');
      }, [count, message]);
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables, lifecycle } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(lifecycle.length, 1, 'Should find 1 lifecycle hook');

    const onMountedHook = lifecycle[0];
    assert.strictEqual(onMountedHook.hookName, 'onMounted');
    assert.ok(onMountedHook.dependencies, 'Should have dependencies');
    assert.strictEqual(onMountedHook.dependencies?.length, 2);
    assert.ok(onMountedHook.dependencies?.includes('count'));
    assert.ok(onMountedHook.dependencies?.includes('message'));
  });

  it('should extract type parameters from composables', async () => {
    const code = `
      const user = useQuery<User>();
      const posts = useFetch<Post[]>();
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 2, 'Should find 2 composables');

    // Check useQuery
    const useQueryHook = composables.find(h => h.hookName === 'useQuery');
    assert.ok(useQueryHook, 'Should find useQuery');
    assert.strictEqual(useQueryHook?.typeParameter, 'User');

    // Check useFetch
    const useFetchHook = composables.find(h => h.hookName === 'useFetch');
    assert.ok(useFetchHook, 'Should find useFetch');
    assert.strictEqual(useFetchHook?.typeParameter, 'Post[]');
  });

  it('should extract argument identifiers from composables', async () => {
    const code = `
      const url = '/api/users';
      const fetcher = (url) => fetch(url).then(r => r.json());
      const { data } = useSWR(url, fetcher);
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 1, 'Should find 1 composable');

    const useSWRHook = composables[0];
    assert.strictEqual(useSWRHook.hookName, 'useSWR');
    assert.ok(useSWRHook.argumentIdentifiers, 'Should have argument identifiers');
    assert.strictEqual(useSWRHook.argumentIdentifiers?.length, 2);
    assert.ok(useSWRHook.argumentIdentifiers?.includes('url'));
    assert.ok(useSWRHook.argumentIdentifiers?.includes('fetcher'));
  });

  it('should categorize custom composables as state', async () => {
    const code = `
      const counter = useCounter();
      const theme = useTheme();
      const auth = useAuth();
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 3, 'Should find 3 composables');

    // All custom composables should be categorized as 'state' by default
    composables.forEach(hook => {
      assert.strictEqual(hook.category, 'state', `${hook.hookName} should be categorized as state`);
    });
  });

  it('should handle composables with store in name as state-management', async () => {
    const code = `
      const userStore = useUserStore();
      const cartState = useCartState();
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 2, 'Should find 2 composables');

    // Check useUserStore
    const useUserStoreHook = composables.find(h => h.hookName === 'useUserStore');
    assert.ok(useUserStoreHook, 'Should find useUserStore');
    assert.strictEqual(useUserStoreHook?.category, 'state-management');

    // Check useCartState
    const useCartStateHook = composables.find(h => h.hookName === 'useCartState');
    assert.ok(useCartStateHook, 'Should find useCartState');
    assert.strictEqual(useCartStateHook?.category, 'state-management');
  });

  it('should detect watch() calls with single ref', async () => {
    const code = `
      const count = ref(0);
      watch(count, (newValue, oldValue) => {
        console.log('count changed:', newValue);
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables, lifecycle, watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 0, 'Should find no composables');
    assert.strictEqual(lifecycle.length, 0, 'Should find no lifecycle hooks');
    assert.strictEqual(watchers.length, 1, 'Should find 1 watcher');

    const watchHook = watchers[0];
    assert.strictEqual(watchHook.hookName, 'watch');
    assert.strictEqual(watchHook.category, 'effect');
    assert.ok(watchHook.dependencies, 'Should have dependencies');
    assert.strictEqual(watchHook.dependencies?.length, 1);
    assert.ok(watchHook.dependencies?.includes('count'));
  });

  it('should detect watch() calls with array of refs', async () => {
    const code = `
      const count = ref(0);
      const message = ref('');
      watch([count, message], ([newCount, newMessage]) => {
        console.log('values changed:', newCount, newMessage);
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(watchers.length, 1, 'Should find 1 watcher');

    const watchHook = watchers[0];
    assert.strictEqual(watchHook.hookName, 'watch');
    assert.strictEqual(watchHook.category, 'effect');
    assert.ok(watchHook.dependencies, 'Should have dependencies');
    assert.strictEqual(watchHook.dependencies?.length, 2);
    assert.ok(watchHook.dependencies?.includes('count'));
    assert.ok(watchHook.dependencies?.includes('message'));
  });

  it('should detect watch() calls with getter function', async () => {
    const code = `
      const user = reactive({ name: 'John', age: 30 });
      watch(() => user.age, (newAge) => {
        console.log('age changed:', newAge);
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(watchers.length, 1, 'Should find 1 watcher');

    const watchHook = watchers[0];
    assert.strictEqual(watchHook.hookName, 'watch');
    assert.strictEqual(watchHook.category, 'effect');
    assert.ok(watchHook.dependencies, 'Should have dependencies');
    assert.ok(watchHook.dependencies?.includes('user'), 'Should extract user from getter function');
  });

  it('should detect watchEffect() calls', async () => {
    const code = `
      const count = ref(0);
      const doubled = ref(0);
      watchEffect(() => {
        doubled.value = count.value * 2;
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(watchers.length, 1, 'Should find 1 watcher');

    const watchEffectHook = watchers[0];
    assert.strictEqual(watchEffectHook.hookName, 'watchEffect');
    assert.strictEqual(watchEffectHook.category, 'effect');
    assert.ok(watchEffectHook.dependencies, 'Should have dependencies');
    // watchEffect should extract identifiers from the function body
    assert.ok(watchEffectHook.dependencies?.includes('doubled') || watchEffectHook.dependencies?.includes('count'));
  });

  it('should detect watch() assigned to variable', async () => {
    const code = `
      const count = ref(0);
      const stopWatch = watch(count, (newValue) => {
        console.log('count:', newValue);
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(watchers.length, 1, 'Should find 1 watcher');

    const watchHook = watchers[0];
    assert.strictEqual(watchHook.hookName, 'watch');
    assert.strictEqual(watchHook.variables.length, 1);
    assert.strictEqual(watchHook.variables[0], 'stopWatch');
    assert.ok(watchHook.dependencies?.includes('count'));
  });

  it('should handle multiple watchers', async () => {
    const code = `
      const count = ref(0);
      const message = ref('');
      const user = reactive({ name: 'John' });

      watch(count, (newValue) => {
        console.log('count:', newValue);
      });

      watchEffect(() => {
        console.log('message:', message.value);
      });

      watch(() => user.name, (newName) => {
        console.log('name:', newName);
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(watchers.length, 3, 'Should find 3 watchers');

    const watchHooks = watchers.filter(w => w.hookName === 'watch');
    const watchEffectHooks = watchers.filter(w => w.hookName === 'watchEffect');

    assert.strictEqual(watchHooks.length, 2, 'Should find 2 watch calls');
    assert.strictEqual(watchEffectHooks.length, 1, 'Should find 1 watchEffect call');
  });

  it('should classify returned properties from composables', async () => {
    const code = `
      const { count, increment, decrement } = useCounter();
      const { data, error, isLoading, refetch } = useQuery();
      const { value, setValue } = useLocalStorage();
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 3, 'Should find 3 composables');

    // Check useCounter
    const useCounterHook = composables.find(h => h.hookName === 'useCounter');
    assert.ok(useCounterHook, 'Should find useCounter');
    assert.ok(useCounterHook?.variableTypes, 'Should have variableTypes');
    assert.strictEqual(useCounterHook?.variableTypes?.get('count'), 'data', 'count should be data');
    assert.strictEqual(useCounterHook?.variableTypes?.get('increment'), 'function', 'increment should be function');
    assert.strictEqual(useCounterHook?.variableTypes?.get('decrement'), 'function', 'decrement should be function');

    // Check useQuery
    const useQueryHook = composables.find(h => h.hookName === 'useQuery');
    assert.ok(useQueryHook, 'Should find useQuery');
    assert.ok(useQueryHook?.variableTypes, 'Should have variableTypes');
    assert.strictEqual(useQueryHook?.variableTypes?.get('data'), 'data', 'data should be data');
    assert.strictEqual(useQueryHook?.variableTypes?.get('error'), 'data', 'error should be data');
    assert.strictEqual(useQueryHook?.variableTypes?.get('isLoading'), 'data', 'isLoading should be data');
    assert.strictEqual(useQueryHook?.variableTypes?.get('refetch'), 'function', 'refetch should be function');

    // Check useLocalStorage
    const useLocalStorageHook = composables.find(h => h.hookName === 'useLocalStorage');
    assert.ok(useLocalStorageHook, 'Should find useLocalStorage');
    assert.ok(useLocalStorageHook?.variableTypes, 'Should have variableTypes');
    assert.strictEqual(useLocalStorageHook?.variableTypes?.get('value'), 'data', 'value should be data');
    assert.strictEqual(useLocalStorageHook?.variableTypes?.get('setValue'), 'function', 'setValue should be function');
  });

  it('should not classify lifecycle hooks or watchers', async () => {
    const code = `
      onMounted(() => {
        console.log('mounted');
      });

      watch(count, (newValue) => {
        console.log('count:', newValue);
      });
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { lifecycle, watchers } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(lifecycle.length, 1, 'Should find 1 lifecycle hook');
    assert.strictEqual(watchers.length, 1, 'Should find 1 watcher');

    // Lifecycle hooks and watchers should not have variableTypes
    assert.strictEqual(lifecycle[0].variableTypes, undefined, 'Lifecycle hook should not have variableTypes');
    assert.strictEqual(watchers[0].variableTypes, undefined, 'Watcher should not have variableTypes');
  });

  it('should handle composables with common function name patterns', async () => {
    const code = `
      const { handleSubmit, onError, getData, updateUser, deleteItem, createPost } = useForm();
    `;

    const module = parseSync(code, {
      syntax: 'typescript',
      tsx: false,
    });

    const analyzer = new VueComposablesAnalyzer();
    analyzer.setSourceCode(code);
    const { composables } = await analyzer.analyzeComposablesAndLifecycle(module);

    assert.strictEqual(composables.length, 1, 'Should find 1 composable');

    const useFormHook = composables[0];
    assert.ok(useFormHook.variableTypes, 'Should have variableTypes');
    assert.strictEqual(useFormHook.variableTypes?.get('handleSubmit'), 'function', 'handleSubmit should be function');
    assert.strictEqual(useFormHook.variableTypes?.get('onError'), 'function', 'onError should be function');
    assert.strictEqual(useFormHook.variableTypes?.get('getData'), 'function', 'getData should be function');
    assert.strictEqual(useFormHook.variableTypes?.get('updateUser'), 'function', 'updateUser should be function');
    assert.strictEqual(useFormHook.variableTypes?.get('deleteItem'), 'function', 'deleteItem should be function');
    assert.strictEqual(useFormHook.variableTypes?.get('createPost'), 'function', 'createPost should be function');
  });
});
