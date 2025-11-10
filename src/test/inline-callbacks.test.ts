/**
 * Tests for inline callback extraction from JSX
 */

import * as assert from 'assert';
import { parseSync } from '@swc/core';
import { SWCASTAnalyzer } from '../parser/ast-analyzer';

suite('Inline Callbacks Test Suite', () => {
  test('Should extract inline callbacks from JSX attributes', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function WithInlineCallbacks({ initialValue }: { initialValue: number }) {
        const [count, setCount] = useState(initialValue);
        const [text, setText] = useState('');

        return (
          <div>
            <h1>Inline Callbacks Example</h1>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <button onClick={() => setCount(count - 1)}>Decrement</button>
            <button onClick={() => setCount(0)}>Reset</button>
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
            />
            <button onClick={() => {
              console.log('Count:', count);
              console.log('Text:', text);
            }}>
              Log Values
            </button>
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
    assert.strictEqual(analysis.componentName, 'WithInlineCallbacks');

    // Check that inline callbacks were extracted
    const inlineCallbacks = analysis.processes.filter(p => p.name.startsWith('inline_'));
    assert.ok(inlineCallbacks.length > 0, 'Should have extracted inline callbacks');

    // Check for onClick inline callbacks
    const onClickCallbacks = inlineCallbacks.filter(p => p.name.includes('onClick'));
    assert.ok(onClickCallbacks.length >= 3, 'Should have at least 3 onClick inline callbacks');

    // Check for onChange inline callback
    const onChangeCallbacks = inlineCallbacks.filter(p => p.name.includes('onChange'));
    assert.strictEqual(onChangeCallbacks.length, 1, 'Should have 1 onChange inline callback');

    // Verify that inline callbacks are marked as event-handler type
    inlineCallbacks.forEach(callback => {
      assert.strictEqual(callback.type, 'event-handler', 'Inline callbacks should be event-handler type');
    });
  });

  test('Should analyze variable references in inline callbacks', async () => {
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

    // Find the increment inline callback
    const incrementCallback = analysis.processes.find(p => 
      p.name.startsWith('inline_onClick') && 
      p.references.includes('count') && 
      p.references.includes('setCount')
    );

    assert.ok(incrementCallback, 'Should find increment inline callback');
    assert.ok(incrementCallback.references.includes('count'), 'Should reference count variable');
    assert.ok(incrementCallback.references.includes('setCount'), 'Should reference setCount function');
  });

  test('Should analyze variable references in onChange inline callback', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [text, setText] = useState('');

        return (
          <input onChange={(e) => setText(e.target.value)} />
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

    // Find the onChange inline callback
    const onChangeCallback = analysis.processes.find(p => 
      p.name.startsWith('inline_onChange')
    );

    assert.ok(onChangeCallback, 'Should find onChange inline callback');
    assert.ok(onChangeCallback.references.includes('setText'), 'Should reference setText function');
  });

  test('Should handle inline callbacks with multiple statements', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [count, setCount] = useState(0);
        const [text, setText] = useState('');

        return (
          <button onClick={() => {
            console.log('Count:', count);
            console.log('Text:', text);
          }}>
            Log Values
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

    // Find the log values inline callback (has multiple statements)
    const logCallback = analysis.processes.find(p => 
      p.name.startsWith('inline_onClick') && 
      p.references.includes('count') && 
      p.references.includes('text') &&
      p.references.includes('console')
    );

    assert.ok(logCallback, 'Should find log values inline callback');
    assert.ok(logCallback.references.includes('count'), 'Should reference count variable');
    assert.ok(logCallback.references.includes('text'), 'Should reference text variable');
  });

  test('Should not extract inline callbacks when using named handler references', async () => {
    const sourceCode = `
      import React, { useState } from 'react';

      export default function Component() {
        const [count, setCount] = useState(0);

        const handleIncrement = () => {
          setCount(count + 1);
        };

        return (
          <button onClick={handleIncrement}>Increment</button>
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

    // The key test: when onClick references a named function (not an inline arrow function),
    // no inline callback should be extracted
    const inlineCallbacks = analysis.processes.filter(p => p.name.startsWith('inline_'));
    assert.strictEqual(inlineCallbacks.length, 0, 'Should not extract inline callbacks when using named handler references');
  });
});
