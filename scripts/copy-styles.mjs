import { copyFile } from 'node:fs/promises'

// tsdown only emits the JS bundle, so the stylesheets are copied across by hand.
// tailwind.css `@import`s styles.css by relative path, which holds in dist too.
const sheets = ['styles.css', 'tailwind.css']

await Promise.all(sheets.map((sheet) => copyFile(
  new URL(`../packages/react/src/${sheet}`, import.meta.url),
  new URL(`../packages/react/dist/${sheet}`, import.meta.url),
)))
