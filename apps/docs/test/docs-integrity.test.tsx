import { readFileSync, readdirSync, statSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiquefyProvider } from '@liquefy-ui/react'
import * as liquefy from '@liquefy-ui/react'
import { describe, expect, it } from 'vitest'
import { catalog, componentCount } from '../src/docs/catalog'
import { docCategories, docCount, docOrder, findDocPage } from '../src/docs/docs-nav'
import { iconCount, iconEntries, iconsImportLine } from '../src/docs/icons-gallery'
import type { ComponentDoc } from '../src/docs/types'

/**
 * The docs site is generated from hand-written entries that describe a library
 * living somewhere else, which is exactly the shape of thing that rots. These
 * tests hold the two together: every demo has to render, every import line has to
 * name real exports, and every internal link has to resolve to a route that the
 * router will actually match.
 */

const srcDir = new URL('../src/', import.meta.url)

const sourceFiles = (dir: URL): URL[] => readdirSync(dir).flatMap((name) => {
  const entry = new URL(name, dir)
  if (statSync(entry).isDirectory()) return sourceFiles(new URL(`${name}/`, dir))
  return /\.tsx?$/.test(name) ? [entry] : []
})

const files = sourceFiles(srcDir)
const componentDocs = catalog.flatMap((category) => category.items)

/** Every route the router resolves, built the way the router builds them. */
const routes = new Set<string>([
  '#/',
  '#/docs',
  '#/components',
  '#/components/icons',
  '#/playground',
  ...docOrder.map((doc) => `#/docs/${doc.slug}`),
  ...componentDocs.map((doc) => `#/components/${doc.slug}`),
])

/** Public exports of the library, which is what an import line may name. */
const exportedNames = new Set(Object.keys(liquefy))

const importedNames = (doc: ComponentDoc): string[] => {
  const match = /import \{([^}]*)\}/.exec(doc.importLine)
  return (match?.[1] ?? '').split(',').map((name) => name.trim()).filter(Boolean)
}

const renderNode = (node: React.ReactNode) =>
  renderToStaticMarkup(<LiquefyProvider theme="light">{node}</LiquefyProvider>)

