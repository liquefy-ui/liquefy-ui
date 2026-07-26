import { cp, mkdir } from 'node:fs/promises'

// The brand files live in /brand, which is where a designer or a README looks
// for them. Vite only serves what is under apps/docs/public, so they are copied
// rather than duplicated — the copies are generated output, and gitignored.
const source = new URL('../brand/', import.meta.url)
const target = new URL('../apps/docs/public/brand/', import.meta.url)

await mkdir(target, { recursive: true })
await cp(source, target, { filter: (path) => !path.endsWith('.md'), recursive: true })

console.log(`Brand assets copied: ${source.pathname} → apps/docs/public/brand/`)
