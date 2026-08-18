import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const configDir = path.dirname(fileURLToPath(import.meta.url))

const compat = new FlatCompat({
  baseDirectory: configDir,
})

const config = [
  // `**/` prefix makes these match regardless of which directory ESLint
  // resolves the config's ignores basePath to be relative to.
  { ignores: ['**/.next/**', '**/node_modules/**', '**/playwright-report/**', '**/test-results/**'] },
  ...compat.extends('next/core-web-vitals'),
]

export default config
