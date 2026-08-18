import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(configDir, '..', '..')

const compat = new FlatCompat({
  baseDirectory: configDir,
})

const config = [
  {
    ignores: [
      path.join(projectRoot, '.next/**'),
      path.join(projectRoot, 'node_modules/**'),
      path.join(projectRoot, 'playwright-report/**'),
      path.join(projectRoot, 'test-results/**'),
    ],
  },
  ...compat.extends('next/core-web-vitals'),
]

export default config
