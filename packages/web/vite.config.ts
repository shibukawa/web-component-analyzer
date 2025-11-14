import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/web-component-analyzer/',
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
      external: [
        '@swc/core',
        '@swc/core-darwin-arm64',
        '@swc/core-darwin-x64',
        '@swc/core-linux-arm64-gnu',
        '@swc/core-linux-arm64-musl',
        '@swc/core-linux-x64-gnu',
        '@swc/core-linux-x64-musl',
        '@swc/core-win32-arm64-msvc',
        '@swc/core-win32-ia32-msvc',
        '@swc/core-win32-x64-msvc',
      ],
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
    exclude: ['@swc/core', '@swc/wasm-web'],
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      // Prevent @swc/core from being bundled
      '@swc/core': false,
    },
  },
  assetsInclude: ['**/*.wasm'],
});
