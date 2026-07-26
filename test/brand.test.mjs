import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

const files = readdirSync(new URL('brand/', root)).filter((file) => file.endsWith('.svg'))
const svgs = Object.fromEntries(files.map((file) => [file, read(`brand/${file}`)]))

// The header renders the mark in CSS; these files redraw it in SVG. Two
// descriptions of one shape drift unless something compares them, and the
// drift is invisible — the site keeps looking right while the logo goes wrong.
const css = read('apps/docs/src/styles.css')
const rule = css.match(/\.brand-mark span \{([^}]*)\}/)[1]
const declaration = (name) => rule.match(new RegExp(`${name}: ([^;]+);`))[1].trim()

describe('the mark matches the header it was drawn from', () => {
  const rotation = declaration('transform').match(/rotate\((-?[\d.]+)deg\)/)[1]
  const ratio = parseFloat(declaration('width')) / parseFloat(declaration('height'))

  it.each(files)('%s uses the same -29deg tilt', (file) => {
    const angles = [...svgs[file].matchAll(/rotate\((-?[\d.]+)\s/g)].map(([, value]) => value)
    expect(angles.length, 'both capsules are drawn').toBe(2)
    expect(new Set(angles)).toEqual(new Set([rotation]))
  })

  it.each(files)('%s keeps the capsule proportions', (file) => {
    // The bodies only. A rect with fill="none" is the inset highlight ring,
    // deliberately smaller, and the tile behind the icon has no x/y at all.
    const capsules = [...svgs[file].matchAll(/<rect\b[^>]*>/g)]
      .map(([tag]) => Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])))
      .filter((rect) => rect.x !== undefined && rect.fill !== 'none')

    expect(capsules.length, 'both capsules, plus any overlay drawn on them').toBeGreaterThanOrEqual(2)
    for (const capsule of capsules) {
      expect(Number(capsule.width) / Number(capsule.height)).toBeCloseTo(ratio, 3)
      // border-radius: 999px on a 10x16 box is a full half-width round cap.
      expect(Number(capsule.rx)).toBeCloseTo(Number(capsule.width) / 2, 3)
    }
  })
})

describe('the files are usable where they are used', () => {
  it('carries no <text>: a logo cannot depend on an installed font', () => {
    for (const [file, svg] of Object.entries(svgs)) {
      expect(svg, file).not.toMatch(/<text[\s>]/)
      expect(svg, file).not.toMatch(/font-family/)
    }
  })

  it('outlines the wordmark in both lockups', () => {
    for (const file of ['liquefy-logo.svg', 'liquefy-logo-dark.svg']) {
      expect(svgs[file], file).toMatch(/<path fill=/)
    }
  })

  it('names itself for a screen reader', () => {
    for (const [file, svg] of Object.entries(svgs)) {
      expect(svg, file).toContain('aria-label="liquefy-ui"')
    }
  })

  // The header's mark is tinted from --lq-accent, and this site's default tint
  // is Graphite. A coloured glass ramp in these files puts a blue logo next to a
  // grey one on the same page, which is what the ramp below is neutral to avoid.
  it('keeps the glass neutral, so no file is tinted against the others', () => {
    for (const [file, svg] of Object.entries(svgs)) {
      const colours = [...svg.matchAll(/(?:stop|flood)-color="#([0-9a-f]{6})"/g)].map(([, hex]) => hex)
      expect(colours.length, `${file} paints the glass`).toBeGreaterThan(0)
      for (const hex of colours) {
        const channels = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16))
        expect(Math.max(...channels) - Math.min(...channels), `#${hex} in ${file}`).toBeLessThanOrEqual(8)
      }
    }
  })

  it('differs between the two lockups only in the ink', () => {
    const strip = (svg) => svg.replace(/fill="(#[0-9a-f]{6}|rgba\([^)]*\))"/g, 'fill="INK"')
    expect(strip(svgs['liquefy-logo.svg'])).toEqual(strip(svgs['liquefy-logo-dark.svg']))
  })
})

describe('the site and the README reach them', () => {
  it('serves the icon as the favicon', () => {
    const html = read('apps/docs/index.html')
    expect(html).toContain('href="/brand/liquefy-icon.svg"')
    expect(html).toContain('rel="apple-touch-icon"')
  })

  it('copies the directory into the docs build, from both generate scripts', () => {
    for (const manifest of ['package.json', 'apps/docs/package.json']) {
      expect(JSON.parse(read(manifest)).scripts.generate, manifest).toContain('copy-brand.mjs')
    }
    expect(read('.gitignore'), 'the copies are output, not source').toContain('apps/docs/public/brand')
  })

  it('shows a lockup at the top of the README, one per theme', () => {
    const readme = read('README.md')
    expect(readme).toContain('brand/liquefy-logo.svg')
    expect(readme).toContain('brand/liquefy-logo-dark.svg')
    expect(readme).toContain('prefers-color-scheme: dark')
  })

  it('documents every file in brand/README.md', () => {
    const guide = read('brand/README.md')
    for (const file of files) expect(guide, file).toContain(`\`${file}\``)
  })
})

// The playground redraws the lockup inline so the stage can theme it and the
// lens can bend it. That is a second copy of the geometry, and a second copy is
// only safe while something proves it is still the same geometry.
describe("the playground's inline lockup", () => {
  const lockup = read('apps/docs/src/site/lockup.tsx')
  const logo = svgs['liquefy-logo.svg']

  it('reuses the wordmark outlines verbatim', () => {
    const outlines = [...logo.matchAll(/<path fill="[^"]*" d="([^"]+)"\/>/g)].map(([, d]) => d)
    expect(outlines.length, 'liquefy and ui').toBe(2)
    for (const d of outlines) expect(lockup).toContain(`d="${d}"`)
  })

  it('places the mark with the same transform and capsules', () => {
    expect(lockup).toContain(logo.match(/transform="(translate\([^"]*scale\([^"]*\))"/)[1])
    for (const [, transform] of logo.matchAll(/transform="(rotate\(-29[^"]*)"/g)) {
      expect(lockup).toContain(`transform="${transform}"`)
    }
  })

  it('shares the viewBox, so the padding and the proportions carry over', () => {
    expect(lockup).toContain(`viewBox="${logo.match(/viewBox="([^"]+)"/)[1]}"`)
  })

  it('takes the wordmark colour from the page and the mark from the brand', () => {
    expect(lockup, 'themeable ink').toContain('fill="currentColor"')
    expect(lockup, 'the capsules keep their gradient').toContain('url(#pg-lockup-glass)')
    // The sheen is deliberately absent here — the ramp underneath it is not.
    const glass = logo.match(/id="lq-glass"[^>]*>([\s\S]*?)<\/linearGradient>/)[1]
    for (const [, hex] of glass.matchAll(/stop-color="(#[0-9a-f]{6})"/g)) {
      expect(lockup, 'the same glass ramp as the file it was lifted from').toContain(`stopColor="${hex}"`)
    }
    expect(read('apps/docs/src/styles.css'), 'the stage sets that ink').toMatch(
      /\.pg-stage__word \{[^}]*color: var\(--line-strong\)/,
    )
  })

  it('is the thing the stage actually renders', () => {
    const playground = read('apps/docs/src/site/playground.tsx')
    expect(playground).toContain('<LiquefyLockup className="pg-stage__word" />')
    expect(playground, 'the outlined word it replaced is gone').not.toContain('LIQUID')
  })
})
