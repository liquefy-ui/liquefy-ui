// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LiquidSurface } from '../src/liquid-surface'
import {
  defaultBreakpoints,
  LiquefyProvider,
  useLiquefyConfig,
  useLiquefyPortalContainer,
} from '../src/provider'

/**
 * The provider is the one component every tree needs, and everything it writes is
 * a public contract: the stylesheet is scoped to those attributes, the `styles`
 * prop resolves `$tokens` against those custom properties, and the docs describe
 * both. Changing any of it silently breaks themes in projects we cannot see.
 */

afterEach(() => {
  document.body.innerHTML = ''
})

const providerElement = () => document.querySelector<HTMLElement>('.lq-provider')!

const Probe = () => {
  const config = useLiquefyConfig()
  return <output data-testid="config">{JSON.stringify(config)}</output>
}

const readConfig = () => JSON.parse(screen.getByTestId('config').textContent ?? '{}')

describe('provider defaults', () => {
  it('hands components the documented default configuration', () => {
    render(<LiquefyProvider><Probe /></LiquefyProvider>)
    expect(readConfig()).toEqual({
      breakpoints: defaultBreakpoints,
      intensity: 0.72,
      lens: true,
      motion: true,
      spacing: 4,
      theme: 'system',
      tint: '#8eb9ff',
      transparency: true,
      webgl: true,
      wobbliness: 1,
    })
  })

  it('defaults the breakpoints the responsive styles syntax reads', () => {
    expect(defaultBreakpoints).toEqual({ lg: 1024, md: 768, sm: 640, xl: 1280 })
  })
})

describe('what the provider writes to the DOM', () => {
  it('writes the attributes the stylesheet is scoped to', () => {
    render(
      <LiquefyProvider motion={false} theme="dark" transparency={false}>
        <span />
      </LiquefyProvider>,
    )
    const provider = providerElement()
    expect(provider.dataset.liquidTheme).toBe('dark')
    expect(provider.dataset.liquidMotion).toBe('off')
    expect(provider.dataset.liquidTransparency).toBe('off')
  })

  it('writes the tokens components and the styles prop read', () => {
    render(
      <LiquefyProvider intensity={0.9} spacing={6} tint="#ff7a59">
        <span />
      </LiquefyProvider>,
    )
    const { style } = providerElement()
    expect(style.getPropertyValue('--lq-accent')).toBe('#ff7a59')
    expect(style.getPropertyValue('--lq-intensity')).toBe('0.9')
    expect(style.getPropertyValue('--lq-space')).toBe('6px')
  })

  it('takes a spacing scale in any CSS length', () => {
    render(<LiquefyProvider spacing="0.25rem"><span /></LiquefyProvider>)
    expect(providerElement().style.getPropertyValue('--lq-space')).toBe('0.25rem')
  })

  it('keeps a consumer className alongside its own', () => {
    render(<LiquefyProvider className="app-shell"><span /></LiquefyProvider>)
    expect(providerElement().className).toBe('lq-provider app-shell')
  })

  // Popovers mount here rather than in document.body, so they stay inside the
  // element carrying the custom properties and keep their fill and shadow.
  it('hosts a portal container inside its own subtree', () => {
    const Portal = () => {
      const container = useLiquefyPortalContainer()
      return <output data-testid="portal">{container?.className ?? 'none'}</output>
    }
    render(<LiquefyProvider><Portal /></LiquefyProvider>)
    expect(screen.getByTestId('portal').textContent).toBe('lq-portal')
    expect(providerElement().querySelector('.lq-portal')).not.toBeNull()
  })
})

describe('nested providers', () => {
  // Documented on #/docs/provider, and the docs site depends on it: a nested
  // provider resolves unset props from the library defaults, NOT from the
  // provider above it. If that ever changes, the guidance has to change with it.
  it('does not inherit the surrounding configuration', () => {
    render(
      <LiquefyProvider intensity={1.1} theme="dark" tint="#ff7a59" wobbliness={0.2}>
        <LiquefyProvider webgl={false}>
          <Probe />
        </LiquefyProvider>
      </LiquefyProvider>,
    )
    const config = readConfig()
    expect(config.webgl).toBe(false)
    expect(config.tint).toBe('#8eb9ff')
    expect(config.intensity).toBe(0.72)
    expect(config.theme).toBe('system')
    expect(config.wobbliness).toBe(1)
  })

  it('keeps everything a spread hands it', () => {
    const Inheriting = ({ children }: { children: React.ReactNode }) => {
      const config = useLiquefyConfig()
      return <LiquefyProvider {...config} webgl={false}>{children}</LiquefyProvider>
    }
    render(
      <LiquefyProvider intensity={1.1} theme="dark" tint="#ff7a59">
        <Inheriting><Probe /></Inheriting>
      </LiquefyProvider>,
    )
    const config = readConfig()
    expect(config).toMatchObject({ intensity: 1.1, theme: 'dark', tint: '#ff7a59', webgl: false })
  })

  it('merges a partial breakpoints object with the defaults', () => {
    render(<LiquefyProvider breakpoints={{ md: 800 }}><Probe /></LiquefyProvider>)
    expect(readConfig().breakpoints).toEqual({ ...defaultBreakpoints, md: 800 })
  })
})

describe('per-surface overrides', () => {
  it('lets a surface opt out of the shader the provider turned on', () => {
    const { container } = render(
      <LiquefyProvider webgl>
        <LiquidSurface data-testid="on">on</LiquidSurface>
        <LiquidSurface data-testid="off" webgl={false}>off</LiquidSurface>
      </LiquefyProvider>,
    )
    const surfaces = container.querySelectorAll('.lq-surface')
    expect(surfaces[0]?.querySelector('canvas')).not.toBeNull()
    expect(surfaces[1]?.querySelector('canvas')).toBeNull()
  })

  it('carries the variant the stylesheet keys its fills off', () => {
    const { container } = render(
      <LiquefyProvider>
        <LiquidSurface variant="tinted">tinted</LiquidSurface>
      </LiquefyProvider>,
    )
    expect(container.querySelector('.lq-surface')?.getAttribute('data-liquid-variant')).toBe('tinted')
  })
})
