/**
 * Tests for DFD generation with inline callbacks
 */

import * as assert from 'assert';
import { parseSync } from '@swc/core';
import { SWCASTAnalyzer } from '../parser/ast-analyzer';
import { DefaultDFDBuilder } from '../parser/dfd-builder';

suite('DFD Inline Callbacks Test Suite', () => {
  test('Should create process nodes for inline callbacks', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [count, setCount] = useState(0);

        return (
          <div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <button onClick={() => setCount(count - 1)}>Decrement</button>
          </div>
        );
      }
    `;

    const module = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true,
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(module);

    assert.ok(analysis, 'Analysis should not be null');

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Check that process nodes were created for inline callbacks
    const processNodes = dfd.nodes.filter(node => node.type === 'process');
    const inlineCallbackNodes = processNodes.filter(node => node.label.startsWith('inline_'));

    assert.ok(inlineCallbackNodes.length >= 2, 'Should have at least 2 inline callback process nodes');
  });

  test('Should include inline callback metadata in process nodes', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [count, setCount] = useState(0);

        return (
          <button onClick={() => setCount(count + 1)}>Increment</button>
        );
      }
    `;

    const module = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true,
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(module);

    assert.ok(analysis, 'Analysis should not be null');

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Find the inline callback process node
    const inlineCallbackNode = dfd.nodes.find(node => 
      node.type === 'process' && node.label.startsWith('inline_onClick')
    );
    
    assert.ok(inlineCallbackNode, 'Should have inline callback process node');
    assert.strictEqual(inlineCallbackNode.metadata?.processType, 'event-handler', 'Should be marked as event-handler');
    assert.ok(Array.isArray(inlineCallbackNode.metadata?.references), 'Should have references array');
    assert.ok(inlineCallbackNode.metadata?.references.length > 0, 'Should have variable references');
  });

  test('Should create process nodes for multiple inline callbacks', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [count, setCount] = useState(0);
        const [text, setText] = useState('');

        return (
          <div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <button onClick={() => setCount(count - 1)}>Decrement</button>
            <input onChange={(e) => setText(e.target.value)} />
          </div>
        );
      }
    `;

    const module = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true,
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(module);

    assert.ok(analysis, 'Analysis should not be null');

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Find all inline callback process nodes
    const inlineCallbackNodes = dfd.nodes.filter(node => 
      node.type === 'process' && node.label.startsWith('inline_')
    );
    
    assert.ok(inlineCallbackNodes.length >= 3, 'Should have at least 3 inline callback process nodes');
    
    // Verify each has proper metadata
    inlineCallbackNodes.forEach(node => {
      assert.strictEqual(node.metadata?.processType, 'event-handler', 'Each should be marked as event-handler');
    });
  });

  test('Should create external output nodes for external calls in inline callbacks', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [count, setCount] = useState(0);

        return (
          <button onClick={() => {
            setCount(count + 1);
            api.logEvent('increment', count);
          }}>
            Increment
          </button>
        );
      }
    `;

    const module = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true,
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(module);

    assert.ok(analysis, 'Analysis should not be null');

    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis);

    // Find the external call node
    const externalCallNode = dfd.nodes.find(node => 
      node.type === 'external-entity-output' && 
      node.label === 'api.logEvent'
    );
    assert.ok(externalCallNode, 'Should have external call output node');

    // Find the inline callback process node
    const inlineCallbackNode = dfd.nodes.find(node => 
      node.type === 'process' && node.label.startsWith('inline_onClick')
    );
    assert.ok(inlineCallbackNode, 'Should have inline callback process node');

    // Check for edge from inline callback to external call
    const callEdge = dfd.edges.find(edge => 
      edge.from === inlineCallbackNode.id && 
      edge.to === externalCallNode.id &&
      edge.label === 'calls'
    );
    assert.ok(callEdge, 'Should have edge from inline callback to external call');
  });
});
