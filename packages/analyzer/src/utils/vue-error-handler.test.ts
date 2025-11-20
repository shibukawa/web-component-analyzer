/**
 * Tests for Vue Error Handler
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VueErrorHandler, VueAnalysisError, VueErrorCode, VueParsingContext } from './vue-error-handler';
import { VueSFCParseError } from '../parser/vue-sfc-parser';

describe('VueErrorHandler', () => {
  const createContext = (): VueParsingContext => ({
    filePath: '/test/Component.vue',
    sourceCode: '<template><div>Test</div></template><script setup>const x = 1;</script>',
    startTime: Date.now(),
  });

  describe('VueAnalysisError', () => {
    it('should create error with code and message', () => {
      const error = new VueAnalysisError(
        VueErrorCode.MISSING_SCRIPT_SETUP,
        'No script setup found',
        10,
        5,
        '/test/Component.vue'
      );

      assert.strictEqual(error.code, VueErrorCode.MISSING_SCRIPT_SETUP);
      assert.strictEqual(error.message, 'No script setup found');
      assert.strictEqual(error.line, 10);
      assert.strictEqual(error.column, 5);
      assert.strictEqual(error.filePath, '/test/Component.vue');
    });

    it('should generate user-friendly message for MISSING_SCRIPT_SETUP', () => {
      const error = new VueAnalysisError(
        VueErrorCode.MISSING_SCRIPT_SETUP,
        'No script setup found'
      );

      const message = error.getUserFriendlyMessage();
      assert.ok(message.includes('script setup'));
      assert.ok(message.includes('required'));
    });

    it('should generate user-friendly message for SYNTAX_ERROR with location', () => {
      const error = new VueAnalysisError(
        VueErrorCode.SYNTAX_ERROR,
        'Unexpected token',
        10,
        5
      );

      const message = error.getUserFriendlyMessage();
      assert.ok(message.includes('line 10'));
      assert.ok(message.includes('column 5'));
      assert.ok(message.includes('Syntax error'));
    });
  });

  describe('handleError', () => {
    it('should handle generic errors', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const error = new Error('Generic error');

      const parseError = handler.handleError(error, context);

      assert.ok(parseError.message);
      assert.ok(parseError.message.includes('error'));
    });

    it('should handle VueAnalysisError', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const error = new VueAnalysisError(
        VueErrorCode.SYNTAX_ERROR,
        'Syntax error',
        10,
        5
      );

      const parseError = handler.handleError(error, context);

      assert.ok(parseError.message.includes('Syntax error'));
      assert.strictEqual(parseError.line, 10);
      assert.strictEqual(parseError.column, 5);
    });
  });

  describe('handleSFCError', () => {
    it('should handle VueSFCParseError', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const error = new VueSFCParseError('Malformed SFC', 5, 10);

      const parseError = handler.handleSFCError(error, context);

      assert.ok(parseError.message.includes('Invalid Vue SFC'));
      assert.strictEqual(parseError.line, 5);
      assert.strictEqual(parseError.column, 10);
    });
  });

  describe('handleMissingScriptSetup', () => {
    it('should return appropriate error message', () => {
      const handler = new VueErrorHandler();
      const context = createContext();

      const parseError = handler.handleMissingScriptSetup(context);

      assert.ok(parseError.message.includes('script setup'));
      assert.ok(parseError.message.includes('required'));
    });
  });

  describe('handleMissingTemplate', () => {
    it('should return appropriate error message', () => {
      const handler = new VueErrorHandler();
      const context = createContext();

      const parseError = handler.handleMissingTemplate(context);

      assert.ok(parseError.message.includes('template'));
      assert.ok(parseError.message.includes('require'));
    });
  });

  describe('validateSFCStructure', () => {
    it('should return no errors for valid SFC', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const source = '<template><div>Test</div></template><script setup>const x = 1;</script>';

      const errors = handler.validateSFCStructure(source, context);

      assert.strictEqual(errors.length, 0);
    });

    it('should detect missing script setup', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const source = '<template><div>Test</div></template>';

      const errors = handler.validateSFCStructure(source, context);

      assert.ok(errors.length > 0);
      assert.ok(errors[0].message.includes('script setup'));
    });

    it('should detect missing template', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const source = '<script setup>const x = 1;</script>';

      const errors = handler.validateSFCStructure(source, context);

      assert.ok(errors.length > 0);
      assert.ok(errors[0].message.includes('template'));
    });

    it('should detect malformed script tags', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const source = '<template><div>Test</div></template><script setup>const x = 1;';

      const errors = handler.validateSFCStructure(source, context);

      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.message.includes('script')));
    });

    it('should detect malformed template tags', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const source = '<template><div>Test</div><script setup>const x = 1;</script>';

      const errors = handler.validateSFCStructure(source, context);

      assert.ok(errors.length > 0);
      assert.ok(errors.some(e => e.message.includes('template')));
    });
  });

  describe('timeout handling', () => {
    it('should detect timeout', () => {
      const handler = new VueErrorHandler();
      const startTime = Date.now() - 10000; // 10 seconds ago

      const isTimeout = handler.isTimeoutExceeded(startTime);

      assert.strictEqual(isTimeout, true);
    });

    it('should not detect timeout for recent start', () => {
      const handler = new VueErrorHandler();
      const startTime = Date.now();

      const isTimeout = handler.isTimeoutExceeded(startTime);

      assert.strictEqual(isTimeout, false);
    });

    it('should handle timeout and return partial results', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      context.startTime = Date.now() - 10000; // 10 seconds ago

      const dfdData = handler.handleTimeout(null, context);

      assert.strictEqual(dfdData.nodes.length, 0);
      assert.strictEqual(dfdData.edges.length, 0);
      assert.ok(dfdData.errors);
      assert.ok(dfdData.errors!.length > 0);
      assert.ok(dfdData.errors![0].message.includes('timed out'));
    });
  });

  describe('recoverPartialAnalysis', () => {
    it('should return null when no partial results', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const error = new Error('Test error');

      const result = handler.recoverPartialAnalysis(error, null, context);

      assert.strictEqual(result, null);
    });

    it('should return partial analysis when available', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const error = new Error('Test error');
      const partialResult = {
        componentName: 'TestComponent',
        props: [{ name: 'test', type: 'string', isDestructured: false }],
        hooks: [],
      };

      const result = handler.recoverPartialAnalysis(error, partialResult, context);

      assert.ok(result);
      assert.strictEqual(result?.componentName, 'TestComponent');
      assert.strictEqual(result?.props.length, 1);
      assert.strictEqual(result?.metadata?.partialAnalysis, true);
      assert.ok(result?.metadata?.error);
    });

    it('should return null when partial results are empty', () => {
      const handler = new VueErrorHandler();
      const context = createContext();
      const error = new Error('Test error');
      const partialResult = {
        componentName: 'TestComponent',
        props: [],
        hooks: [],
      };

      const result = handler.recoverPartialAnalysis(error, partialResult, context);

      assert.strictEqual(result, null);
    });
  });

  describe('createEmptyDFDData', () => {
    it('should create empty DFD data', () => {
      const handler = new VueErrorHandler();

      const dfdData = handler.createEmptyDFDData();

      assert.strictEqual(dfdData.nodes.length, 0);
      assert.strictEqual(dfdData.edges.length, 0);
      assert.ok(dfdData.errors);
      assert.strictEqual(dfdData.errors.length, 0);
    });

    it('should create empty DFD data with errors', () => {
      const handler = new VueErrorHandler();
      const errors = [{ message: 'Test error' }];

      const dfdData = handler.createEmptyDFDData(errors);

      assert.strictEqual(dfdData.nodes.length, 0);
      assert.strictEqual(dfdData.edges.length, 0);
      assert.ok(dfdData.errors);
      assert.strictEqual(dfdData.errors.length, 1);
      assert.strictEqual(dfdData.errors[0].message, 'Test error');
    });
  });
});