describe('component catalogue', () => {
  it('agrees with the count the pages print', () => {
    expect(componentDocs).toHaveLength(componentCount)
    expect(componentCount).toBeGreaterThan(30)
  })

  it('gives every entry a unique slug', () => {
    const slugs = componentDocs.map((doc) => doc.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    // The icon gallery lives at #/components/icons and is not a catalogue entry.
    expect(slugs).not.toContain('icons')
  })

  it('describes every entry well enough to be a page', () => {
    for (const doc of componentDocs) {
      expect(doc.name, doc.slug).toBeTruthy()
      expect(doc.description.length, doc.slug).toBeGreaterThan(30)
      expect(doc.demos.length, doc.slug).toBeGreaterThan(0)
      expect(doc.props.length, doc.slug).toBeGreaterThan(0)
      for (const demo of doc.demos) {
        expect(demo.title, `${doc.slug}: demo title`).toBeTruthy()
        expect(demo.code.length, `${doc.slug}: ${demo.title}`).toBeGreaterThan(10)
      }
    }
  })

  // An import line naming something the package does not export is the single
  // most expensive kind of documentation bug: it is copied straight into a file.
  it('only imports names the library actually exports', () => {
    const unknown = componentDocs.flatMap((doc) =>
      importedNames(doc)
        .filter((name) => !exportedNames.has(name))
        .map((name) => `${doc.slug}: ${name}`))
    expect(unknown).toEqual([])
  })

  // The other direction: a component that ships without a page is a component
  // nobody can find, and the sidebar is generated from these entries.
  it('documents every component the library exports', () => {
    const documented = new Set(componentDocs.flatMap(importedNames))
    const undocumented = [...exportedNames]
      .filter((name) => /^(Liquid|Glass|Dock)/.test(name))
      // The provider, the toast provider and its hook have their own doc pages
      // under #/docs rather than a component page.
      .filter((name) => !['LiquefyProvider', 'LiquidToastProvider'].includes(name))
      .filter((name) => !documented.has(name))
    expect(undocumented).toEqual([])
  })

  it('imports from the package root and nowhere else', () => {
    const wrong = componentDocs
      .filter((doc) => !doc.importLine.includes("from '@liquefy-ui/react'"))
      .map((doc) => doc.slug)
    expect(wrong).toEqual([])
  })

  it.each(componentDocs.map((doc) => [doc.slug, doc] as const))(
    'renders every demo of %s',
    (_slug, doc) => {
      for (const demo of doc.demos) {
        expect(() => renderNode(demo.render()), demo.title).not.toThrow()
      }
      if (doc.preview) expect(() => renderNode(doc.preview!())).not.toThrow()
    },
  )
})

describe('documentation pages', () => {
  it('gives every page a unique slug and a place in the reading order', () => {
    const slugs = docOrder.map((doc) => doc.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(docOrder).toHaveLength(docCount)
    for (const slug of slugs) expect(findDocPage(slug)?.doc.slug).toBe(slug)
  })

  it('fills every sidebar category', () => {
    for (const category of [...docCategories, ...catalog]) {
      expect(category.title, 'category title').toBeTruthy()
      expect(category.items.length, category.title).toBeGreaterThan(0)
    }
  })

  it.each(docOrder.map((doc) => [doc.slug, doc] as const))('renders %s', (_slug, doc) => {
    const markup = renderNode(doc.render())
    expect(markup.length).toBeGreaterThan(500)
    expect(doc.description.length).toBeGreaterThan(30)
  })

  // The table of contents is built from the headings a page renders, so a page
  // with unlabelled sections quietly loses its right-hand column.
  it('gives every section an id for the table of contents', () => {
    for (const doc of docOrder) {
      const markup = renderNode(doc.render())
      const headings = markup.match(/<h2[^>]*>/g) ?? []
      const withId = markup.match(/<h2 id="/g) ?? []
      expect(headings.length, `${doc.slug}: h2 count`).toBeGreaterThan(1)
      expect(withId.length, `${doc.slug}: h2 without id`).toBe(headings.length)
    }
  })
})

describe('icons', () => {
  it('matches the count the pages print', () => {
    expect(iconEntries).toHaveLength(iconCount)
    expect(iconCount).toBeGreaterThan(40)
  })

  it('names real icons in its import line', () => {
    const names = /import \{([^}]*)\}/.exec(iconsImportLine)?.[1].split(',') ?? []
    const known = new Set(iconEntries.map(([name]) => name))
    for (const name of names.map((entry) => entry.trim())) expect(known).toContain(name)
  })
})

describe('internal links', () => {
  const hashLinks = files.flatMap((file) => {
    const source = readFileSync(file, 'utf8')
    return [
      ...[...source.matchAll(/href="(#\/[^"]*)"/g)].map(([, href]) => href),
      ...[...source.matchAll(/href=\{`(#\/[^`$]*)`\}/g)].map(([, href]) => href),
      ...[...source.matchAll(/location\.hash = '(#\/[^']*)'/g)].map(([, href]) => href),
    ].map((href) => ({ file: file.pathname.split('/src/')[1], href }))
  })

  it('finds links to check', () => {
    expect(hashLinks.length).toBeGreaterThan(30)
  })

  it('resolves every hard-coded route', () => {
    const broken = hashLinks
      .filter(({ href }) => !routes.has(href === '#/' ? href : href.replace(/\/$/, '')))
      .map(({ file, href }) => `${file} -> ${href}`)
    expect(broken).toEqual([])
  })

  // Old links have to keep working, and a redirect to a page that no longer
  // exists is worse than the dead link it replaced.
  it('redirects the retired guide routes at a real page', () => {
    const app = readFileSync(new URL('app.tsx', srcDir), 'utf8')
    const targets = [...app.matchAll(/'(#\/docs[^']*)'/g)].map(([, target]) => target)
    expect(targets.length).toBeGreaterThan(2)
    for (const target of targets) expect(routes, target).toContain(target)
  })
})
