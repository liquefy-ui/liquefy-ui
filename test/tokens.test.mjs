import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The stylesheet is the whole design system: every colour, radius and timing the
 * components read is a `--lq-*` custom property declared in it. A typo in a name
 * fails silently — the property resolves to nothing and the surface renders
 * without that part of the material — and a token declared in one theme but not
 * the other breaks only that theme. Neither shows up in a type error, so they are
 * checked here instead.
 */

const srcDir = new URL('../packages/react/src/', import.meta.url)
const css = readFileSync(new URL('styles.css', srcDir), 'utf8')
const tailwind = readFileSync(new URL('tailwind.css', srcDir), 'utf8')

const coreDir = new URL('../packages/core/src/', import.meta.url)

/** Comments talk about tokens in prose (`var(--lq-token)`), so they are stripped. */
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')

const readSources = (dir) => readdirSync(dir)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => ({ file, text: withoutComments(readFileSync(new URL(file, dir), 'utf8')) }))

const sources = readSources(srcDir)
const engineSources = readSources(coreDir)

/** Token names declared anywhere in the stylesheet, in any scope. */
const declared = new Set([...css.matchAll(/(--lq-[a-z0-9-]+)\s*:/g)].map(([, name]) => name))

/** Token names declared inside one selector block. */
const declaredIn = (selector) => {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No such block in styles.css: ${selector}`)
  const end = css.indexOf('\n  }', start)
  const body = css.slice(start, end === -1 ? undefined : end)
  return new Set([...body.matchAll(/(--lq-[a-z0-9-]+)\s*:/g)].map(([, name]) => name))
}

/**
 * Tokens nothing declares in CSS because JavaScript writes them per instance: the
 * springs write theirs every frame, and components pass their own as inline vars.
 * Derived from the source rather than listed here, so a new one needs no edit —
 * while a name only ever *read* still fails, which is the typo worth catching.
 */
const runtimeWritten = new Set([
  ...[...sources, ...engineSources].flatMap(({ text }) => [
    ...[...text.matchAll(/setProperty\('(--lq-[a-z0-9-]+)'/g)].map(([, name]) => name),
    ...[...text.matchAll(/'(--lq-[a-z0-9-]+)':/g)].map(([, name]) => name),
  ]),
  // Written by the styles prop's own `radius` shorthand and by the provider.
  '--lq-radius',
  '--lq-intensity',
  '--lq-space',
  '--lq-accent',
])

describe('design tokens', () => {
  it('declares every token the stylesheet reads', () => {
    const read = [...css.matchAll(/var\((--lq-[a-z0-9-]+)/g)].map(([, name]) => name)
    const undeclared = [...new Set(read)].filter((name) => !declared.has(name) && !runtimeWritten.has(name))
    expect(undeclared).toEqual([])
  })

  // A token that exists in dark but not in light renders the light theme with a
  // hole in it, and nothing anywhere fails.
  it('declares the same token set in both themes', () => {
    const dark = declaredIn('.lq-provider')
    const light = declaredIn(".lq-provider[data-liquid-theme='light']")
    expect([...dark].filter((name) => !light.has(name))).toEqual([])
    expect([...light].filter((name) => !dark.has(name))).toEqual([])
  })

  // theme="system" resolves in CSS, so the media-query block has to carry the same
  // values as the explicit one or that mode drifts away from the other two.
  it('mirrors the light theme into the prefers-color-scheme block', () => {
    const start = css.indexOf('@media (prefers-color-scheme: light)')
    expect(start).toBeGreaterThan(-1)
    const body = css.slice(start, start + 3000)
    const system = new Set([...body.matchAll(/(--lq-[a-z0-9-]+)\s*:/g)].map(([, name]) => name))
    const light = declaredIn(".lq-provider[data-liquid-theme='light']")
    expect([...light].filter((name) => !system.has(name))).toEqual([])
  })

  it('keeps every component rule inside the cascade layer', () => {
    // One layer means one predictable place in the cascade, which is what lets a
    // `styles` object or a Tailwind utility win without !important.
    expect(css.trimStart().startsWith('@layer liquefy-ui {')).toBe(true)
  })

  it('reads only tokens that exist from component source', () => {
    const missing = []
    for (const { file, text } of [...sources, ...engineSources]) {
      for (const [, name] of text.matchAll(/var\((--lq-[a-z0-9-]+)/g)) {
        if (!declared.has(name) && !runtimeWritten.has(name)) missing.push(`${file}: ${name}`)
      }
      // `$token` references inside a styles object resolve to var(--lq-token).
      for (const [, name] of text.matchAll(/'\$([a-z][a-z0-9-]*)'/g)) {
        const token = `--lq-${name}`
        if (!declared.has(token) && !runtimeWritten.has(token)) missing.push(`${file}: $${name}`)
      }
    }
    expect(missing).toEqual([])
  })
})

describe('the Tailwind bridge', () => {
  it('declares the layer order that decides whether utilities win', () => {
    expect(tailwind).toContain('@layer liquefy-ui, theme, base, components, utilities;')
    expect(tailwind.indexOf('@layer liquefy-ui, theme'))
      .toBeLessThan(tailwind.indexOf("@import './styles.css'"))
  })

  // `inline` is what keeps a utility resolving var(--lq-accent) at use time rather
  // than baking in whichever value was current at build time — which is the whole
  // reason a theme flip works without a rebuild.
  it('bridges the tokens with @theme inline', () => {
    expect(tailwind).toContain('@theme inline')
  })

  // The README and the Tailwind doc page name these utilities by hand; the bridge
  // is the only thing that can make them real.
  it('declares the theme keys the documentation advertises', () => {
    for (const key of [
      '--color-liquid-accent',
      '--color-liquid-muted',
      '--color-liquid-foreground',
      '--color-liquid-glass-soft',
      '--color-liquid-line',
      '--radius-liquid',
      '--shadow-liquid',
      '--ease-liquid',
      '--spacing-liquid',
    ]) {
      expect(tailwind, key).toContain(key)
    }
  })

  it('only bridges tokens the stylesheet declares', () => {
    const bridged = [...tailwind.matchAll(/var\((--lq-[a-z0-9-]+)/g)].map(([, name]) => name)
    expect(bridged.length).toBeGreaterThan(8)
    const undeclared = [...new Set(bridged)].filter((name) => !declared.has(name) && !runtimeWritten.has(name))
    expect(undeclared).toEqual([])
  })
})
