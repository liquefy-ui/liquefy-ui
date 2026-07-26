import { describe, expect, it } from 'vitest'
import { defaultBreakpoints } from '../src/provider'
import { compileLiquidStyles, type LiquidStyles } from '../src/styles-prop'

const order = ['sm', 'md', 'lg', 'xl'] as const

const compile = (styles: LiquidStyles) => compileLiquidStyles(styles, defaultBreakpoints, order)

describe('styles prop — static values', () => {
  it('stays on the style attribute when nothing is conditional', () => {
    const { inline, rules, token } = compile({ color: 'accent', p: 3 })
    expect(rules).toBeUndefined()
    expect(token).toBeUndefined()
    expect(inline).toEqual({
      color: 'var(--lq-accent)',
      padding: 'calc(var(--lq-space, 4px) * 3)',
    })
  })

  it('reads numbers as pixels outside the spacing shorthands', () => {
    expect(compile({ maxW: 480, opacity: 0.5, w: 240 }).inline).toEqual({
      maxWidth: '480px',
      opacity: '0.5',
      width: '240px',
    })
  })

  it('resolves $token references anywhere in a string', () => {
    expect(compile({ border: '1px solid $line', transitionDuration: '$duration' }).inline).toEqual({
      border: '1px solid var(--lq-line)',
      transitionDuration: 'var(--lq-duration)',
    })
  })

  it('keeps the squish term when radius is overridden', () => {
    expect(compile({ radius: 12 }).inline).toEqual({
      '--lq-radius': '12px',
      borderRadius: 'calc(var(--lq-radius) + var(--lq-squish, 0) * 6px)',
    })
  })

  it('passes custom properties through untouched', () => {
    expect(compile({ '--lq-blur': '6px' }).inline).toEqual({ '--lq-blur': '6px' })
  })

  it('skips undefined and false values', () => {
    expect(compile({ color: undefined, p: false as never }).inline).toBeUndefined()
  })
})

describe('styles prop — conditional values', () => {
  it('moves everything into the sheet so states can win over the base', () => {
    const { inline, owned, rules, token } = compile({ color: 'accent', _hover: { color: 'tint' } })
    expect(inline).toBeUndefined()
    expect(owned).toEqual(['color'])
    expect(rules).toBe(
      `.${token}{color:var(--lq-accent)}.${token}:hover{color:var(--lq-tint)}`,
    )
  })

  it('orders breakpoints ascending regardless of key order', () => {
    const { rules, token } = compile({ p: { base: 1, lg: 4, sm: 2 } })
    expect(rules).toBe(
      `.${token}{padding:calc(var(--lq-space, 4px) * 1)}` +
        `@media (min-width: 640px){.${token}{padding:calc(var(--lq-space, 4px) * 2)}}` +
        `@media (min-width: 1024px){.${token}{padding:calc(var(--lq-space, 4px) * 4)}}`,
    )
  })

  it('claims the property even when only a breakpoint sets it', () => {
    expect(compile({ w: { md: 240 } }).owned).toEqual(['width'])
  })

  it('expands _dark into both the attribute and the system media query', () => {
    const { rules, token } = compile({ _dark: { bg: '$glass-soft' } })
    expect(rules).toBe(
      `[data-liquid-theme='dark'] .${token}{background-color:var(--lq-glass-soft)}` +
        `@media (prefers-color-scheme: dark){[data-liquid-theme='system'] .${token}` +
        `{background-color:var(--lq-glass-soft)}}`,
    )
  })

  it('substitutes & in raw selector keys and nests at-rules', () => {
    const { rules, token } = compile({
      '&:has(svg)': { gap: 2 },
      '@supports (color: lch(0 0 0))': { color: 'lch(50% 40 20)' },
    })
    expect(rules).toBe(
      `.${token}:has(svg){gap:calc(var(--lq-space, 4px) * 2)}` +
        `@supports (color: lch(0 0 0)){.${token}{color:lch(50% 40 20)}}`,
    )
  })

  it('nests conditions inside one another', () => {
    const { rules, token } = compile({ _hover: { _dark: { opacity: 1 } } })
    expect(rules).toBe(
      `[data-liquid-theme='dark'] .${token}:hover{opacity:1}` +
        `@media (prefers-color-scheme: dark){[data-liquid-theme='system'] .${token}:hover{opacity:1}}`,
    )
  })

  it('hashes deterministically, and differently for different input', () => {
    expect(compile({ _hover: { p: 2 } }).token).toBe(compile({ _hover: { p: 2 } }).token)
    expect(compile({ _hover: { p: 2 } }).token).not.toBe(compile({ _hover: { p: 3 } }).token)
  })

  it('honours custom breakpoints', () => {
    const { rules } = compileLiquidStyles({ w: { md: 10 } }, { ...defaultBreakpoints, md: '52em' }, order)
    expect(rules).toContain('@media (min-width: 52em)')
  })
})
