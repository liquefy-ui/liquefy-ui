import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LiquidButton } from '../src/liquid-button'
import { LiquidSurface } from '../src/liquid-surface'
import { LiquefyProvider } from '../src/provider'
import { getLiquefyStyleSheet } from '../src/styles-prop'

const render = (node: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(<LiquefyProvider theme="dark">{node}</LiquefyProvider>)

describe('styles prop on real components', () => {
  it('lands static values on the style attribute without a generated class', () => {
    const markup = render(<LiquidButton styles={{ mt: 2, p: 3 }}>Go</LiquidButton>)
    expect(markup).toContain('padding:calc(var(--lq-space, 4px) * 3)')
    expect(markup).toContain('margin-top:calc(var(--lq-space, 4px) * 2)')
    expect(markup).not.toMatch(/class="[^"]*lq-x-/)
  })

  it('keeps the component classes and the consumer class alongside the generated one', () => {
    const markup = render(
      <LiquidButton className="mine" styles={{ _hover: { opacity: 0.5 } }}>Go</LiquidButton>,
    )
    const [, classes] = /class="(lq-button[^"]*)"/.exec(markup) ?? []
    expect(classes?.split(' ')).toEqual(['lq-button', expect.stringMatching(/^lq-x-/), 'mine'])
  })

  it('collects conditional rules for the server to flush', () => {
    render(<LiquidButton styles={{ _hover: { bg: '$glass-soft' } }}>Go</LiquidButton>)
    expect(getLiquefyStyleSheet()).toContain(':hover{background-color:var(--lq-glass-soft)}')
  })

  it('lets styles override a component-owned custom property', () => {
    const markup = render(<LiquidSurface styles={{ radius: 8, _hover: { opacity: 1 } }} />)
    // The component's own --lq-radius must step aside, or its inline value would
    // outrank the generated class and the override would silently do nothing.
    expect(markup).not.toContain('--lq-radius:var(--lq-radius-default)')
    expect(getLiquefyStyleSheet()).toContain('--lq-radius:8px')
  })

  it('still applies the style prop last', () => {
    const markup = render(<LiquidSurface style={{ opacity: 0.25 }} styles={{ opacity: 1 }} />)
    expect(markup).toContain('opacity:0.25')
  })

  it('threads the provider spacing scale into the document', () => {
    expect(renderToStaticMarkup(<LiquefyProvider spacing={6}><span /></LiquefyProvider>))
      .toContain('--lq-space:6px')
  })
})
