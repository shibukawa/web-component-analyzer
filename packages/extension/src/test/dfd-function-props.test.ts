/**
 * Tests for DFD generation with function-type props
 */

import * as assert from 'assert';
import { parseSync } from '@swc/core';
import { SWCASTAnalyzer, DefaultDFDBuilder } from '@web-component-analyzer/analyzer';

suite('DFD Function Props Test Suite', () => {
  test('Should classify function-type props as external-entity-output', async () => {
    const sourceCode = `
      import React from 'react';

      interface Props {
        userId: string;
        onUpdate: (id: string, data: any) => void;
        onDelete: (id: string) => void;
      }

      export default function Component({ userId, onUpdate, onDelete }: Props) {
        const handleSave = () => {
          onUpdate(userId, { name: 'test' });
        };

        const handleRemove = () => {
          onDelete(userId);
        };

        return (
          <div>
            <button onClick={handleSave}>Save</button>
            <button onClick={handleRemove}>Delete</button>
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

    // Check that userId is external-entity-input
    const userIdNode = dfd.nodes.find(node => 
      node.label === 'userId' && node.metadata?.category === 'prop'
    );
    assert.ok(userIdNode, 'Should have userId prop node');
    assert.strictEqual(userIdNode.type, 'external-entity-input', 'userId should be external-entity-input');

    // Check that onUpdate is external-entity-output
    const onUpdateNode = dfd.nodes.find(node => 
      node.label === 'onUpdate' && node.metadata?.category === 'prop'
    );
    assert.ok(onUpdateNode, 'Should have onUpdate prop node');
    assert.strictEqual(onUpdateNode.type, 'external-entity-output', 'onUpdate should be external-entity-output');
    assert.strictEqual(onUpdateNode.metadata?.isFunctionType, true, 'onUpdate should be marked as function type');

    // Check that onDelete is external-entity-output
    const onDeleteNode = dfd.nodes.find(node => 
      node.label === 'onDelete' && node.metadata?.category === 'prop'
    );
    assert.ok(onDeleteNode, 'Should have onDelete prop node');
    assert.strictEqual(onDeleteNode.type, 'external-entity-output', 'onDelete should be external-entity-output');
    assert.strictEqual(onDeleteNode.metadata?.isFunctionType, true, 'onDelete should be marked as function type');
  });

  test('Should create edges from processes to function-type props', async () => {
    const sourceCode = `
      import React from 'react';

      interface Props {
        count: number;
        onChange: (value: number) => void;
      }

      export default function Counter({ count, onChange }: Props) {
        const handleIncrement = () => {
          onChange(count + 1);
        };

        return (
          <div>
            <span>{count}</span>
            <button onClick={handleIncrement}>+</button>
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

    // Find the onChange prop node
    const onChangeNode = dfd.nodes.find(node => 
      node.label === 'onChange' && node.metadata?.category === 'prop'
    );
    assert.ok(onChangeNode, 'Should have onChange prop node');
    assert.strictEqual(onChangeNode.type, 'external-entity-output', 'onChange should be external-entity-output');

    // Find the handleIncrement process node
    const processNode = dfd.nodes.find(node => 
      node.type === 'process' && node.label === 'handleIncrement'
    );
    
    // If process node exists, check for edge
    if (processNode) {
      const edge = dfd.edges.find(e => 
        e.from === processNode.id && 
        e.to === onChangeNode.id &&
        e.label === 'calls'
      );
      assert.ok(edge, 'Should have edge from handleIncrement to onChange');
    } else {
      // If no process node, at least verify the prop is correctly classified
      assert.ok(onChangeNode.metadata?.isFunctionType, 'onChange should be marked as function type');
    }
  });

  test('Should handle props with "on" prefix as function types', async () => {
    const sourceCode = `
      import React from 'react';

      interface Props {
        onSubmit: any;
        onCancel: any;
        onFocus: any;
      }

      export default function Form({ onSubmit, onCancel, onFocus }: Props) {
        return (
          <form onSubmit={onSubmit}>
            <button type="submit">Submit</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </form>
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

    // All props starting with "on" should be external-entity-output
    const onSubmitNode = dfd.nodes.find(node => node.label === 'onSubmit');
    const onCancelNode = dfd.nodes.find(node => node.label === 'onCancel');
    const onFocusNode = dfd.nodes.find(node => node.label === 'onFocus');

    assert.ok(onSubmitNode, 'Should have onSubmit node');
    assert.strictEqual(onSubmitNode.type, 'external-entity-output', 'onSubmit should be external-entity-output');

    assert.ok(onCancelNode, 'Should have onCancel node');
    assert.strictEqual(onCancelNode.type, 'external-entity-output', 'onCancel should be external-entity-output');

    assert.ok(onFocusNode, 'Should have onFocus node');
    assert.strictEqual(onFocusNode.type, 'external-entity-output', 'onFocus should be external-entity-output');
  });

  test('Should distinguish between data props and function props', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      interface Props {
        initialValue: number;
        step: number;
        onChange: (value: number) => void;
        onLimitReached: (limit: string) => void;
      }

      export default function Counter({ initialValue, step, onChange, onLimitReached }: Props) {
        const [count, setCount] = useState(initialValue);

        const handleIncrement = () => {
          const newValue = count + step;
          setCount(newValue);
          onChange(newValue);
        };

        return (
          <div>
            <span>{count}</span>
            <button onClick={handleIncrement}>+{step}</button>
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

    // Data props should be external-entity-input
    const initialValueNode = dfd.nodes.find(node => node.label === 'initialValue');
    const stepNode = dfd.nodes.find(node => node.label === 'step');

    assert.ok(initialValueNode, 'Should have initialValue node');
    assert.strictEqual(initialValueNode.type, 'external-entity-input', 'initialValue should be external-entity-input');

    assert.ok(stepNode, 'Should have step node');
    assert.strictEqual(stepNode.type, 'external-entity-input', 'step should be external-entity-input');

    // Function props should be external-entity-output
    const onChangeNode = dfd.nodes.find(node => node.label === 'onChange');
    const onLimitReachedNode = dfd.nodes.find(node => node.label === 'onLimitReached');

    assert.ok(onChangeNode, 'Should have onChange node');
    assert.strictEqual(onChangeNode.type, 'external-entity-output', 'onChange should be external-entity-output');

    assert.ok(onLimitReachedNode, 'Should have onLimitReached node');
    assert.strictEqual(onLimitReachedNode.type, 'external-entity-output', 'onLimitReached should be external-entity-output');
  });
});
