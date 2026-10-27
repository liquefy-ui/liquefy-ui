// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FluidBackdrop } from '../src/fluid-backdrop'
import { fakeWebGL2 } from './fake-gl'

const mount = (node: ReactNode, motion = true) =>
  render(<LiquefyProvider motion={motion} theme="dark">{node}</LiquefyProvider>)

/** A requestAnimationFrame that only runs when told to. */
let queue = new Map<number, FrameRequestCallback>()
let frameRequests = 0
let now = 0

const play = (count: number) => {
  act(() => {
    for (let frame = 0; frame < count; frame += 1) {
      now += 1000 / 60
      const callbacks = [...queue.values()]
      queue.clear()
      callbacks.forEach((callback) => callback(now))
    }
  })
}

/** Hands every canvas that asks for WebGL2 a fake context of its own; the last one made is returned. */
const withWebGL = (extensions?: readonly string[]) => {
  const made: ReturnType<typeof fakeWebGL2>[] = []
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function (this: HTMLCanvasElement, type: string) {
    if (type !== 'webgl2') return null
    const fake = fakeWebGL2(this, extensions)
    made.push(fake)
    return fake.gl
  } as typeof HTMLCanvasElement.prototype.getContext)
  return () => {
    const fake = made.at(-1)
    if (!fake) throw new Error('no context was made')
    return fake
  }
}

let intersection: IntersectionObserverCallback | null = null

