/**
 * Tests for DFD cleanup function generation
 */

import * as assert from 'assert';
import { SWCASTParser, SWCProcessAnalyzer, DefaultDFDBuilder, ComponentAnalysis } from '@web-component-analyzer/analyzer';
import * as swc from '@swc/core';

/**
 * Helper function to extract function body from parsed module
 */
function extractFunctionBody(module: swc.Module): swc.Statement[] {
  for (const item of module.body) {
    if (item.type === 'FunctionDeclaration' && item.body) {
      return item.body.stmts;
    }
    if (item.type === 'VariableDeclaration') {
      for (const decl of item.declarations) {
        if (decl.init && 
            (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') &&
            decl.init.body && 
            decl.init.body.type === 'BlockStatement') {
          return decl.init.body.stmts;
        }
      }
    }
    if (item.type === 'ExportDefaultDeclaration') {
      const decl = item.decl;
      if (decl.type === 'FunctionExpression') {
        const funcExpr = decl as swc.FunctionExpression;
        if (funcExpr.body) {
          return funcExpr.body.stmts;
        }
      }
    }
  }
  return [];
}

suite('DFD Cleanup Function Test Suite', () => {
  let parser: SWCASTParser;
  let processAnalyzer: SWCProcessAnalyzer;
  let dfdBuilder: DefaultDFDBuilder;

  setup(() => {
    parser = new SWCASTParser();
    processAnalyzer = new SWCProcessAnalyzer();
    dfdBuilder = new DefaultDFDBuilder();
  });

  test('Should create cleanup process node for useEffect', async () => {
    const sourceCode = `
      function MyComponent() {
        const [count, setCount] = useState(0);
        useEffect(() => {
          const timer = setTimeout(() => {
            console.log(count);
          }, 1000);
          
          return () => clearTimeout(timer);
        }, [count]);
        return <div>{count}</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = extractFunctionBody(result.module!);
    const processes = processAnalyzer.analyzeProcesses(body);
    
    // Verify cleanup process was extracted
    const useEffectProcess = processes.find(p => p.type === 'useEffect');
    assert.ok(useEffectProcess, 'Should find useEffect process');
    assert.ok(useEffectProcess!.cleanupProcess, 'Should have cleanup process');

    // Create a minimal ComponentAnalysis for DFD builder
    const analysis: ComponentAnalysis = {
      componentName: 'MyComponent',
      componentType: 'functional',
      props: [],
      hooks: [],
      processes,
      jsxOutput: { simplified: '', placeholders: [], elements: [] }
    };

    const dfd = dfdBuilder.build(analysis);

    // Verify cleanup process node was created
    const cleanupNode = dfd.nodes.find(n => n.label === 'cleanup' && n.type === 'process');
    assert.ok(cleanupNode, 'Should create cleanup process node');
    assert.strictEqual(cleanupNode!.metadata?.processType, 'cleanup', 'Cleanup node should have cleanup type');
    assert.strictEqual(cleanupNode!.metadata?.parentProcess, 'useEffect', 'Cleanup should reference parent process');

    // Verify edge from useEffect to cleanup
    const useEffectNode = dfd.nodes.find(n => n.label === 'useEffect' && n.type === 'process');
    assert.ok(useEffectNode, 'Should have useEffect node');

    const cleanupEdge = dfd.edges.find(e => 
      e.from === useEffectNode!.id && 
      e.to === cleanupNode!.id
    );
    assert.ok(cleanupEdge, 'Should have edge from useEffect to cleanup');
    assert.strictEqual(cleanupEdge!.label, 'cleanup', 'Edge should have cleanup label');
    assert.strictEqual(cleanupEdge!.isCleanup, true, 'Edge should have isCleanup flag');
  });

  test('Should create external call nodes from cleanup function', async () => {
    const sourceCode = `
      function MyComponent() {
        useEffect(() => {
          const subscription = api.subscribe();
          
          return () => {
            api.unsubscribe(subscription);
            logger.log('cleanup');
          };
        }, []);
        return <div>Hello</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = extractFunctionBody(result.module!);
    const processes = processAnalyzer.analyzeProcesses(body);
    
    // Verify cleanup process with external calls
    const useEffectProcess = processes.find(p => p.type === 'useEffect');
    assert.ok(useEffectProcess, 'Should find useEffect process');
    assert.ok(useEffectProcess!.cleanupProcess, 'Should have cleanup process');
    assert.strictEqual(useEffectProcess!.cleanupProcess!.externalCalls.length, 2, 'Cleanup should have 2 external calls');

    // Create a minimal ComponentAnalysis for DFD builder
    const analysis: ComponentAnalysis = {
      componentName: 'MyComponent',
      componentType: 'functional',
      props: [],
      hooks: [],
      processes,
      jsxOutput: { simplified: '', placeholders: [], elements: [] }
    };

    const dfd = dfdBuilder.build(analysis);

    // Verify external call nodes from cleanup
    const apiUnsubscribeNode = dfd.nodes.find(n => 
      n.label === 'api.unsubscribe' && 
      n.type === 'external-entity-output' &&
      n.metadata?.category === 'external-call'
    );
    assert.ok(apiUnsubscribeNode, 'Should create api.unsubscribe node');

    const loggerLogNode = dfd.nodes.find(n => 
      n.label === 'logger.log' && 
      n.type === 'external-entity-output' &&
      n.metadata?.category === 'external-call'
    );
    assert.ok(loggerLogNode, 'Should create logger.log node');

    // Verify edges from cleanup to external calls
    const cleanupNode = dfd.nodes.find(n => n.label === 'cleanup' && n.type === 'process');
    assert.ok(cleanupNode, 'Should have cleanup node');

    const unsubscribeEdge = dfd.edges.find(e => 
      e.from === cleanupNode!.id && 
      e.to === apiUnsubscribeNode!.id
    );
    assert.ok(unsubscribeEdge, 'Should have edge from cleanup to api.unsubscribe');
    assert.strictEqual(unsubscribeEdge!.label, 'calls', 'Edge should have calls label');

    const logEdge = dfd.edges.find(e => 
      e.from === cleanupNode!.id && 
      e.to === loggerLogNode!.id
    );
    assert.ok(logEdge, 'Should have edge from cleanup to logger.log');
    assert.strictEqual(logEdge!.label, 'calls', 'Edge should have calls label');
  });

  test('Should handle useEffect without cleanup', async () => {
    const sourceCode = `
      function MyComponent() {
        useEffect(() => {
          console.log('mounted');
        }, []);
        return <div>Hello</div>;
      }
    `;

    const result = await parser.parseSourceCode(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const body = extractFunctionBody(result.module!);
    const processes = processAnalyzer.analyzeProcesses(body);
    
    // Verify no cleanup process
    const useEffectProcess = processes.find(p => p.type === 'useEffect');
    assert.ok(useEffectProcess, 'Should find useEffect process');
    assert.strictEqual(useEffectProcess!.cleanupProcess, undefined, 'Should not have cleanup process');

    // Create a minimal ComponentAnalysis for DFD builder
    const analysis: ComponentAnalysis = {
      componentName: 'MyComponent',
      componentType: 'functional',
      props: [],
      hooks: [],
      processes,
      jsxOutput: { simplified: '', placeholders: [], elements: [] }
    };

    const dfd = dfdBuilder.build(analysis);

    // Verify no cleanup node was created
    const cleanupNode = dfd.nodes.find(n => n.label === 'cleanup' && n.type === 'process');
    assert.strictEqual(cleanupNode, undefined, 'Should not create cleanup node');
  });
});
