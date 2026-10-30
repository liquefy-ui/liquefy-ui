// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiquefyProvider } from '@liquefy-ui/react'
import { describe, expect, it } from 'vitest'
import { docOrder } from '../src/docs/docs-nav'

/**
 * Inline `code` in prose is a chip that must not wrap; the `code` inside a code
 * block has to keep every newline. On a doc page both are a `<code>` under
 * `.docs-prose`, so a rule written for the first reaches the second unless it
 * says otherwise. It did once, and every multi-line block on every doc page
 * rendered as a single line — on the live site, where nothing failed.
 */
// Not `new URL(…, import.meta.url)`: under jsdom Vite rewrites that into a site path.
const css = readFileSync(join(import.meta.dirname, '../src/styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

// The innermost `selector { declarations }` blocks; @media wrappers fall away,
// which is what we want: a rule that collapses newlines at one width is still a bug.
const collapsingSelectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(^|[;\s])white-space:\s*(normal|nowrap)\b/.test(body))
  .flatMap(([, selector]) => selector.trim().split(/,(?![^(]*\))/).map((part) => part.trim()))

/** Selectors that would set `white-space` on this element to a value that folds newlines. */
const collapsing = (element: Element) => collapsingSelectors.filter((selector) => element.matches(selector))

/** A doc page as `DocPage` in docs-site.tsx mounts it. */
const mount = (slug: string) => {
  const doc = docOrder.find((entry) => entry.slug === slug)
  if (!doc) throw new Error(`no doc page ${slug}`)
  document.body.innerHTML = renderToStaticMarkup(
    <LiquefyProvider theme="light">
      <article className="docs-page docs-prose">{doc.render()}</article>
    </LiquefyProvider>,
  )
  return document.body
}

describe('code blocks on doc pages', () => {
  it('reads the rules it is meant to police', () => {
    expect(collapsingSelectors.length).toBeGreaterThan(3)
  })

  it.each(docOrder.map((doc) => doc.slug))('keeps the line breaks in every block on %s', (slug) => {
    const blocks = [...mount(slug).querySelectorAll('pre code')]
    const reached = blocks.flatMap((block) => collapsing(block))
    expect(reached).toEqual([])
  })

  it('has multi-line blocks to protect', () => {
    const lines = [...mount('motion').querySelectorAll('pre code')].map((block) => block.textContent!.split('\n').length)
    expect(Math.max(...lines)).toBeGreaterThan(10)
  })

  it('still keeps inline code in prose on one line', () => {
    const inline = [...mount('installation').querySelectorAll('p code')]
    expect(inline.length).toBeGreaterThan(0)
    for (const code of inline) expect(collapsing(code), code.textContent!).not.toEqual([])
  })
})
