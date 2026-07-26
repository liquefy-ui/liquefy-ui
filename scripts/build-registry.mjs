import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { HOMEPAGE, readCatalog } from './component-catalog.mjs'

/**
 * Emits a shadcn-compatible registry into the docs site's public directory, so
 * `npx shadcn add https://<docs>/r/liquid-button.json` copies real source into a
 * project rather than a re-export of the npm package.
 *
 * The copied tree deliberately does NOT depend on @liquefy-ui/react. It keeps
 * @liquefy-ui/core for the optics engine and @base-ui/react for the primitives,
 * and brings its own stylesheet — otherwise a project could end up with a copied
 * LiquefyProvider and the packaged one fighting over the same context.
 */

const outDir = new URL('../apps/docs/public/r/', import.meta.url)
const srcDir = new URL('../packages/react/src/', import.meta.url)
const itemSchema = 'https://ui.shadcn.com/schema/registry-item.json'

const BASE_ITEM = 'liquefy-ui'

/**
 * A cross-reference inside this registry has to be a full URL. A bare name in
 * `registryDependencies` means an item in shadcn's own registry — `button` is
 * shadcn's button, not ours — so bare slugs here would send the CLI looking for
 * `liquid-surface` at ui.shadcn.com and fail the install.
 */
const itemUrl = (name) => `${HOMEPAGE}/r/${name}.json`

/**
 * The directive is added when the npm package is built rather than written in the
 * source, so copied files would arrive without it and break in an RSC app. Adding
 * it here means the registry install needs no manual follow-up.
 */
const withClientDirective = (source) => (
  source.startsWith("'use client'") ? source : `'use client'\n\n${source}`
)

const POST_INSTALL = [
  'Two steps after installing: import the copied stylesheet once at your app entry —',
  'it lands at `styles/liquefy-ui.css` — or `@import` it from your global CSS *before*',
  '`tailwindcss`, so Tailwind utilities keep winning over component styles. Then wrap the',
  'tree in `<LiquefyProvider>`, which is where every component reads its tokens from.',
  "Every copied file already carries its own 'use client' directive.",
  `Full documentation: ${HOMEPAGE}/#/docs/installation`,
].join(' ')

/** The whole stylesheet, plus the Tailwind bridge, as one copied file. */
const buildStylesheet = async () => {
  const [interop, styles] = await Promise.all([
    readFile(new URL('tailwind.css', srcDir), 'utf8'),
    readFile(new URL('styles.css', srcDir), 'utf8'),
  ])

  // The interop sheet imports styles.css by relative path; inline it so the
  // installed file stands on its own.
  return interop.replace("@import './styles.css';", styles.trimEnd())
}

export const buildRegistry = async () => {
  const { coreRange, entries, reactDependencies } = await readCatalog()

  const baseItem = {
    $schema: itemSchema,
    dependencies: [
      `@liquefy-ui/core@${coreRange}`,
      `@base-ui/react@${reactDependencies['@base-ui/react']}`,
    ],
    description:
      'Design tokens, the glass stylesheet and the Tailwind v4 bridge. Every other item depends on this. '
      + 'Import the installed stylesheet before Tailwind so utilities win over component styles.',
    docs: POST_INSTALL,
    files: [{
      content: await buildStylesheet(),
      path: 'registry/liquefy-ui.css',
      target: 'styles/liquefy-ui.css',
      type: 'registry:file',
    }],
    name: BASE_ITEM,
    title: 'liquefy-ui base',
    type: 'registry:style',
  }

  const items = [
    baseItem,
    ...entries.map((entry) => ({
      $schema: itemSchema,
      ...(entry.dependencies.length > 0 ? { dependencies: entry.dependencies } : {}),
      description: entry.description,
      docs: POST_INSTALL,
      files: [{
        content: withClientDirective(entry.source),
        path: `registry/${entry.file}`,
        type: entry.registryType,
      }],
      name: entry.slug,
      registryDependencies: [BASE_ITEM, ...entry.registryDependencies].map(itemUrl),
      title: entry.title,
      type: entry.registryType,
    })),
  ]

  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    homepage: HOMEPAGE,
    // The index lists items without their file contents; the CLI fetches each
    // item's own JSON for those.
    items: items.map(({ files, ...item }) => ({
      ...item,
      files: files.map(({ content, ...file }) => file),
    })),
    name: 'liquefy-ui',
  }

  return { items, registry }
}

export const writeRegistry = async () => {
  const { items, registry } = await buildRegistry()

  await rm(outDir, { force: true, recursive: true })
  await mkdir(outDir, { recursive: true })

  await Promise.all([
    writeFile(new URL('registry.json', outDir), `${JSON.stringify(registry, null, 2)}\n`),
    ...items.map((item) => writeFile(
      new URL(`${item.name}.json`, outDir),
      `${JSON.stringify(item, null, 2)}\n`,
    )),
  ])

  return items
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const items = await writeRegistry()
  console.log(`Registry written: ${items.length} items → apps/docs/public/r/`)
}
