/**
 * Tests for Hooks Analyzer
 */

import * as assert from 'assert';
import { SWCASTParser, SWCHooksAnalyzer } from '@web-component-analyzer/analyzer';

suite('Hooks Analyzer Test Suite', () => {
  let parser: SWCASTParser;
  let analyzer: SWCHooksAnalyzer;

  setup(() => {
    parser = new SWCASTParser();
    analyzer = new SWCHooksAnalyzer();
  });

  test('Extract useState hook with read-write pair', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useState(0);
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useState', 'Hook should be useState');
    assert.strictEqual(hooks[0].category, 'state', 'Category should be state');
    assert.strictEqual(hooks[0].variables.length, 2, 'Should have 2 variables');
    assert.strictEqual(hooks[0].variables[0], 'count', 'First variable should be count');
    assert.strictEqual(hooks[0].variables[1], 'setCount', 'Second variable should be setCount');
    assert.strictEqual(hooks[0].isReadWritePair, true, 'Should be a read-write pair');
  });

  test('Extract useEffect hook with dependencies', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useState(0);
        useEffect(() => {
          console.log(count);
        }, [count]);
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    const useEffectHook = hooks.find(h => h.hookName === 'useEffect');
    assert.ok(useEffectHook, 'Should find useEffect hook');
    assert.strictEqual(useEffectHook!.category, 'effect', 'Category should be effect');
    assert.ok(useEffectHook!.dependencies, 'Should have dependencies');
    assert.strictEqual(useEffectHook!.dependencies!.length, 1, 'Should have 1 dependency');
    assert.strictEqual(useEffectHook!.dependencies![0], 'count', 'Dependency should be count');
  });

  test('Extract useContext hook', async () => {
    const sourceCode = `
      function MyComponent() {
        const theme = useContext(ThemeContext);
        return <div>{theme}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useContext', 'Hook should be useContext');
    assert.strictEqual(hooks[0].category, 'context', 'Category should be context');
    assert.strictEqual(hooks[0].variables.length, 1, 'Should have 1 variable');
    assert.strictEqual(hooks[0].variables[0], 'theme', 'Variable should be theme');
  });

  test('Extract useContext with destructured read-write pair', async () => {
    const sourceCode = `
      function MyComponent() {
        const { value, setValue } = useContext(MyContext);
        return <div>{value}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useContext', 'Hook should be useContext');
    assert.strictEqual(hooks[0].variables.length, 2, 'Should have 2 variables');
    assert.strictEqual(hooks[0].variables[0], 'value', 'First variable should be value');
    assert.strictEqual(hooks[0].variables[1], 'setValue', 'Second variable should be setValue');
    assert.strictEqual(hooks[0].isReadWritePair, true, 'Should be a read-write pair');
  });

  test('Extract useContext with function-only pattern', async () => {
    const sourceCode = `
      function MyComponent() {
        const { logout, updateProfile } = useContext(AuthContext);
        return <div>Auth</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useContext', 'Hook should be useContext');
    assert.strictEqual(hooks[0].variables.length, 2, 'Should have 2 variables');
    assert.strictEqual(hooks[0].isFunctionOnly, true, 'Should be function-only');
  });

  test('Extract useSWR data fetching hook', async () => {
    const sourceCode = `
      function MyComponent() {
        const { data, error } = useSWR('/api/user', fetcher);
        return <div>{data}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useSWR', 'Hook should be useSWR');
    assert.strictEqual(hooks[0].category, 'data-fetching', 'Category should be data-fetching');
    assert.strictEqual(hooks[0].variables.length, 2, 'Should have 2 variables');
    assert.strictEqual(hooks[0].variables[0], 'data', 'First variable should be data');
    assert.strictEqual(hooks[0].variables[1], 'error', 'Second variable should be error');
  });

  test('Extract useQuery from TanStack Query', async () => {
    const sourceCode = `
      function MyComponent() {
        const { data, isLoading } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
        return <div>{data}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useQuery', 'Hook should be useQuery');
    assert.strictEqual(hooks[0].category, 'data-fetching', 'Category should be data-fetching');
  });

  test('Extract useAtom from Jotai', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useAtom(countAtom);
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useAtom', 'Hook should be useAtom');
    assert.strictEqual(hooks[0].category, 'state-management', 'Category should be state-management');
    assert.strictEqual(hooks[0].isReadWritePair, true, 'Should be a read-write pair');
  });

  test('Extract useSelector from Redux', async () => {
    const sourceCode = `
      function MyComponent() {
        const user = useSelector(state => state.user);
        return <div>{user.name}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useSelector', 'Hook should be useSelector');
    assert.strictEqual(hooks[0].category, 'state-management', 'Category should be state-management');
  });

  test('Extract useForm from React Hook Form', async () => {
    const sourceCode = `
      function MyComponent() {
        const { register, handleSubmit } = useForm();
        return <form onSubmit={handleSubmit}></form>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useForm', 'Hook should be useForm');
    assert.strictEqual(hooks[0].category, 'form', 'Category should be form');
    assert.strictEqual(hooks[0].variables.length, 2, 'Should have 2 variables');
  });

  test('Extract useNavigate from React Router', async () => {
    const sourceCode = `
      function MyComponent() {
        const navigate = useNavigate();
        return <button onClick={() => navigate('/home')}>Go Home</button>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useNavigate', 'Hook should be useNavigate');
    assert.strictEqual(hooks[0].category, 'routing', 'Category should be routing');
  });

  test('Extract useParams from React Router', async () => {
    const sourceCode = `
      function MyComponent() {
        const { id } = useParams();
        return <div>ID: {id}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useParams', 'Hook should be useParams');
    assert.strictEqual(hooks[0].category, 'routing', 'Category should be routing');
  });

  test('Extract useFormState from Next.js Server Actions', async () => {
    const sourceCode = `
      function MyComponent() {
        const [state, formAction] = useFormState(submitAction, initialState);
        return <form action={formAction}></form>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 1, 'Should extract 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useFormState', 'Hook should be useFormState');
    assert.strictEqual(hooks[0].category, 'server-action', 'Category should be server-action');
  });

  test('Extract multiple hooks from component', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useState(0);
        const [name, setName] = useState('');
        const theme = useContext(ThemeContext);
        useEffect(() => {
          console.log(count);
        }, [count]);
        return <div>{count} {name} {theme}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 4, 'Should extract 4 hooks');
    
    const useStateHooks = hooks.filter(h => h.hookName === 'useState');
    assert.strictEqual(useStateHooks.length, 2, 'Should have 2 useState hooks');
    
    const useContextHook = hooks.find(h => h.hookName === 'useContext');
    assert.ok(useContextHook, 'Should have useContext hook');
    
    const useEffectHook = hooks.find(h => h.hookName === 'useEffect');
    assert.ok(useEffectHook, 'Should have useEffect hook');
  });

  test('Extract useCallback with dependencies', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useState(0);
        const handleClick = useCallback(() => {
          setCount(count + 1);
        }, [count]);
        return <button onClick={handleClick}>Click</button>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    const useCallbackHook = hooks.find(h => h.hookName === 'useCallback');
    assert.ok(useCallbackHook, 'Should find useCallback hook');
    assert.strictEqual(useCallbackHook!.category, 'effect', 'Category should be effect');
    assert.ok(useCallbackHook!.dependencies, 'Should have dependencies');
    assert.strictEqual(useCallbackHook!.dependencies!.length, 1, 'Should have 1 dependency');
  });

  test('Extract useMemo with dependencies', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useState(0);
        const doubled = useMemo(() => count * 2, [count]);
        return <div>{doubled}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    const useMemoHook = hooks.find(h => h.hookName === 'useMemo');
    assert.ok(useMemoHook, 'Should find useMemo hook');
    assert.strictEqual(useMemoHook!.category, 'effect', 'Category should be effect');
    assert.ok(useMemoHook!.dependencies, 'Should have dependencies');
  });

  test('Handle component with no hooks', async () => {
    const sourceCode = `
      function MyComponent({ name }) {
        return <div>{name}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 0, 'Should extract 0 hooks');
  });

  test('Ignore non-hook function calls', async () => {
    const sourceCode = `
      function MyComponent() {
        const result = calculateTotal(10, 20);
        const data = fetchData();
        return <div>{result}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = result.module!.body;
    const hooks = await analyzer.analyzeHooks(body);
    
    assert.strictEqual(hooks.length, 0, 'Should not extract non-hook calls');
  });
});
