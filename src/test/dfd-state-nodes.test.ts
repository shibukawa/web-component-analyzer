/**
 * Tests for DFD state node generation
 */

import * as assert from 'assert';
import { SWCASTParser } from '../parser/ast-parser';
import { SWCHooksAnalyzer } from '../analyzers/hooks-analyzer';
import { SWCJSXAnalyzer } from '../analyzers/jsx-analyzer';
import { DefaultDFDBuilder } from '../parser/dfd-builder';
import { ComponentAnalysis, JSXInfo } from '../parser/types';

suite('DFD State Nodes Test Suite', () => {
  let parser: SWCASTParser;
  let hooksAnalyzer: SWCHooksAnalyzer;
  let jsxAnalyzer: SWCJSXAnalyzer;

  setup(() => {
    parser = new SWCASTParser();
    hooksAnalyzer = new SWCHooksAnalyzer();
    jsxAnalyzer = new SWCJSXAnalyzer();
  });

  test('Should create single node for useState read-write pair', async () => {
    const sourceCode = `
      function Component() {
        const [count, setCount] = useState(0);
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const hooks = await hooksAnalyzer.analyzeHooks(result.module!.body);
    
    // Verify hooks were analyzed
    assert.strictEqual(hooks.length, 1, 'Should have 1 hook');
    assert.strictEqual(hooks[0].hookName, 'useState', 'Should be useState');
    assert.strictEqual(hooks[0].isReadWritePair, true, 'Should be read-write pair');

    // Create a minimal ComponentAnalysis for DFD builder
    const analysis: ComponentAnalysis = {
      componentName: 'Component',
      componentType: 'functional',
      props: [],
      hooks,
      processes: [],
      jsxOutput: { simplified: '', placeholders: [] }
    };

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Should create only ONE data-store node for the useState pair
    const dataStoreNodes = dfd.nodes.filter(node => node.type === 'data-store');
    assert.strictEqual(dataStoreNodes.length, 1, 'Should have exactly 1 data-store node for useState pair');

    // The node should be labeled with the read variable name
    const stateNode = dataStoreNodes[0];
    assert.strictEqual(stateNode.label, 'count', 'Node should be labeled with read variable name');
    assert.strictEqual(stateNode.metadata?.isReadWritePair, true, 'Should be marked as read-write pair');
    assert.strictEqual(stateNode.metadata?.readVariable, 'count', 'Should have read variable metadata');
    assert.strictEqual(stateNode.metadata?.writeVariable, 'setCount', 'Should have write variable metadata');
  });

  test('Should create single node for multiple useState hooks', async () => {
    const sourceCode = `
      function Component() {
        const [count, setCount] = useState(0);
        const [text, setText] = useState('');
        const [enabled, setEnabled] = useState(true);

        return <div>{count} {text} {enabled}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const hooks = await hooksAnalyzer.analyzeHooks(result.module!.body);
    
    // Verify hooks were analyzed
    assert.strictEqual(hooks.length, 3, 'Should have 3 hooks');

    const analysis: ComponentAnalysis = {
      componentName: 'Component',
      componentType: 'functional',
      props: [],
      hooks,
      processes: [],
      jsxOutput: { simplified: '', placeholders: [] }
    };

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Should create exactly 3 data-store nodes (one for each useState)
    const dataStoreNodes = dfd.nodes.filter(node => node.type === 'data-store');
    assert.strictEqual(dataStoreNodes.length, 3, 'Should have exactly 3 data-store nodes');

    // Verify each node is labeled with the read variable
    const labels = dataStoreNodes.map(node => node.label).sort();
    assert.deepStrictEqual(labels, ['count', 'enabled', 'text'], 'Should have correct labels');

    // Verify all are marked as read-write pairs
    dataStoreNodes.forEach(node => {
      assert.strictEqual(node.metadata?.isReadWritePair, true, 'Each should be marked as read-write pair');
    });
  });

  test('Should create single node for useAtom read-write pair', async () => {
    const sourceCode = `
      function Component() {
        const [count, setCount] = useAtom(countAtom);

        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const hooks = await hooksAnalyzer.analyzeHooks(result.module!.body);
    
    // Verify hooks were analyzed
    assert.strictEqual(hooks.length, 1, 'Should have 1 hook');

    const analysis: ComponentAnalysis = {
      componentName: 'Component',
      componentType: 'functional',
      props: [],
      hooks,
      processes: [],
      jsxOutput: { simplified: '', placeholders: [] }
    };

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Should create only ONE data-store node for the useAtom pair
    const dataStoreNodes = dfd.nodes.filter(node => node.type === 'data-store');
    assert.strictEqual(dataStoreNodes.length, 1, 'Should have exactly 1 data-store node for useAtom pair');

    const stateNode = dataStoreNodes[0];
    assert.strictEqual(stateNode.label, 'count', 'Node should be labeled with read variable name');
    assert.strictEqual(stateNode.metadata?.isReadWritePair, true, 'Should be marked as read-write pair');
  });

  test('Should create edge from data store to JSX output when state is displayed', async () => {
    const sourceCode = `
      function Component() {
        const [count, setCount] = useState(0);
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const hooks = await hooksAnalyzer.analyzeHooks(result.module!.body);
    
    // Find the return statement
    let jsxInfo: JSXInfo = { simplified: '', placeholders: [] };
    for (const item of result.module!.body) {
      if (item.type === 'FunctionDeclaration') {
        const funcDecl = item as any;
        if (funcDecl.body && funcDecl.body.stmts) {
          for (const stmt of funcDecl.body.stmts) {
            if (stmt.type === 'ReturnStatement') {
              const analyzed = jsxAnalyzer.analyzeJSX(stmt);
              if (analyzed) {
                jsxInfo = analyzed;
              }
            }
          }
        }
      }
    }

    const analysis: ComponentAnalysis = {
      componentName: 'Component',
      componentType: 'functional',
      props: [],
      hooks,
      processes: [],
      jsxOutput: jsxInfo
    };

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Should have a data-store node for count
    const dataStoreNodes = dfd.nodes.filter(node => node.type === 'data-store');
    assert.strictEqual(dataStoreNodes.length, 1, 'Should have 1 data-store node');
    assert.strictEqual(dataStoreNodes[0].label, 'count', 'Data store should be labeled count');

    // Should have a JSX output node
    const jsxNodes = dfd.nodes.filter(node => 
      node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );
    assert.strictEqual(jsxNodes.length, 1, 'Should have 1 JSX output node');

    // Should have an edge from data store to JSX output
    const dataStoreToJSXEdges = dfd.edges.filter(edge => 
      edge.from === dataStoreNodes[0].id && edge.to === jsxNodes[0].id
    );
    assert.strictEqual(dataStoreToJSXEdges.length, 1, 'Should have 1 edge from data store to JSX');
    assert.strictEqual(dataStoreToJSXEdges[0].label, 'displays', 'Edge should be labeled "displays"');
  });

  test('Should create edges for multiple state variables displayed in JSX', async () => {
    const sourceCode = `
      function Component() {
        const [count, setCount] = useState(0);
        const [text, setText] = useState('hello');
        const [enabled, setEnabled] = useState(true);
        return <div>{count} {text} {enabled}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const hooks = await hooksAnalyzer.analyzeHooks(result.module!.body);
    
    // Find the return statement
    let jsxInfo: JSXInfo = { simplified: '', placeholders: [] };
    for (const item of result.module!.body) {
      if (item.type === 'FunctionDeclaration') {
        const funcDecl = item as any;
        if (funcDecl.body && funcDecl.body.stmts) {
          for (const stmt of funcDecl.body.stmts) {
            if (stmt.type === 'ReturnStatement') {
              const analyzed = jsxAnalyzer.analyzeJSX(stmt);
              if (analyzed) {
                jsxInfo = analyzed;
              }
            }
          }
        }
      }
    }

    const analysis: ComponentAnalysis = {
      componentName: 'Component',
      componentType: 'functional',
      props: [],
      hooks,
      processes: [],
      jsxOutput: jsxInfo
    };

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Should have 3 data-store nodes
    const dataStoreNodes = dfd.nodes.filter(node => node.type === 'data-store');
    assert.strictEqual(dataStoreNodes.length, 3, 'Should have 3 data-store nodes');

    // Should have a JSX output node
    const jsxNodes = dfd.nodes.filter(node => 
      node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );
    assert.strictEqual(jsxNodes.length, 1, 'Should have 1 JSX output node');

    // Should have edges from all 3 data stores to JSX output
    const dataStoreToJSXEdges = dfd.edges.filter(edge => 
      dataStoreNodes.some(node => node.id === edge.from) && edge.to === jsxNodes[0].id
    );
    assert.strictEqual(dataStoreToJSXEdges.length, 3, 'Should have 3 edges from data stores to JSX');
    
    // All edges should be labeled "displays"
    dataStoreToJSXEdges.forEach(edge => {
      assert.strictEqual(edge.label, 'displays', 'Each edge should be labeled "displays"');
    });
  });

  test('Should not create edge when state variable is not displayed in JSX', async () => {
    const sourceCode = `
      function Component() {
        const [count, setCount] = useState(0);
        const [text, setText] = useState('hello');
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const hooks = await hooksAnalyzer.analyzeHooks(result.module!.body);
    
    // Find the return statement
    let jsxInfo: JSXInfo = { simplified: '', placeholders: [] };
    for (const item of result.module!.body) {
      if (item.type === 'FunctionDeclaration') {
        const funcDecl = item as any;
        if (funcDecl.body && funcDecl.body.stmts) {
          for (const stmt of funcDecl.body.stmts) {
            if (stmt.type === 'ReturnStatement') {
              const analyzed = jsxAnalyzer.analyzeJSX(stmt);
              if (analyzed) {
                jsxInfo = analyzed;
              }
            }
          }
        }
      }
    }

    const analysis: ComponentAnalysis = {
      componentName: 'Component',
      componentType: 'functional',
      props: [],
      hooks,
      processes: [],
      jsxOutput: jsxInfo
    };

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Should have 2 data-store nodes
    const dataStoreNodes = dfd.nodes.filter(node => node.type === 'data-store');
    assert.strictEqual(dataStoreNodes.length, 2, 'Should have 2 data-store nodes');

    // Should have a JSX output node
    const jsxNodes = dfd.nodes.filter(node => 
      node.type === 'external-entity-output' && node.metadata?.category === 'jsx'
    );
    assert.strictEqual(jsxNodes.length, 1, 'Should have 1 JSX output node');

    // Should have only 1 edge (for count, not text)
    const dataStoreToJSXEdges = dfd.edges.filter(edge => 
      dataStoreNodes.some(node => node.id === edge.from) && edge.to === jsxNodes[0].id
    );
    assert.strictEqual(dataStoreToJSXEdges.length, 1, 'Should have only 1 edge from data store to JSX');
    
    // Find the count node
    const countNode = dataStoreNodes.find(node => node.label === 'count');
    assert.ok(countNode, 'Should have count node');
    
    // Verify the edge is from count node
    const countEdge = dataStoreToJSXEdges.find(edge => edge.from === countNode!.id);
    assert.ok(countEdge, 'Should have edge from count node');
    assert.strictEqual(countEdge!.label, 'displays', 'Edge should be labeled "displays"');
  });
});
