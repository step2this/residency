import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Use jsdom for React component tests
    // Switch to 'node' for pure server/utility tests
    environment: 'jsdom',

    // Auto-import Vitest globals
    globals: true,

    // Test file patterns (includes .test. and .spec. files)
    include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],

    // Exclude node_modules and dist directories
    exclude: ['node_modules', 'dist', '.next'],

    // Setup files run before all tests
    setupFiles: ['./vitest.setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // Test isolation: reset modules between tests
    isolate: true,

    // Timeout for async tests
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
