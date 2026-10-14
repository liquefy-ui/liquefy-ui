// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlassMerge, type GlassMergeHandle } from '../src/glass-merge'

const attach = vi.hoisted(() => ({ calls: [] as unknown[][] }))
vi.mock('@liquefy-ui/core', async (importOriginal) => {
  const core = await importOriginal<typeof import('@liquefy-ui/core')>()
  return {
    ...core,
    attachGlassMerge: (...args: Parameters<typeof core.attachGlassMerge>) => {
      attach.calls.push(args)
      return core.attachGlassMerge(...args)
    },
  }
})

const circle = (x: number, y: number, radius: number) => ({ height: radius * 2, radius, width: radius * 2, x, y })

const mount = (node: Parameters<typeof render>[0], provider: Partial<Parameters<typeof LiquefyProvider>[0]> = {}) =>
  render(<LiquefyProvider theme="dark" webgl={false} {...provider}>{node}</LiquefyProvider>)

const rimPath = (container: HTMLElement) => container.querySelector('.lq-glass-merge__surface path')?.getAttribute('d') ?? null

afterEach(() => {
  attach.calls = []
  document.body.innerHTML = ''
})

describe('GlassMerge', () => {
  it('renders a bare surface under its children on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <GlassMerge><button type="button">Go</button></GlassMerge>
      </LiquefyProvider>,
    )
    expect(markup).toContain('class="lq-glass-merge__surface"')
    expect(markup.indexOf('lq-glass-merge__surface')).toBeLessThan(markup.indexOf('<button'))
  })

  it('draws nothing of its own: no fill, border or shadow, and it never takes the pointer', () => {
    const { container } = mount(<GlassMerge><button type="button">Go</button></GlassMerge>)
    const surface = container.querySelector<HTMLElement>('.lq-glass-merge__surface')!
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(surface.style.pointerEvents).toBe('none')
    expect(surface.style.position).toBe('absolute')
    for (const property of ['background-image', 'border', 'box-shadow']) {
      expect(surface.style.getPropertyValue(property)).toBe('')
    }
    expect(surface.nextElementSibling?.tagName).toBe('BUTTON')
  })

  it('hands motion code a handle that redraws without a render', () => {
    const ref = createRef<GlassMergeHandle>()
    const { container } = mount(<GlassMerge ref={ref} spacing={16} />)
    // jsdom is not Chromium, so this is the outline, whose contour can be read back.
    expect(ref.current!.mode).toBe('outline')
    expect(rimPath(container)).toBe('')
    ref.current!.setShapes([circle(100, 100, 28), circle(166, 100, 28)])
    expect(rimPath(container)!.match(/M/g)).toHaveLength(1)
  })

  it('draws static shapes from the prop and keeps the last shapes across new options', () => {
    const shapes = [circle(100, 100, 28), circle(200, 100, 28)]
    const { container, rerender } = mount(<GlassMerge shapes={shapes} spacing={16} />)
    expect(rimPath(container)!.match(/M/g)).toHaveLength(2)
    rerender(
      <LiquefyProvider theme="dark" webgl={false}>
        <GlassMerge shapes={shapes} spacing={80} />
      </LiquefyProvider>,
    )
    expect(rimPath(container)!.match(/M/g)).toHaveLength(1)
    expect(container.querySelectorAll('.lq-glass-merge__surface svg')).toHaveLength(1)
  })

  it('takes the lens, transparency and refraction from the provider', () => {
    mount(<GlassMerge bezel={12} spacing={20} tint="#ff2d55" />, { lens: false, refraction: 0.5, transparency: false })
    expect(attach.calls.at(-1)![1]).toEqual({
      bezel: 12, lens: false, spacing: 20, strength: 0.5, tint: '#ff2d55', transparency: false,
    })
  })
})
