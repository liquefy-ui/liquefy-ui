import { defineConfig } from 'tsdown'

export default defineConfig({
  // Everything here animates on the client, so the bundle sits on the client
  // side of a React Server Components boundary, exactly like @liquefy-ui/react.
  banner: "'use client'",
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.build.json',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@base-ui/react',
      '@liquefy-ui/core',
      '@liquefy-ui/react',
    ],
  },
  target: 'es2022',
})
