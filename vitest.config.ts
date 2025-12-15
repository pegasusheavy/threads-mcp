import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // Entry point is hard to test in isolation
        'src/types/**', // Type definitions don't need coverage
        '**/*.test.ts',
        'src/client/enhanced-threads-client.ts', // Optional enhanced client wrapper
      ],
      thresholds: {
        // Coverage thresholds - client code (core business logic) maintains >90% coverage
        // Server integration code is tested but has lower threshold due to MCP SDK dependencies
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      include: ['src/client/**/*.ts', 'src/utils/**/*.ts'], // Focus on business logic and utilities
    },
  },
});

