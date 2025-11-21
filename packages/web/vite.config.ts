import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/web-component-analyzer/',
  define: {
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'mermaid': ['mermaid'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  optimizeDeps: {
    include: ['monaco-editor', 'mermaid'],
    exclude: ['@swc/wasm-web'],
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {},
  },
  assetsInclude: ['**/*.wasm'],
});
