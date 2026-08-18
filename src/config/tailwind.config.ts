import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { Config } from 'tailwindcss'

// Absolute path so this keeps working regardless of whether Tailwind resolves
// `content` relative to the config file (here) or the process cwd (project root).
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const config: Config = {
  content: [resolve(projectRoot, 'src/app/**/*.{ts,tsx}')],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