beforeEach(() => {
  queue = new Map()
  frameRequests = 0
  now = 0
  intersection = null
  // jsdom has neither WebGL nor a 2D canvas.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameRequests += 1
    queue.set(frameRequests, callback)
    return frameRequests
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle))
  vi.stubGlobal('IntersectionObserver', class {
    public constructor(callback: IntersectionObserverCallback) {
      intersection = callback
    }

    public disconnect() {}
    public observe() {}
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('FluidBackdrop', () => {
  it('renders still pools of its colours on the server, with the content over them', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <FluidBackdrop colors={['#ff5a36', '#1f6fe0']} style={{ height: 300 }}>
          <button type="button">Play</button>
        </FluidBackdrop>
      </LiquefyProvider>,
    )
    expect(markup).toContain('data-fluid-tier="fallback"')
    expect(markup).toContain('radial-gradient(farthest-side at 18% 26%, color-mix(in srgb, #ff5a36 72%, transparent), transparent)')
    expect(markup).toContain('#1f6fe0')
    expect(markup).toContain('<canvas aria-hidden="true"')
    expect(markup).toContain('visibility:hidden')
    expect(markup).toContain('<button type="button">Play</button>')
    expect(markup).toContain('height:300px')
    expect(markup).toContain('isolation:isolate')
  })

  it('spreads the provider’s tint when it is given no colours', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark" tint="#0a84ff">
        <FluidBackdrop />
      </LiquefyProvider>,
    )
    const pools = markup.match(/radial-gradient\(/g) ?? []
    expect(pools).toHaveLength(4)
    expect(markup).toMatch(/rgb\(\d+, \d+, \d+\) 72%/)
  })

  it('takes a background for what the colour floats on', () => {
    const markup = renderToStaticMarkup(<FluidBackdrop background="#fafafa" colors={['red']} />)
    expect(markup).toContain('background-color:#fafafa')
  })

  it('stays the still stand-in without WebGL, and asks for no frames', () => {
    mount(
      <FluidBackdrop colors={['#0fb5ae']} data-testid="water">
        <p>Over the water</p>
      </FluidBackdrop>,
    )
    const backdrop = screen.getByTestId('water')
    expect(backdrop.dataset.fluidTier).toBe('fallback')
    expect(backdrop.style.backgroundImage).toContain('radial-gradient')
    expect(screen.getByText('Over the water').parentElement).toBe(backdrop)
    expect(frameRequests).toBe(0)
  })

  it('keeps the canvas out of the accessibility tree and out of the way of the pointer', () => {
    mount(<FluidBackdrop data-testid="water" />)
    const canvas = screen.getByTestId('water').querySelector('canvas')
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(canvas?.style.pointerEvents).toBe('none')
    expect(canvas?.style.zIndex).toBe('-1')
  })

  it('does not ask for a context when the provider turns WebGL off', () => {
    const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext)
    getContext.mockClear()
    render(
      <LiquefyProvider webgl={false}>
        <FluidBackdrop colors={['#0fb5ae']} />
      </LiquefyProvider>,
    )
    expect(getContext.mock.calls.some(([type]) => type === 'webgl2')).toBe(false)
  })

  it('forwards its ref and passes other props through', () => {
    let element: HTMLDivElement | null = null
    mount(<FluidBackdrop aria-label="Backdrop" className="hero" ref={(node) => { element = node }} role="img" />)
    const backdrop = screen.getByRole('img', { name: 'Backdrop' })
    expect(element).toBe(backdrop)
    expect(backdrop.className).toContain('lq-fluid-backdrop')
    expect(backdrop.className).toContain('hero')
  })

  describe('on a GPU', () => {
    it('runs the full solver where it can render to half floats: ten passes a frame and the pressure solve', () => {
      const context = withWebGL()
      mount(<FluidBackdrop colors={['#0fb5ae', '#1f6fe0']} data-testid="water" pressureIterations={7} />)
      expect(screen.getByTestId('water').dataset.fluidTier).toBe('solver')
      expect(screen.getByTestId('water').querySelector('canvas')?.style.visibility).toBe('visible')
      const fake = context()
      play(1)
      fake.reset()
      play(1)
      // Splat velocity and colour, curl, vorticity, divergence, pressure carry,
      // seven Jacobi iterations, gradient, two advections and the picture.
      expect(fake.count('drawArrays')).toBe(17)
    })

    it('carries the colour on vortices where it cannot render to floats', () => {
      const context = withWebGL([])
      mount(<FluidBackdrop colors={['#0fb5ae']} data-testid="water" />)
      expect(screen.getByTestId('water').dataset.fluidTier).toBe('vortices')
      const fake = context()
      play(1)
      fake.reset()
      play(1)
      // Splat the colour, carry it, draw it.
      expect(fake.count('drawArrays')).toBe(3)
    })

    it('draws one still picture with motion off and asks for no frames', () => {
      const context = withWebGL()
      mount(<FluidBackdrop colors={['#0fb5ae']} data-testid="water" />, false)
      expect(screen.getByTestId('water').dataset.fluidTier).toBe('solver')
      expect(context().count('drawArrays')).toBeGreaterThan(90)
      expect(frameRequests).toBe(0)
    })

    it('stops asking for frames while the tab is hidden or the backdrop is off screen', () => {
      withWebGL()
      mount(<FluidBackdrop colors={['#0fb5ae']} />)
      play(2)
      expect(queue.size).toBe(1)

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(queue.size).toBe(0)
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(queue.size).toBe(1)

      act(() => {
        intersection?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver)
      })
      expect(queue.size).toBe(0)
      act(() => {
        intersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
      })
      expect(queue.size).toBe(1)
    })

    /** The splat positions handed to the GPU on the last frame, as [x, y] per splat. */
    const lastSplats = (fake: ReturnType<typeof fakeWebGL2>, gl = fake.gl) => {
      const calls = vi.mocked(gl.uniform4fv).mock.calls
      const points = calls.at(-1)?.[1] as Float32Array
      return Array.from({ length: points.length / 4 }, (_, index) => [points[index * 4], points[index * 4 + 1]])
        .filter(([x, y]) => x !== 0 || y !== 0)
    }

    const moveOver = (canvas: HTMLCanvasElement, points: readonly (readonly [number, number])[]) => {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(
        { bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200, x: 0, y: 0 } as DOMRect,
      )
      for (const [clientX, clientY] of points) {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY, pointerId: 1, pointerType: 'mouse' }))
      }
    }

    it('stirs where a pointer moves over it, read from the window', () => {
      const context = withWebGL()
      mount(<FluidBackdrop colors={['#0fb5ae']} data-testid="water" />)
      play(1)
      const fake = context()
      expect(lastSplats(fake)).toHaveLength(3)
      moveOver(screen.getByTestId('water').querySelector('canvas') as HTMLCanvasElement, [[40, 20], [60, 30]])
      play(1)
      const splats = lastSplats(fake)
      expect(splats).toHaveLength(4)
      // At the pointer, with the texture's y turned up.
      expect(splats.at(-1)?.[0]).toBeCloseTo(0.3, 5)
      expect(splats.at(-1)?.[1]).toBeCloseTo(0.7, 5)
    })

    it('ignores a pointer outside it, and every pointer when not interactive', () => {
      const context = withWebGL()
      const { rerender } = mount(<FluidBackdrop colors={['#0fb5ae']} data-testid="water" />)
      play(1)
      const canvas = screen.getByTestId('water').querySelector('canvas') as HTMLCanvasElement
      moveOver(canvas, [[300, 20], [320, 40]])
      play(1)
      expect(lastSplats(context())).toHaveLength(3)

      rerender(
        <LiquefyProvider theme="dark">
          <FluidBackdrop colors={['#0fb5ae']} data-testid="water" interactive={false} />
        </LiquefyProvider>,
      )
      moveOver(canvas, [[40, 20], [60, 30]])
      play(1)
      expect(lastSplats(context())).toHaveLength(3)
    })

    it('shows the stand-in while the context is lost and pours again once it is back', () => {
      const context = withWebGL()
      mount(<FluidBackdrop colors={['#0fb5ae']} data-testid="water" />)
      const backdrop = screen.getByTestId('water')
      const canvas = backdrop.querySelector('canvas') as HTMLCanvasElement
      const lost = new Event('webglcontextlost', { cancelable: true })
      context().lose()
      act(() => {
        canvas.dispatchEvent(lost)
      })
      expect(lost.defaultPrevented).toBe(true)
      expect(backdrop.dataset.fluidTier).toBe('fallback')
      expect(canvas.style.visibility).toBe('hidden')
      expect(queue.size).toBe(0)

      const fake = context()
      fake.restore()
      fake.reset()
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextrestored'))
      })
      expect(backdrop.dataset.fluidTier).toBe('solver')
      expect(canvas.style.visibility).toBe('visible')
      expect(fake.count('linkProgram')).toBeGreaterThan(0)
      expect(queue.size).toBe(1)
    })

    it('lets the GPU go when it unmounts', () => {
      const context = withWebGL()
      const { unmount } = mount(<FluidBackdrop colors={['#0fb5ae']} />)
      const fake = context()
      unmount()
      expect(fake.count('deleteTexture')).toBeGreaterThan(0)
      expect(fake.count('deleteProgram')).toBeGreaterThan(0)
      expect(queue.size).toBe(0)
    })
  })
})
