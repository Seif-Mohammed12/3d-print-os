import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'apps/**/*.{spec,test}.ts',
      'packages/**/*.{spec,test}.ts',
      'modules/**/*.{spec,test}.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/**/src/**/*.ts', 'packages/**/src/**/*.ts', 'modules/**/src/**/*.ts'],
      exclude: ['**/*.{spec,test}.ts', '**/dist/**', '**/main.ts'],
    },
  },
});
