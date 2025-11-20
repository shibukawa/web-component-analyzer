/**
 * Tests for Vue Emits Analyzer
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VueEmitsAnalyzer } from './vue-emits-analyzer';
import { parseSync } from '@swc/core';

describe('VueEmitsAnalyzer', () => {
  describe('defineEmits with TypeScript generic syntax', () => {
    it('should extract emit definitions from type literal', async () => {
      const code = `
        const emit = defineEmits<{
          submit: [data: FormData]
          cancel: []
        }>();
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emits } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emits.length, 2);
      assert.strictEqual(emits[0].name, 'submit');
      assert.strictEqual(emits[1].name, 'cancel');
    });

    it('should extract emit definitions with method signature', async () => {
      const code = `
        const emit = defineEmits<{
          submit(data: FormData): void
          cancel(): void
        }>();
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emits } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emits.length, 2);
      assert.strictEqual(emits[0].name, 'submit');
      assert.strictEqual(emits[0].dataType, 'FormData');
      assert.strictEqual(emits[1].name, 'cancel');
    });
  });

  describe('defineEmits with array syntax', () => {
    it('should extract emit definitions from array', async () => {
      const code = `
        const emit = defineEmits(['submit', 'cancel', 'update']);
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emits } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emits.length, 3);
      assert.strictEqual(emits[0].name, 'submit');
      assert.strictEqual(emits[1].name, 'cancel');
      assert.strictEqual(emits[2].name, 'update');
    });
  });

  describe('emit calls tracking', () => {
    it('should track emit calls in functions', async () => {
      const code = `
        const emit = defineEmits(['submit', 'cancel']);
        
        function handleSubmit() {
          emit('submit');
        }
        
        function handleCancel() {
          emit('cancel');
        }
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emits, emitCalls } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emits.length, 2);
      assert.strictEqual(emitCalls.length, 2);
      
      assert.strictEqual(emitCalls[0].eventName, 'submit');
      assert.strictEqual(emitCalls[0].callerProcess, 'handleSubmit');
      
      assert.strictEqual(emitCalls[1].eventName, 'cancel');
      assert.strictEqual(emitCalls[1].callerProcess, 'handleCancel');
    });

    it('should track emit calls in arrow functions', async () => {
      const code = `
        const emit = defineEmits(['update']);
        
        const handleUpdate = () => {
          emit('update');
        };
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emitCalls } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emitCalls.length, 1);
      assert.strictEqual(emitCalls[0].eventName, 'update');
      assert.strictEqual(emitCalls[0].callerProcess, 'handleUpdate');
    });

    it('should track emit calls in nested functions', async () => {
      const code = `
        const emit = defineEmits(['save']);
        
        function handleSave() {
          if (valid) {
            emit('save');
          }
        }
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emitCalls } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emitCalls.length, 1);
      assert.strictEqual(emitCalls[0].eventName, 'save');
      assert.strictEqual(emitCalls[0].callerProcess, 'handleSave');
    });
  });

  describe('edge cases', () => {
    it('should handle standalone defineEmits without variable assignment', async () => {
      const code = `
        defineEmits(['submit']);
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emits } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emits.length, 1);
      assert.strictEqual(emits[0].name, 'submit');
    });

    it('should handle empty emits', async () => {
      const code = `
        const emit = defineEmits([]);
      `;

      const module = parseSync(code, {
        syntax: 'typescript',
        tsx: false,
      });

      const analyzer = new VueEmitsAnalyzer();
      analyzer.setSourceCode(code);
      const { emits } = await analyzer.analyzeEmits(module);

      assert.strictEqual(emits.length, 0);
    });
  });
});
