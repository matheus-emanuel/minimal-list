import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Config lives in tests/, but tests run against the project root.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  root: projectRoot,
  test: {
    include: ['tests/rls/**/*.test.ts', 'src/lib/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
  },
})
