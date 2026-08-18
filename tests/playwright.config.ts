import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    // Config lives in tests/; npm needs to run from the project root.
    cwd: '..',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
