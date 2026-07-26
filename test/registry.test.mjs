import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildRegistry } from '../scripts/build-registry.mjs'
import { HOMEPAGE } from '../scripts/component-catalog.mjs'

const { version: coreVersion } = JSON.parse(
  readFileSync(new URL('../packages/core/package.json', import.meta.url), 'utf8'))

// The registry is generated, so the thing worth testing is that the generation
// produced something the shadcn CLI can actually install: a closed dependency
// graph, no leftover relative imports, and no path back to @liquefy-ui/react
// (which would put a second LiquefyProvider in the tree).

const { items, registry } = await buildRegistry()

const byName = new Map(items.map((item) => [item.name, item]))

/** Bare specifiers a copied file is allowed to import. */
const allowedPackages = ['react', 'react-dom', '@liquefy-ui/core', '@base-ui/react']

const sourceItems = items.filter((item) => item.type !== 'registry:style')

describe('shadcn registry', () => {
  it('names every item exactly once', () => {
    expect(byName.size).toBe(items.length)
  })

  // A bare name in registryDependencies means an item in shadcn's own registry,
  // so a cross-reference inside this one has to be a full URL or the CLI goes
  // looking for `liquid-surface` at ui.shadcn.com.
  it('points every registry dependency at this registry by URL', () => {
    const wrong = items.flatMap((item) =>
      (item.registryDependencies ?? [])
        .filter((dependency) => !dependency.startsWith(`${HOMEPAGE}/r/`))
        .map((dependency) => `${item.name} -> ${dependency}`))
    expect(wrong).toEqual([])
  })

  it('resolves every registry dependency inside the registry', () => {
    const unresolved = items.flatMap((item) =>
      (item.registryDependencies ?? [])
        .map((dependency) => dependency.replace(`${HOMEPAGE}/r/`, '').replace(/\.json$/, ''))
        .filter((name) => !byName.has(name))
        .map((name) => `${item.name} -> ${name}`))
    expect(unresolved).toEqual([])
  })

  // The npm bundles get the directive at build time, so copied source would
  // arrive without it and break the moment it lands in an RSC app.
  it("ships every copied module with a 'use client' directive", () => {
    const missing = sourceItems.flatMap((item) =>
      item.files
        .filter((file) => !file.content.startsWith("'use client'"))
        .map((file) => `${item.name}:${file.path}`))
    expect(missing).toEqual([])
  })

  it('tells the installer what to do next', () => {
    for (const item of items) expect(item.docs, item.name).toBeTruthy()
  })

  // A copied tree keeps importing @liquefy-ui/core from npm, and the range that
  // went with it used to be the hard-coded string `^0.1.0`. Nothing failed while
  // core stayed on 0.1.x, and nothing would have failed loudly afterwards either:
  // a caret range stops at the next minor below 1.0, so the CLI would simply have
  // installed an old engine underneath new component source.
  it('asks npm for the version of core this registry was built from', () => {
    const wrong = items.flatMap((item) =>
      (item.dependencies ?? [])
        .filter((dependency) => dependency.startsWith('@liquefy-ui/core@'))
        .filter((dependency) => dependency !== `@liquefy-ui/core@^${coreVersion}`)
        .map((dependency) => `${item.name} -> ${dependency}`))
    expect(wrong).toEqual([])
  })

  it('gives every item a title, a description and file content', () => {
    for (const item of items) {
      expect(item.title, item.name).toBeTruthy()
      expect(item.description, item.name).toBeTruthy()
      expect(item.files.length, item.name).toBeGreaterThan(0)
      for (const file of item.files) {
        expect(file.content?.length ?? 0, `${item.name}:${file.path}`).toBeGreaterThan(0)
      }
    }
  })

  it('rewrites every relative import to a shadcn alias', () => {
    const leftovers = sourceItems.flatMap((item) =>
      item.files
        .filter((file) => /from '\.\//.test(file.content))
        .map((file) => `${item.name}:${file.path}`))
    expect(leftovers).toEqual([])
  })

  it('never points a copied file back at @liquefy-ui/react', () => {
    const offenders = items
      .filter((item) => item.files.some((file) => file.content.includes('@liquefy-ui/react')))
      .map((item) => item.name)
      // The base stylesheet is generated from the package's own CSS, and its
      // comment block explains the npm route, so a mention there is expected.
      .filter((name) => name !== 'liquefy-ui')
    expect(offenders).toEqual([])

    const npmDependencies = items.flatMap((item) => item.dependencies ?? [])
    expect(npmDependencies.filter((entry) => entry.startsWith('@liquefy-ui/react'))).toEqual([])
  })

  it('only imports packages the registry actually installs', () => {
    const unexpected = new Set()
    for (const item of sourceItems) {
      for (const file of item.files) {
        for (const [, specifier] of file.content.matchAll(/from '([^']+)'/g)) {
          if (specifier.startsWith('@/')) continue
          const owner = allowedPackages.find((name) => specifier === name || specifier.startsWith(`${name}/`))
          if (!owner) unexpected.add(`${item.name}: ${specifier}`)
        }
      }
    }
    expect([...unexpected]).toEqual([])
  })

  it('declares the npm packages a copied file imports', () => {
    const missing = []
    for (const item of sourceItems) {
      const declared = (item.dependencies ?? []).map((entry) => entry.replace(/@[^@/]*$/, ''))
      for (const file of item.files) {
        for (const [, specifier] of file.content.matchAll(/from '([^']+)'/g)) {
          if (specifier.startsWith('@/') || specifier === 'react' || specifier === 'react-dom') continue
          const owner = allowedPackages.find((name) => specifier === name || specifier.startsWith(`${name}/`))
          if (owner && !declared.includes(owner)) missing.push(`${item.name} imports ${owner} without declaring it`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  // The item graph being closed is not enough: what a copied file actually needs
  // is the *file* behind each `@/lib/...` import, and the CLI only installs files
  // that a transitive registry dependency provides.
  it('installs a file for every alias a copied file imports', () => {
    /** Every module an item drops into the project, keyed by alias path. */
    const provided = new Map()
    for (const item of sourceItems) {
      for (const file of item.files) {
        const module = file.path.replace(/^registry\//, '').replace(/\.tsx?$/, '')
        provided.set(module, item.name)
      }
    }

    const nameOf = (url) => url.replace(`${HOMEPAGE}/r/`, '').replace(/\.json$/, '')
    const transitive = (name, seen = new Set()) => {
      if (seen.has(name)) return seen
      seen.add(name)
      for (const dependency of byName.get(name)?.registryDependencies ?? []) {
        transitive(nameOf(dependency), seen)
      }
      return seen
    }

    const unresolved = []
    for (const item of sourceItems) {
      const installed = transitive(item.name)
      for (const file of item.files) {
        for (const [, specifier] of file.content.matchAll(/from '@\/[^']*\/([^'/]+)'/g)) {
          const owner = provided.get(specifier)
          if (!owner) {
            unresolved.push(`${item.name} imports ${specifier}, which no item provides`)
          } else if (!installed.has(owner)) {
            unresolved.push(`${item.name} imports ${specifier} without depending on ${owner}`)
          }
        }
      }
    }
    expect(unresolved).toEqual([])
  })

  it('ships a stylesheet that fixes the Tailwind layer order', () => {
    const base = byName.get('liquefy-ui')
    const css = base.files[0].content
    expect(css).toContain('@layer liquefy-ui, theme, base, components, utilities;')
    // `inline` is what keeps the bridged tokens resolving per-theme at use time.
    expect(css).toContain('@theme inline')
    expect(css).toContain('.lq-provider')
    // The relative import must have been replaced by the real stylesheet.
    expect(css).not.toContain("@import './styles.css'")
  })

  it('keeps file contents out of the index so it stays small', () => {
    const serialized = JSON.stringify(registry)
    expect(serialized).not.toContain('"content"')
    expect(serialized.length).toBeLessThan(60_000)
  })

  // The repository is liquefy-ui and the deployed host is liquefy-ui.com,
  // but the npm scope is @liquefy-ui. Generated links went to the wrong spelling
  // once already, and a registry that 404s is worse than no registry.
  it('builds every URL from the one homepage constant', () => {
    expect(HOMEPAGE).toBe('https://liquefy-ui.com')
    expect(registry.homepage).toBe(HOMEPAGE)

    // Metadata only — file contents legitimately carry the SVG namespace URL.
    const metadata = items.map(({ files, ...item }) => ({
      ...item,
      files: files.map(({ content, ...file }) => file),
    }))
    const urls = JSON.stringify(metadata).match(/https?:\/\/[^"\\\s]+/g) ?? []
    const offHost = urls.filter((url) => !url.startsWith(HOMEPAGE) && !url.startsWith('https://ui.shadcn.com/'))
    expect(offHost).toEqual([])
  })

  it('points every item at the base item', () => {
    const orphans = sourceItems
      .filter((item) => !(item.registryDependencies ?? []).includes(`${HOMEPAGE}/r/liquefy-ui.json`))
      .map((item) => item.name)
    expect(orphans).toEqual([])
  })
})
