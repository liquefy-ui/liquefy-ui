import { readFileSync, readdirSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * One spelling, everywhere: liqu**e**fy. The project used to carry two, a single
 * letter apart — liquefy for the repository and the host, liquify for the npm
 * scope and the component names — and generated links went to the wrong one more
 * than once. The unification removed the choice; this file makes sure it stays
 * removed, and checks the manifest fields the first publish will actually need.
 */

const OWNER = 'liquefy-ui'
const REPO_URL = `https://github.com/${OWNER}/liquefy-ui`
const SITE = 'https://liquefy-ui.com'
const NPM_SCOPE = '@liquefy-ui'

const PUBLISHED = ['core', 'icons', 'react', 'mcp']

const manifest = (name) => JSON.parse(readFileSync(new URL(`../packages/${name}/package.json`, import.meta.url), 'utf8'))

describe('published package manifests', () => {
  it.each(PUBLISHED)('names @liquefy-ui/%s with the npm spelling', (name) => {
    expect(manifest(name).name).toBe(`${NPM_SCOPE}/${name}`)
  })

  // npm refuses to sign a package that has no repository field, and the URL has to
  // match the repository the workflow runs in — so without this the very first
  // publish fails, after the version bump has already been committed.
  it.each(PUBLISHED)('gives @liquefy-ui/%s the repository provenance needs', (name) => {
    const { repository } = manifest(name)
    expect(repository).toBeTruthy()
    expect(repository.type).toBe('git')
    expect(repository.url).toBe(`git+${REPO_URL}.git`)
    expect(repository.directory).toBe(`packages/${name}`)
  })

  it.each(PUBLISHED)('points @liquefy-ui/%s at the docs site and the issue tracker', (name) => {
    const { bugs, homepage, license } = manifest(name)
    expect(homepage).toBe(SITE)
    expect(bugs).toBe(`${REPO_URL}/issues`)
    expect(license).toBe('MIT')
  })

  it.each(PUBLISHED)('publishes @liquefy-ui/%s publicly, with provenance', (name) => {
    expect(manifest(name).publishConfig).toEqual({ access: 'public', provenance: true })
  })
})

describe('the one spelling', () => {
  const root = new URL('../', import.meta.url)
  const skip = new Set(['node_modules', 'dist', '.git', '.next', '.vercel', '.tarballs', 'llms', 'r'])

  const files = (dir) => readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return []
    const entry = new URL(name, dir)
    if (statSync(entry).isDirectory()) return files(new URL(`${name}/`, dir))
    return /\.(ts|tsx|mjs|json|md|css|yml|html)$/.test(name) ? [entry] : []
  })

  const sources = files(root)
    .map((file) => ({
      path: file.pathname.replace(root.pathname, ''),
      text: readFileSync(file, 'utf8'),
    }))
    // This file has to name the retired spelling in order to look for it.
    .filter(({ path }) => path !== 'test/metadata.test.mjs')

  it('finds the files to scan', () => {
    expect(sources.length).toBeGreaterThan(40)
  })

  // Covers the scope (@liquify-ui), the identifiers (LiquifyProvider), the cascade
  // layer, the host and every URL in one assertion: the letter i does not belong
  // in this word anywhere in the repository.
  it('has retired liquify entirely', () => {
    const offenders = sources
      .filter(({ text }) => /liquify/i.test(text))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it('names the scope, the host and the repository consistently', () => {
    expect(manifest('react').name).toBe(`${NPM_SCOPE}/react`)
    expect(manifest('react').homepage).toBe(SITE)
    const chrome = readFileSync(new URL('../apps/docs/src/site/chrome.tsx', import.meta.url), 'utf8')
    expect(chrome).toContain(`export const repositoryUrl = '${REPO_URL}'`)
    expect(chrome).toContain(`export const siteUrl = '${SITE}'`)
  })

  it('agrees on one owner everywhere it names one', () => {
    const owners = new Set(
      sources.flatMap(({ text }) => [...text.matchAll(/github\.com\/([^/\s"')]+)\/liquefy-ui/g)]
        .map(([, owner]) => owner)),
    )
    expect([...owners]).toEqual([OWNER])
  })
})

describe('the README', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const root = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

  it('lists every published package', () => {
    for (const name of PUBLISHED) expect(readme, name).toContain(`\`${NPM_SCOPE}/${name}\``)
  })

  // A command that exists but is not written down is a command nobody runs, and a
  // documented one that no longer exists sends people looking for a bug.
  it('documents every root script, and invents none', () => {
    const documented = new Set([...readme.matchAll(/\| `pnpm ([a-z:-]+)`/g)].map(([, name]) => name))
    const real = Object.keys(root.scripts)
    expect(real.filter((name) => !documented.has(name))).toEqual([])
    expect([...documented].filter((name) => !real.includes(name))).toEqual([])
  })

  it('prints counts that match the source', async () => {
    const { readCatalog, readIcons } = await import('../scripts/component-catalog.mjs')
    const { entries } = await readCatalog()
    const icons = await readIcons()
    const registry = JSON.parse(
      readFileSync(new URL('../apps/docs/public/r/registry.json', import.meta.url), 'utf8'),
    )
    const nav = readFileSync(new URL('../apps/docs/src/docs/docs-nav.tsx', import.meta.url), 'utf8')
    const docPages = [...nav.matchAll(/items: \[([^\]]*)\]/g)]
      .flatMap(([, list]) => list.split(',')).map((name) => name.trim()).filter(Boolean).length
    const componentPages = [...readdirSync(new URL('../apps/docs/src/docs/', import.meta.url))]
      .filter((file) => file.startsWith('catalog-'))
      .reduce((total, file) => total
        + (readFileSync(new URL(`../apps/docs/src/docs/${file}`, import.meta.url), 'utf8')
          .match(/slug: '/g) ?? []).length, 0)

    expect(readme).toContain(`${componentPages} components and ${icons.names.length} icons`)
    expect(readme).toContain(`${registry.items.length} items`)
    expect(docPages).toBe(12)
    expect(readme.toLowerCase()).toContain('twelve doc pages')
    // The catalogue and the registry are built from the same source, so a drift
    // between them means one of the two builders stopped seeing a file.
    expect(registry.items.length).toBe(entries.length + 1)
  })

  it('names every MCP tool the server implements', async () => {
    const { tools } = await import('../packages/mcp/src/server.ts')
    for (const { name } of tools) expect(readme, name).toContain(`\`${name}\``)
    expect(readme).toContain(`${['eight', 'nine', 'ten'][tools.length - 8] ?? String(tools.length)} tools`)
  })

  it('describes the routes the router actually serves', () => {
    for (const route of ['#/', '#/playground', '#/components', '#/docs']) {
      expect(readme, route).toContain(`\`${route}\``)
    }
  })
})

/**
 * How the project looks when it is linked rather than visited. Every failure here
 * is invisible from inside the site: the page renders, the build passes, and the
 * card in someone else's post is blank or stale.
 */
describe('the link preview', () => {
  const html = readFileSync(new URL('../apps/docs/index.html', import.meta.url), 'utf8')
  const content = (attribute, name) =>
    html.match(new RegExp(`<meta[^>]*${attribute}="${name}"[^>]*content="([^"]*)"`, 's'))?.[1]
      ?? html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attribute}="${name}"`, 's'))?.[1]

  /** Width and height out of a PNG's IHDR, which is always its first chunk. */
  const pngSize = (file) => {
    const bytes = readFileSync(new URL(`../brand/${file}`, import.meta.url))
    expect(bytes.subarray(1, 4).toString(), `${file} is a PNG`).toBe('PNG')
    return { height: bytes.readUInt32BE(20), width: bytes.readUInt32BE(16) }
  }

  it('points at an image that exists, at the size it claims', () => {
    const image = content('property', 'og:image')
    expect(image).toBe(`${SITE}/brand/liquefy-og.png`)
    // Relative URLs are dropped by the crawlers that read this, not resolved.
    expect(image.startsWith('https://')).toBe(true)
    expect(pngSize('liquefy-og.png')).toEqual({
      height: Number(content('property', 'og:image:height')),
      width: Number(content('property', 'og:image:width')),
    })
  })

  it('gives GitHub a card at the aspect GitHub wants', () => {
    expect(pngSize('liquefy-social.png')).toEqual({ height: 640, width: 1280 })
  })

  it('asks for the large card, and names one canonical host', () => {
    expect(content('name', 'twitter:card')).toBe('summary_large_image')
    expect(content('name', 'twitter:image')).toBe(`${SITE}/brand/liquefy-og.png`)
    expect(content('property', 'og:url')).toBe(`${SITE}/`)
    expect(html).toContain(`<link rel="canonical" href="${SITE}/" />`)
    for (const tag of ['og:type', 'og:title', 'og:description', 'og:image:alt']) {
      expect(content('property', tag), tag).toBeTruthy()
    }
  })

  // A sitemap naming a different host than the redirect target sends crawlers
  // round in a circle, and a robots.txt that points at a sitemap which is not
  // served is worse than having neither.
  it('agrees with robots.txt about where the sitemap is', () => {
    const publicDir = new URL('../apps/docs/public/', import.meta.url)
    const robots = readFileSync(new URL('robots.txt', publicDir), 'utf8')
    const sitemap = readFileSync(new URL('sitemap.xml', publicDir), 'utf8')

    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)
    expect(robots).toMatch(/^User-agent: \*$/m)
    expect(sitemap).toContain(`<loc>${SITE}/</loc>`)
    // One document, because every page of this site is a fragment of it.
    expect([...sitemap.matchAll(/<loc>/g)]).toHaveLength(1)
  })
})
