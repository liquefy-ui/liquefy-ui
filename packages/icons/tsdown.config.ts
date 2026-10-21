import { defineConfig } from 'tsdown'

export default defineConfig({
  // The icons are plain server-safe components; only the effects need the
  // client, so only their bundle sits behind a React Server Components boundary.
  banner: ({ fileName }) => (fileName.startsWith('effects') ? { js: "'use client'" } : undefined),
  entry: ['src/index.tsx', 'src/effects.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ['react', 'react/jsx-runtime'],
  },
  target: 'es2022',
})
