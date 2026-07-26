import { readFile } from 'node:fs/promises'

// Every component in @liquefy-ui/react needs state, refs or the WebGL lens, so the
// built bundles must carry the 'use client' directive. Without it, importing the
// package from a Next.js server component fails the build instead of the render,
// and the docs site (a Vite SPA) would never catch it.
const bundles = ['index.mjs', 'index.cjs']
const failures = []

for (const bundle of bundles) {
  const url = new URL(`../packages/react/dist/${bundle}`, import.meta.url)
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

if (failures.length > 0) {
  console.error(`RSC check failed:\n${failures.map((line) => `  - ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`RSC check passed: ${bundles.join(', ')} are marked 'use client'`)
