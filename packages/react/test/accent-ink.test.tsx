// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LiquefyProvider } from '../src'
import { accentInkFor, accentInkProperties, contrast, parseTint } from '../src/accent-ink'

/**
 * The accent is drawn as text, rings and indicators, usually lifted toward
 * white. A white or pale tint then vanishes on the light page, so the provider
 * derives a readable stand-in per theme — and only when the tint needs one, so
 * a tint that already reads keeps the exact look it had.
 */
const LIGHT_PAGE = [233, 235, 240] as const
const DARK_PAGE = [30, 38, 60] as const
const lift = (color: readonly number[]) => color.map((channel) => channel + (255 - channel) * 0.18) as unknown as readonly [number, number, number]

describe('accent ink', () => {
  it('reads hex and rgb tints, and gives up on anything it cannot resolve', () => {
    expect(parseTint('#fff')).toEqual([255, 255, 255])
    expect(parseTint('#0A84FF')).toEqual([10, 132, 255])
    expect(parseTint('rgb(10 132 255 / 50%)')).toEqual([10, 132, 255])
    expect(parseTint('var(--brand)')).toBeNull()
    expect(accentInkProperties('oklch(0.7 0.1 200)')).toEqual({
      '--lq-accent-ink-dark': 'initial',
      '--lq-accent-ink-light': 'initial',
      '--lq-accent-line-dark': 'initial',
      '--lq-accent-line-light': 'initial',
    })
  })

  it('darkens a white tint in light far enough for text and for lines', () => {
    const { ink, line } = accentInkFor('#ffffff', 'light')
    const inkColor = parseTint(ink!)!
    const lineColor = parseTint(line!)!
    expect(contrast(inkColor, LIGHT_PAGE)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(lineColor, LIGHT_PAGE)).toBeGreaterThanOrEqual(3)
    // The gauge and spinner arcs lift the colour 18% toward white; it still has to read.
    expect(contrast(lift(lineColor), LIGHT_PAGE)).toBeGreaterThanOrEqual(3)
    // The least move that does it, not a jump to black.
    expect(contrast(inkColor, LIGHT_PAGE)).toBeLessThan(4.7)
  })

  it('leaves a white tint alone in dark, where it already reads', () => {
    expect(accentInkFor('#ffffff', 'dark')).toEqual({ ink: null, line: null })
  })

  it('leaves a tint that already reads untouched, so its look does not change', () => {
    expect(accentInkFor('#1d4ed8', 'light')).toEqual({ ink: null, line: null })
    expect(accentInkFor('#ffd60a', 'dark')).toEqual({ ink: null, line: null })
  })

  it('lightens a near-black tint in dark', () => {
    const { ink } = accentInkFor('#111111', 'dark')
    expect(contrast(parseTint(ink!)!, DARK_PAGE)).toBeGreaterThanOrEqual(4.5)
  })

  it('is written onto the provider, and reset where a nested provider does not need it', () => {
    const { container } = render(
      <LiquefyProvider>
        <LiquefyProvider tint="#1d4ed8"><span /></LiquefyProvider>
      </LiquefyProvider>,
    )
    const [outer, inner] = [...container.querySelectorAll<HTMLElement>('.lq-provider')]
    expect(outer!.style.getPropertyValue('--lq-accent-ink-light')).toMatch(/^#[0-9a-f]{6}$/)
    expect(outer!.style.getPropertyValue('--lq-accent-ink-dark')).toBe('initial')
    // An inherited correction for white would darken this blue for no reason.
    expect(inner!.style.getPropertyValue('--lq-accent-ink-light')).toBe('initial')
  })
})
