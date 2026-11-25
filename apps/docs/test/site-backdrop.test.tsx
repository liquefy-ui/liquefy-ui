// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { DocsSite } from '../src/docs/docs-site'
import { LabSite } from '../src/lab/lab-site'
import { Landing } from '../src/site/landing'
import { PlaygroundPage } from '../src/site/playground-page'
import { SiteProvider } from '../src/site/site-config'

/**
 * Every route sits on one still mesh gradient, and nothing else: the drifting
 * glows and the ruled grid it replaced are gone. Still matters for speed as
 * well as looks — every backdrop filter in front of a moving background is
 * redrawn on each frame it moves, which once halved the frame rate on #/lab —
 * so these tests keep the mesh still and keep the old layers from coming back.
 */
// Not `new URL(…, import.meta.url)`: under jsdom Vite rewrites that into a site path.
const read = (path: string) => readFileSync(join(import.meta.dirname, path), 'utf8')
const css = read('../src/styles.css').replace(/\/\*[\s\S]*?\*\//g, '')
const chrome = read('../src/site/chrome.tsx')

const backdropOf = (page: ReactNode) => {
  document.body.innerHTML = renderToStaticMarkup(<SiteProvider>{page}</SiteProvider>)
  return {
    leftovers: document.querySelectorAll('.ambient, .grid-wash, .noise').length,
    meshes: document.querySelectorAll('.site-mesh').length,
  }
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

describe('the page backdrop', () => {
  it.each([
    ['the landing page', <Landing key="landing" />],
    ['the docs', <DocsSite key="docs" route="#/docs/installation" />],
    ['the playground', <PlaygroundPage key="playground" route="#/playground" />],
    ['the Lab', <LabSite key="lab" route="#/lab" />],
  ])('is one mesh gradient on %s', (_, page) => {
    expect(backdropOf(page)).toEqual({ leftovers: 0, meshes: 1 })
  })

  // Still everywhere but the docs and component pages, which drift — and stop
  // when the OS asks for reduced motion.
  it('holds the mesh still, except where it is asked to drift', () => {
    const meshes = [...chrome.matchAll(/<MeshGradient[\s\S]*?\/>/g)].map(([tag]) => tag)
    expect(meshes).toHaveLength(2)
    expect(meshes.filter((tag) => /\bspeed=\{0\}/.test(tag))).toHaveLength(1)
    expect(meshes.some((tag) => /speed=\{reducedMotion \? 0 : /.test(tag))).toBe(true)
    expect(read('../src/docs/docs-chrome.tsx')).toMatch(/<Ambience drifting=\{section === 'docs' \|\| section === 'components'\} \/>/)
  })

  it('keeps no grid or drifting glow in the stylesheet', () => {
    expect(css).not.toMatch(/\.noise\b|\.ambient\b|\.grid-wash\b|--grid-line|ambient-float/)
  })
})
