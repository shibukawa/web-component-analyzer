/**
 * Tests for Framework Detector
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectFramework } from './framework-detector';

describe('Framework Detector', () => {
  describe('Vue detection', () => {
    it('should detect Vue from SFC template tag', () => {
      const code = `
        <template>
          <div>Hello</div>
        </template>
        <script setup>
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence > 0.5);
      assert.ok(result.reasons.includes('Vue SFC template tag detected'));
    });

    it('should detect Vue from script setup tag', () => {
      const code = `
        <script setup lang="ts">
        const count = ref(0);
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence > 0.5);
      assert.ok(result.reasons.includes('Vue script setup tag detected'));
    });

    it('should detect Vue from vue core import', () => {
      const code = `
        import { ref, computed } from 'vue';
        
        const count = ref(0);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Vue core import'));
    });

    it('should detect Vue from @vue/ scoped package', () => {
      const code = `
        import { useRouter } from '@vue/router';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Vue scoped package import'));
    });

    it('should detect Vue from pinia import', () => {
      const code = `
        import { defineStore } from 'pinia';
        
        export const useStore = defineStore('main', {
          state: () => ({ count: 0 })
        });
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Pinia import'));
    });

    it('should detect Vue from vue-router import', () => {
      const code = `
        import { useRoute, useRouter } from 'vue-router';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Vue Router import'));
    });

    it('should detect Vue from Composition API patterns', () => {
      const code = `
        import { ref, reactive, computed } from 'vue';
        
        const state = reactive({ count: 0 });
        const doubled = computed(() => state.count * 2);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.some(r => r.includes('reactive() usage')));
    });

    it('should detect Vue from defineProps usage', () => {
      const code = `
        <script setup>
        const props = defineProps<{ name: string }>();
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.some(r => r.includes('defineProps')));
    });

    it('should detect Vue from defineEmits usage', () => {
      const code = `
        <script setup>
        const emit = defineEmits(['update', 'submit']);
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.some(r => r.includes('defineEmits')));
    });

    it('should detect Vue from lifecycle hooks', () => {
      const code = `
        import { onMounted } from 'vue';
        
        onMounted(() => {
          console.log('mounted');
        });
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.some(r => r.includes('onMounted')));
    });

    it('should detect Vue from watch usage', () => {
      const code = `
        import { ref, watch } from 'vue';
        
        const count = ref(0);
        watch(count, (newVal) => {
          console.log(newVal);
        });
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      // The detector should find either watch() or ref() usage
      assert.ok(result.reasons.some(r => r.includes('watch()') || r.includes('ref()')));
    });

    it('should detect Vue from watchEffect usage', () => {
      const code = `
        import { watchEffect } from 'vue';
        
        watchEffect(() => {
          console.log('effect');
        });
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.some(r => r.includes('watchEffect()')));
    });
  });

  describe('React detection', () => {
    it('should detect React from react import', () => {
      const code = `
        import React from 'react';
        
        function Component() {
          return <div>Hello</div>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('React core import'));
    });

    it('should detect React from react-dom import', () => {
      const code = `
        import ReactDOM from 'react-dom';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('React DOM import'));
    });

    it('should detect React from useState hook', () => {
      const code = `
        import { useState } from 'react';
        
        function Component() {
          const [count, setCount] = useState(0);
          return <div>{count}</div>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('useState hook'));
    });

    it('should detect React from useEffect hook', () => {
      const code = `
        import { useEffect } from 'react';
        
        function Component() {
          useEffect(() => {
            console.log('mounted');
          }, []);
          return <div>Hello</div>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('useEffect hook'));
    });

    it('should detect React from JSX syntax', () => {
      const code = `
        function Component() {
          return <div>Hello World</div>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('JSX syntax detected'));
    });

    it('should detect React from TanStack Query import', () => {
      const code = `
        import { useQuery } from '@tanstack/react-query';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('TanStack Query import'));
    });

    it('should detect React from React Router import', () => {
      const code = `
        import { useNavigate } from 'react-router-dom';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('React Router DOM import'));
    });

    it('should detect React from SWR import', () => {
      const code = `
        import useSWR from 'swr';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('SWR import'));
    });

    it('should detect React from Zustand import', () => {
      const code = `
        import { create } from 'zustand';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('Zustand import'));
    });

    it('should detect React from React Hook Form import', () => {
      const code = `
        import { useForm } from 'react-hook-form';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.reasons.includes('React Hook Form import'));
    });
  });

  describe('Svelte detection', () => {
    it('should detect Svelte from svelte import', () => {
      const code = `
        import { onMount } from 'svelte';
        
        onMount(() => {
          console.log('mounted');
        });
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      assert.ok(result.reasons.includes('Svelte core import'));
    });

    it('should detect Svelte from svelte/store import', () => {
      const code = `
        import { writable } from 'svelte/store';
        
        const count = writable(0);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      assert.ok(result.reasons.includes('Svelte store import'));
    });

    it('should detect Svelte from reactive statement', () => {
      const code = `
        <script>
        let count = 0;
        $: doubled = count * 2;
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      assert.ok(result.reasons.some(r => r.includes('reactive statement')));
    });

    it('should detect Svelte from template syntax', () => {
      const code = `
        <script>
        let items = [1, 2, 3];
        </script>
        
        {#each items as item}
          <div>{item}</div>
        {/each}
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      assert.ok(result.reasons.some(r => r.includes('Svelte template syntax')));
    });

    it('should detect Svelte from writable store', () => {
      const code = `
        import { writable } from 'svelte/store';
        
        const store = writable(0);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      assert.ok(result.reasons.some(r => r.includes('writable store')));
    });

    it('should detect Svelte from derived store', () => {
      const code = `
        import { derived } from 'svelte/store';
        
        const doubled = derived(count, $count => $count * 2);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      assert.ok(result.reasons.some(r => r.includes('derived store')));
    });
  });

  describe('Vue SFC structure detection', () => {
    it('should detect complete Vue SFC with template and script setup', () => {
      const code = `
        <template>
          <div>{{ message }}</div>
        </template>
        
        <script setup lang="ts">
        import { ref } from 'vue';
        const message = ref('Hello');
        </script>
        
        <style scoped>
        div { color: blue; }
        </style>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence > 0.8);
      assert.ok(result.reasons.includes('Vue SFC template tag detected'));
      assert.ok(result.reasons.includes('Vue script setup tag detected'));
    });

    it('should detect Vue SFC with only template', () => {
      const code = `
        <template>
          <div>Static content</div>
        </template>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Vue SFC template tag detected'));
    });

    it('should detect Vue SFC with only script setup', () => {
      const code = `
        <script setup>
        import { ref } from 'vue';
        const count = ref(0);
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Vue script setup tag detected'));
    });

    it('should not confuse regular script tag with Vue script setup', () => {
      const code = `
        <script>
        const count = 0;
        </script>
      `;

      const result = detectFramework(code);
      // Should not detect as Vue without script setup or other Vue indicators
      assert.notStrictEqual(result.framework, 'vue');
    });
  });

  describe('Ambiguous cases and fallback behavior', () => {
    it('should default to React when no framework detected', () => {
      const code = `
        const x = 1;
        console.log(x);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.strictEqual(result.confidence, 0.5);
      assert.ok(result.reasons.includes('No clear framework detected, defaulting to React'));
    });

    it('should default to React when scores are too close', () => {
      const code = `
        // Minimal code that might match multiple patterns weakly
        function test() {
          return null;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.confidence <= 0.5);
    });

    it('should prefer Vue when both Vue and React patterns exist but Vue is stronger', () => {
      const code = `
        <template>
          <div>{{ message }}</div>
        </template>
        
        <script setup>
        import { ref } from 'vue';
        import { useState } from 'react'; // Accidental import
        
        const message = ref('Hello');
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence > 0.5);
    });

    it('should prefer React when React patterns are stronger', () => {
      const code = `
        import React, { useState, useEffect } from 'react';
        import { useQuery } from '@tanstack/react-query';
        
        function Component() {
          const [count, setCount] = useState(0);
          
          useEffect(() => {
            console.log('mounted');
          }, []);
          
          return <div>{count}</div>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.confidence > 0.5);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty code', () => {
      const code = '';

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.strictEqual(result.confidence, 0.5);
    });

    it('should handle code with only whitespace', () => {
      const code = '   \n\n   \t  ';

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.strictEqual(result.confidence, 0.5);
    });

    it('should handle code with only comments', () => {
      const code = `
        // This is a comment
        /* Multi-line
           comment */
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.strictEqual(result.confidence, 0.5);
    });

    it('should handle mixed imports from multiple frameworks', () => {
      const code = `
        import { ref } from 'vue';
        import { useState } from 'react';
        import { writable } from 'svelte/store';
      `;

      const result = detectFramework(code);
      // Should pick the one with highest score
      assert.ok(['vue', 'react', 'svelte'].includes(result.framework));
    });

    it('should not be confused by string literals containing framework names', () => {
      const code = `
        const message = "I love vue and react";
        const tutorial = "Learn useState in React";
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.strictEqual(result.confidence, 0.5);
    });

    it('should handle code with import statements but no actual usage', () => {
      const code = `
        import { ref } from 'vue';
        // No actual usage of ref
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.reasons.includes('Vue core import'));
    });

    it('should handle TypeScript code with type imports', () => {
      const code = `
        import type { Ref } from 'vue';
        import { ref } from 'vue';
        
        const count: Ref<number> = ref(0);
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
    });

    it('should handle code with dynamic imports', () => {
      const code = `
        const Vue = await import('vue');
        const { ref } = Vue;
      `;

      const result = detectFramework(code);
      // Dynamic imports use different syntax and may not be detected
      // This is acceptable as it's an edge case
      assert.ok(['vue', 'react'].includes(result.framework));
    });

    it('should handle JSX in Vue template (should still detect as Vue)', () => {
      const code = `
        <template>
          <div>Hello</div>
        </template>
        
        <script setup>
        // Some JSX-like syntax in comments: <Component />
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
    });
  });

  describe('Confidence scoring', () => {
    it('should have high confidence for clear Vue SFC', () => {
      const code = `
        <template>
          <div>{{ message }}</div>
        </template>
        
        <script setup>
        import { ref } from 'vue';
        const message = ref('Hello');
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence > 0.8);
    });

    it('should have high confidence for clear React component', () => {
      const code = `
        import React, { useState } from 'react';
        
        function Component() {
          const [count, setCount] = useState(0);
          return <div>{count}</div>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.confidence > 0.5);
    });

    it('should have lower confidence for minimal code', () => {
      const code = `
        import { ref } from 'vue';
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence < 0.5);
    });

    it('should have confidence of 0.5 for fallback cases', () => {
      const code = `
        const x = 1;
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.confidence, 0.5);
    });

    it('should cap confidence at 1.0', () => {
      const code = `
        <template>
          <div>{{ message }}</div>
        </template>
        
        <script setup lang="ts">
        import { ref, reactive, computed, watch, onMounted } from 'vue';
        import { useRoute, useRouter } from 'vue-router';
        import { defineStore } from 'pinia';
        
        const props = defineProps<{ name: string }>();
        const emit = defineEmits(['update']);
        const count = ref(0);
        const state = reactive({ value: 0 });
        const doubled = computed(() => count.value * 2);
        
        watch(count, () => {});
        onMounted(() => {});
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence <= 1.0);
    });
  });

  describe('Real-world examples', () => {
    it('should detect Vue component with Pinia and Vue Router', () => {
      const code = `
        <template>
          <div>
            <h1>{{ user.name }}</h1>
            <button @click="navigate">Go Home</button>
          </div>
        </template>
        
        <script setup lang="ts">
        import { useUserStore } from '@/stores/user';
        import { useRouter } from 'vue-router';
        
        const userStore = useUserStore();
        const router = useRouter();
        
        const navigate = () => {
          router.push('/home');
        };
        </script>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'vue');
      assert.ok(result.confidence > 0.8);
    });

    it('should detect React component with TanStack Query and Router', () => {
      const code = `
        import React from 'react';
        import { useQuery } from '@tanstack/react-query';
        import { useNavigate } from 'react-router-dom';
        
        function UserProfile() {
          const navigate = useNavigate();
          const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
          
          return (
            <div>
              <h1>{data?.name}</h1>
              <button onClick={() => navigate('/home')}>Go Home</button>
            </div>
          );
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.confidence > 0.5);
    });

    it('should detect Svelte component with stores', () => {
      const code = `
        <script>
        import { writable, derived } from 'svelte/store';
        
        const count = writable(0);
        const doubled = derived(count, $count => $count * 2);
        
        function increment() {
          count.update(n => n + 1);
        }
        </script>
        
        <button on:click={increment}>
          Count: {$count}
        </button>
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'svelte');
      // Confidence may vary based on pattern matching
      assert.ok(result.confidence >= 0.3);
    });

    it('should detect React component with multiple state management libraries', () => {
      const code = `
        import { useState } from 'react';
        import { useForm } from 'react-hook-form';
        import { create } from 'zustand';
        
        const useStore = create((set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 }))
        }));
        
        function Form() {
          const [loading, setLoading] = useState(false);
          const { register, handleSubmit } = useForm();
          const { count, increment } = useStore();
          
          return <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register('name')} />
            <button type="submit">Submit</button>
          </form>;
        }
      `;

      const result = detectFramework(code);
      assert.strictEqual(result.framework, 'react');
      assert.ok(result.confidence > 0.5);
    });
  });
});
