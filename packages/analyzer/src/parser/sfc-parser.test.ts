/**
 * Tests for shared SFC parser
 */

import { describe, it, expect } from '@jest/globals';
import { SFCParser, SFCParseError } from './sfc-parser';

describe('SFCParser', () => {
  const parser = new SFCParser();

  describe('Vue SFC parsing', () => {
    it('should parse Vue SFC with script setup', () => {
      const source = `
<script setup lang="ts">
const count = ref(0);
</script>

<template>
  <div>{{ count }}</div>
</template>

<style scoped>
div { color: red; }
</style>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(result.script).toBeDefined();
      expect(result.script?.content).toContain('const count = ref(0)');
      expect(result.script?.lang).toBe('ts');
      expect(result.template).toBeDefined();
      expect(result.template?.content).toContain('{{ count }}');
      expect(result.styles).toBeDefined();
      expect(result.styles?.length).toBe(1);
    });

    it('should parse Vue SFC without styles', () => {
      const source = `
<script setup>
const message = 'Hello';
</script>

<template>
  <div>{{ message }}</div>
</template>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(result.script).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.styles).toBeUndefined();
    });
  });

  describe('Svelte SFC parsing', () => {
    it('should parse Svelte SFC with regular script', () => {
      const source = `
<script lang="ts">
  let count = $state(0);
</script>

<div>{count}</div>

<style>
  div { color: blue; }
</style>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template', // Svelte doesn't use template tag
        requireSetup: false,
      });

      expect(result.script).toBeDefined();
      expect(result.script?.content).toContain('let count = $state(0)');
      expect(result.script?.lang).toBe('ts');
      expect(result.styles).toBeDefined();
      expect(result.styles?.length).toBe(1);
    });

    it('should extract markup without template tags using extractMarkupWithoutTag', () => {
      const source = `
<script lang="ts">
  let { userName } = $props();
</script>

<div>
  <h1>Hello, {userName}!</h1>
</div>

<style>
  div { color: blue; }
</style>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template',
        extractMarkupWithoutTag: true,
      });

      expect(result.script).toBeDefined();
      expect(result.script?.content).toContain('let { userName } = $props()');
      expect(result.template).toBeDefined();
      expect(result.template?.content).toContain('<h1>Hello, {userName}!</h1>');
      expect(result.template?.content).not.toContain('<style>');
      expect(result.styles).toBeDefined();
      expect(result.styles?.length).toBe(1);
    });

    it('should extract markup after script without style section', () => {
      const source = `
<script>
  let count = $state(0);
</script>

<div>
  <p>Count: {count}</p>
</div>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template',
        extractMarkupWithoutTag: true,
      });

      expect(result.script).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.template?.content).toContain('<p>Count: {count}</p>');
      expect(result.styles).toBeUndefined();
    });

    it('should handle Svelte markup with multiple elements', () => {
      const source = `
<script lang="ts">
  let items = $state([]);
</script>

<div class="container">
  <h1>Items</h1>
  {#each items as item}
    <p>{item}</p>
  {/each}
</div>

<style>
  .container { padding: 10px; }
</style>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template',
        extractMarkupWithoutTag: true,
      });

      expect(result.template).toBeDefined();
      expect(result.template?.content).toContain('{#each items as item}');
      expect(result.template?.content).toContain('<p>{item}</p>');
      expect(result.template?.content).toContain('{/each}');
    });

    it('should return null for markup when no content after script', () => {
      const source = `
<script>
  let x = 1;
</script>

<style>
  div { color: red; }
</style>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template',
        extractMarkupWithoutTag: true,
      });

      expect(result.template).toBeUndefined();
      expect(result.styles).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should throw error for empty source', () => {
      expect(() => {
        parser.parse('', {
          scriptTag: 'script',
          templateTag: 'template',
        });
      }).toThrow(SFCParseError);
    });

    it('should handle missing script section', () => {
      const source = `
<template>
  <div>Hello</div>
</template>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template',
      });

      expect(result.script).toBeUndefined();
      expect(result.template).toBeDefined();
    });

    it('should handle missing template section', () => {
      const source = `
<script>
const x = 1;
</script>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script',
        templateTag: 'template',
      });

      expect(result.script).toBeDefined();
      expect(result.template).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should validate Vue SFC structure', () => {
      const source = `
<script setup>
const x = 1;
</script>

<template>
  <div>Hello</div>
</template>
      `.trim();

      const errors = parser.validateStructure(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(errors).toHaveLength(0);
    });

    it('should detect missing script setup', () => {
      const source = `
<template>
  <div>Hello</div>
</template>
      `.trim();

      const errors = parser.validateStructure(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('script');
    });

    it('should detect malformed tags', () => {
      const source = `
<script setup>
const x = 1;

<template>
  <div>Hello</div>
</template>
      `.trim();

      const errors = parser.validateStructure(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Malformed');
    });
  });

  describe('Language normalization', () => {
    it('should normalize TypeScript lang attribute', () => {
      const source = `
<script setup lang="typescript">
const x: number = 1;
</script>

<template>
  <div>{{ x }}</div>
</template>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(result.script?.lang).toBe('ts');
    });

    it('should normalize JavaScript lang attribute', () => {
      const source = `
<script setup lang="javascript">
const x = 1;
</script>

<template>
  <div>{{ x }}</div>
</template>
      `.trim();

      const result = parser.parse(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
      });

      expect(result.script?.lang).toBe('js');
    });
  });
});
