import { defineConfig } from 'vitest/config'

/**
 * The workspace packages resolve to their source rather than to `dist`, so tests
 * run against what is about to be built rather than whatever was built last. It
 * also lets the docs app's tests import the library the same way its pages do
 * without depending on build order — `pnpm check` runs the tests before the build.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: '@liquefy-ui/react/styles.css', replacement: new URL('packages/react/src/styles.css', import.meta.url).pathname },
      { find: '@liquefy-ui/react', replacement: new URL('packages/react/src/index.ts', import.meta.url).pathname },
      { find: '@liquefy-ui/core', replacement: new URL('packages/core/src/index.ts', import.meta.url).pathname },
      { find: '@liquefy-ui/icons', replacement: new URL('packages/icons/src/index.tsx', import.meta.url).pathname },
    ],
  },
})
