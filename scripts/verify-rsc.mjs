import { readFile } from 'node:fs/promises'

// Every component in @liquefy-ui/react and @liquefy-ui/lab needs state, refs or the
// WebGL lens, so the built bundles must carry the 'use client' directive. Without
// it, importing the package from a Next.js server component fails the build
// instead of the render, and the docs site (a Vite SPA) would never catch it.
// The icons' effects need the client too; the icons themselves must not, or every
// icon a server component renders would ship to the browser as a client reference.
const bundles = [
  ...['react', 'lab'].flatMap((name) => ['index.mjs', 'index.cjs'].map((file) => `${name}/dist/${file}`)),
  'icons/dist/effects.mjs',
  'icons/dist/effects.cjs',
]
const serverSafe = ['icons/dist/index.mjs', 'icons/dist/index.cjs']
const failures = []

for (const bundle of bundles) {
  const url = new URL(`../packages/${bundle}`, import.meta.url)
  let source
  try {
    source = await readFile(url, 'utf8')
  } catch {
    failures.push(`${bundle}: missing — run the build first`)
    continue
  }

  // The directive only counts when it is the very first statement of the file.
  const first = source.trimStart().split('\n', 1)[0]?.trim()
  if (first !== `'use client'` && first !== `"use client"`) {
    failures.push(`${bundle}: expected a leading 'use client' directive, found ${JSON.stringify(first)}`)
  }
}

for (const bundle of serverSafe) {
  let source
  try {
    source = await readFile(new URL(`../packages/${bundle}`, import.meta.url), 'utf8')
  } catch {
    failures.push(`${bundle}: missing — run the build first`)
    continue
  }
  if (/^\s*['"]use client['"]/.test(source)) failures.push(`${bundle}: must stay server-safe, found a 'use client' directive`)
}

if (failures.length > 0) {
  console.error(`RSC check failed:\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`RSC check passed: ${bundles.join(', ')} are marked 'use client'; ${serverSafe.join(', ')} are not`)
