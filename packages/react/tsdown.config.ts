import { defineConfig } from 'tsdown'

export default defineConfig({
  // Every component reaches for state, refs, or the WebGL lens, so the whole
  // bundle sits on the client side of a React Server Components boundary.
  // Without this, importing the package from a Next.js server component throws.
  banner: "'use client'",
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.build.json',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ['react', 'react-dom', 'react/jsx-runtime', '@liquefy-ui/core'],
  },
  target: 'es2022',
})
