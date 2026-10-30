import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IconEffect, MagicReplace } from '../src/effects'
import { BellIcon, CircleCheckIcon, LockIcon } from '../src/index'

/**
 * Server rendering runs no effects and has no `window`, no `document` and no
 * Web Animations. The effects have to render their icon there all the same —
 * and a drawing that starts hidden has to be hidden in the markup, or it would
 * flash whole before the client hides it.
 */
describe('server rendering', () => {
  it('renders the icon inside every effect', () => {
    for (const effect of ['bounce', 'wiggle', 'breathe', 'rotate', 'draw'] as const) {
      const markup = renderToStaticMarkup(<IconEffect effect={effect} trigger={1}><BellIcon /></IconEffect>)
      expect(markup, effect).toContain('<svg')
      expect(markup, effect).toContain('display:contents')
    }
  })

  it('renders a continuous effect still', () => {
    const markup = renderToStaticMarkup(<IconEffect active effect="rotate"><BellIcon /></IconEffect>)
    expect(markup).not.toContain('transform')
  })

  it('hides a drawing that starts off, keeping its space', () => {
    const hidden = renderToStaticMarkup(<IconEffect drawn={false} effect="draw"><CircleCheckIcon /></IconEffect>)
    expect(hidden).toContain('visibility:hidden')
    expect(renderToStaticMarkup(<IconEffect effect="draw"><CircleCheckIcon /></IconEffect>)).not.toContain('visibility')
  })

  it('renders the current icon of a replacement', () => {
    const markup = renderToStaticMarkup(<MagicReplace><LockIcon /></MagicReplace>)
    expect(markup).toContain('<rect')
    expect(markup).toContain('display:contents')
  })
})
