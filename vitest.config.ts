import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/rls/**/*.test.ts', 'lib/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
  },
})
