// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { DocsSite } from '../src/docs/docs-site'
import { LabSite } from '../src/lab/lab-site'
import { SiteProvider } from '../src/site/site-config'

/**
 * The background glow drifts on a CSS animation, and every backdrop filter in
 * front of it is redrawn on each frame it moves. The Lab's previews are heavy
 * glass, so under a drifting glow the top of #/lab ran at half rate; the Lab
 * holds the glow still instead. Nothing fails when that rule stops matching —
 * the page just gets slow again — so these tests keep it matching on the Lab,
 * and keep it off the pages that were never slow.
 */
// Not `new URL(…, import.meta.url)`: under jsdom Vite rewrites that into a site path.
const css = readFileSync(join(import.meta.dirname, '../src/styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Rules outside any at-rule. The `prefers-reduced-motion` stop is not what the
 * Lab relies on, so a rule inside a media query must not count.
 */
const topLevelRules = () => {
  const rules: { body: string; selector: string }[] = []
  let depth = 0
  let start = 0
  let bodyStart = 0
  let selector = ''

  for (let index = 0; index < css.length; index += 1) {
    if (css[index] === '{') {
      // Whatever follows the last `;` — which steps over the `@import` at the top.
      if (depth === 0) {
        selector = css.slice(start, index).split(';').at(-1)!.trim()
        bodyStart = index + 1
      }
      depth += 1
    } else if (css[index] === '}') {
      depth -= 1
      if (depth === 0) {
        if (!selector.startsWith('@')) rules.push({ body: css.slice(bodyStart, index), selector })
        start = index + 1
      }
    }
  }

  return rules
}

const stillSelectors = topLevelRules()
  .filter(({ body }) => /(^|[;\s])animation:\s*none\b/.test(body))
  .flatMap(({ selector }) => selector.split(/,(?![^(]*\))/).map((part) => part.trim()))

const isStill = (element: Element) => stillSelectors.some((selector) => element.matches(selector))

/** The two glow layers of a page, as the router mounts it. */
const glowsOn = (page: ReactNode) => {
  document.body.innerHTML = renderToStaticMarkup(<SiteProvider>{page}</SiteProvider>)
  return [...document.querySelectorAll('.ambient')]
}

beforeAll(() => {
  // jsdom has no media queries, and the site asks one for the OS theme on start.
  window.matchMedia = (query: string) => ({
    addEventListener: () => {},
    matches: false,
    media: query,
    removeEventListener: () => {},
  }) as unknown as MediaQueryList
})

describe('the background glow', () => {
  it('reads the rules it is meant to police', () => {
    expect(topLevelRules().length).toBeGreaterThan(200)
    expect(stillSelectors.length).toBeGreaterThan(0)
  })

  it.each(['#/lab', '#/lab/glass-merge'])('holds still on %s', (route) => {
    const glows = glowsOn(<LabSite route={route} />)
    expect(glows).toHaveLength(2)
    for (const glow of glows) expect(isStill(glow), glow.className).toBe(true)
  })

  it('keeps drifting on the docs', () => {
    const glows = glowsOn(<DocsSite route="#/docs/installation" />)
    expect(glows).toHaveLength(2)
    for (const glow of glows) expect(isStill(glow), glow.className).toBe(false)
  })
})
