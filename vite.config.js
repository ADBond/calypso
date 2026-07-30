import { defineConfig } from 'vite'
import { execSync } from 'child_process'

// const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitHash = 'hash';  // TODO: placeholder

export default defineConfig({
  base: '/calypso/',
  publicDir: 'public',
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  assetsInclude: ['**/*.wasm'],
})
