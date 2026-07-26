import { defineConfig } from 'tsdown'

export default defineConfig({
  // The shebang lives in src/index.ts and is preserved by the bundler, so adding
  // it as a banner here would emit it twice.
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  sourcemap: true,
  target: 'node20.19',
})
