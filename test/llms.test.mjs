import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HOMEPAGE, readCatalog, readCoreApi, readIcons } from '../scripts/component-catalog.mjs'
import { tools } from '../packages/mcp/src/server.ts'

/**
 * The text files are the whole interface for an agent that fetches rather than
 * calls tools, and they are generated — so what can rot is the *shape*: a link
 * that points at nothing fetchable, an H2 section with prose in it, a name that is
 * advertised as importable but is not exported, a tool list that has drifted from
 * the tools that exist. `pnpm generate` runs before this suite, so these read the
 * files a deploy would serve.
 */

const publicDir = new URL('../apps/docs/public/', import.meta.url)
const pagesDir = new URL('../apps/docs/public/llms/', import.meta.url)

const read = (name) => readFileSync(new URL(name, publicDir), 'utf8')
const short = read('llms.txt')
const full = read('llms-full.txt')
const pages = readdirSync(pagesDir)

const { entries } = await readCatalog()
const icons = await readIcons()
const core = await readCoreApi()

const lines = short.split('\n')
const headingIndexes = lines
  .map((line, index) => ({ index, line }))
  .filter(({ line }) => line.startsWith('## '))
  .map(({ index }) => index)

/** Names the entry point re-exports, i.e. what may be presented as importable. */
const publicNames = new Set(entries.flatMap((entry) => entry.publicValues))
const internalNames = entries.flatMap((entry) => entry.internalValues)

describe('llms.txt structure', () => {
  // https://llmstxt.org: H1, blockquote summary, prose with no headings, then H2
  // sections that are file lists.
  it('opens with one H1 and a blockquote summary', () => {
    expect(lines.filter((line) => line.startsWith('# '))).toHaveLength(1)
    expect(lines[0]).toBe('# liquefy-ui')
    expect(lines[2]?.startsWith('> ')).toBe(true)
  })

  it('keeps the prose above the first H2', () => {
    expect(headingIndexes.length).toBeGreaterThan(3)
    const prose = lines.slice(0, headingIndexes[0]).join('\n')
    expect(prose).toContain('pnpm add @liquefy-ui/react')
    expect(prose).toContain('LiquefyProvider')
    expect(prose.match(/^#{2,} /gm)).toBeNull()
  })

  it('fills every H2 section with links and nothing else', () => {
    for (const [position, start] of headingIndexes.entries()) {
      const end = headingIndexes[position + 1] ?? lines.length
      const body = lines.slice(start + 1, end).filter((line) => line.trim() !== '')
      expect(body.length, lines[start]).toBeGreaterThan(0)
      for (const line of body) expect(line.startsWith('- ['), `${lines[start]}: ${line}`).toBe(true)
    }
  })

  it('leads with the npm install, not just the registry', () => {
    for (const file of [short, full]) {
      expect(file).toContain('pnpm add @liquefy-ui/react')
      // The retired pre-release banner claimed the install did not resolve.
      expect(file).not.toContain('Pre-release')
    }
  })
})

describe('llms.txt links', () => {
  const links = [...short.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(([, href]) => href)

  it('links to something for every catalogue entry', () => {
    for (const entry of entries) {
      expect(links, entry.slug).toContain(`${HOMEPAGE}/llms/${entry.slug}.md`)
    }
  })

  // The docs site is a hash-routed SPA, so a fetcher without JavaScript gets the
  // same empty shell for every route. Anything an agent is pointed at as content
  // has to be a real file.
  it('points at fetchable files, keeping hash routes for the optional section', () => {
    const optional = short.indexOf('## Optional')
    const contentLinks = [...short.slice(0, optional).matchAll(/\]\(([^)]+)\)/g)].map(([, href]) => href)
    const spa = contentLinks.filter((href) => href.includes('/#/') && !href.includes('/components/icons'))
    expect(spa).toEqual([])
  })

  it('has a file behind every /llms/ link', () => {
    const missing = links
      .filter((href) => href.startsWith(`${HOMEPAGE}/llms/`))
      .map((href) => href.slice(`${HOMEPAGE}/llms/`.length))
      .filter((name) => !pages.includes(name))
    expect(missing).toEqual([])
  })

  it('has a page for the icon set and for the engine', () => {
    expect(pages).toContain('icons.md')
    expect(pages).toContain('core.md')
    expect(pages).toContain('mcp.md')
  })
})

describe('what the generated files claim', () => {
  it('never presents an internal name as importable', () => {
    expect(internalNames.length).toBeGreaterThan(0)
    for (const file of [short, full]) {
      for (const name of internalNames) {
        expect(file, name).not.toContain(`import { ${name} }`)
      }
    }
  })

  it('imports only public names on every component page', () => {
    const wrong = []
    for (const page of pages) {
      const text = readFileSync(new URL(page, pagesDir), 'utf8')
      const match = /Import: `import \{([^}]*)\} from '@liquefy-ui\/react'`/.exec(text)
      if (!match) continue
      for (const name of match[1].split(',').map((entry) => entry.trim())) {
        if (!publicNames.has(name)) wrong.push(`${page}: ${name}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('names every icon and every core export in the full reference', () => {
    for (const name of icons.names) expect(full, name).toContain(name)
    for (const name of [...core.values, ...core.types]) expect(full, name).toContain(name)
  })

  it('carries the real type declarations, whole', () => {
    // Two shapes the declaration reader used to drop on the floor.
    expect(full).toContain('export type LiquidStyleState =')
    expect(full).toContain("| '_focusVisible'")
    expect(full).toContain('export type LiquidResponsive<T>')
  })
})

describe('documented tool names', () => {
  const toolNames = tools.map((tool) => tool.name)

  // Four places describe these tools, and the server is the only one that can be
  // wrong in a way nobody notices until an agent calls something that is not there.
  it('matches the server in every generated file', () => {
    expect(toolNames.length).toBeGreaterThan(5)
    const mcpPage = readFileSync(new URL('mcp.md', pagesDir), 'utf8')
    for (const name of toolNames) {
      expect(mcpPage, name).toContain(`\`${name}\``)
      expect(full, name).toContain(`\`${name}\``)
    }
  })

  it('invents no tool the server does not implement', () => {
    const mcpPage = readFileSync(new URL('mcp.md', pagesDir), 'utf8')
    const documented = [...mcpPage.matchAll(/^- `([a-z_]+)`/gm)].map(([, name]) => name)
    expect(documented.sort()).toEqual([...toolNames].sort())
  })

  it('matches the docs site table as well', () => {
    const page = readFileSync(
      new URL('../apps/docs/src/docs/pages/ai-tooling.tsx', import.meta.url),
      'utf8',
    )
    const documented = [...page.matchAll(/<code>([a-z_]+)<\/code>, /g)].map(([, name]) => name)
    for (const name of toolNames) expect(documented, name).toContain(name)
  })
})
