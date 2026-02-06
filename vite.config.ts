import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting for optimized loading
         * Separates heavy dependencies into their own bundles:
         * - xterm: Terminal emulator (~200kB) - loaded on demand
         * - methodologies: Argumentation guides - loaded when sessions start
         * - vendor-react: React core (~140kB) - cached separately
         * - vendor-ui: UI libraries (zustand, react-markdown) - cached separately
         * - vendor-ai: AI SDK dependencies - loaded for sessions
         */
        manualChunks: {
          // Heavy terminal dependency - lazy loaded
          xterm: ['@xterm/xterm', '@xterm/addon-fit'],

          // Methodology guides - lazy loaded when sessions start
          methodologies: ['./src/methodologies/index.ts'],

          // React core - high cache hit rate
          'vendor-react': ['react', 'react-dom'],

          // UI utilities - moderate cache hit rate
          'vendor-ui': ['zustand', 'react-markdown', 'marked'],

          // AI SDK - loaded when sessions start
          'vendor-ai': ['@anthropic-ai/sdk'],

          // UUID and utilities
          'vendor-utils': ['uuid', 'yaml', 'gray-matter'],
        },
        // Ensure consistent chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId && facadeModuleId.includes('methodologies')) {
            return 'assets/methodologies-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
    // Enable chunk size warnings
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts'],
    },
  },
});
