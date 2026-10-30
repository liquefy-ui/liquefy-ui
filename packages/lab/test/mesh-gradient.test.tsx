// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseColor } from '../src/backdrop-color'
import { MeshGradient } from '../src/mesh-gradient'
import { fakeWebGL2 } from './fake-gl'

const mount = (node: ReactNode, motion = true) =>
  render(<LiquefyProvider motion={motion} theme="dark">{node}</LiquefyProvider>)

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

/** A 2D context that keeps what is painted, and resolves colours the way a canvas does. */
const fake2d = () => {
  const painted: ImageData[] = []
  let fill = ''
  const context = {
    clearRect: () => undefined,
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), height, width }),
    fillRect: () => undefined,
    getImageData: () => ({ data: Uint8ClampedArray.from([...(parseColor(fill) ?? [0, 0, 0]).map((channel) => channel * 255), 255]) }),
    putImageData: (image: ImageData) => painted.push({ ...image, data: Uint8ClampedArray.from(image.data) }),
    set fillStyle(value: string) {
      fill = value
    },
  }
  return { context: context as unknown as CanvasRenderingContext2D, painted }
}

beforeEach(() => {
  queue = new Map()
  frameRequests = 0
  now = 0
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameRequests += 1
    queue.set(frameRequests, callback)
    return frameRequests
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('MeshGradient', () => {
  it('renders a pool of each colour where its point sits on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <MeshGradient colors={['#ff0000', '#00ff00', '#0000ff', '#ffffff']} columns={2} rows={2}>
          <span>Over the colour</span>
        </MeshGradient>
      </LiquefyProvider>,
    )
    expect(markup).toContain('data-mesh-mode="fallback"')
    expect(markup).toContain('radial-gradient(farthest-side at 0% 0%, #ff0000, transparent)')
    expect(markup).toContain('radial-gradient(farthest-side at 100% 100%, #ffffff, transparent)')
    expect(markup).toContain('<canvas aria-hidden="true"')
    expect(markup).toContain('<span>Over the colour</span>')
  })

  it('lays a short palette over the grid so neighbours differ', () => {
    const markup = renderToStaticMarkup(<MeshGradient colors={['red', 'blue']} columns={3} rows={2} />)
    expect(markup).toContain('at 0% 0%, red')
    expect(markup).toContain('at 50% 0%, blue')
    expect(markup).toContain('at 0% 100%, blue')
  })

  it('stays the CSS stand-in with neither WebGL nor a 2D canvas, and asks for no frames', () => {
    mount(<MeshGradient colors={['#f4683c', '#4a5fd8']} data-testid="mesh" />)
    expect(screen.getByTestId('mesh').dataset.meshMode).toBe('fallback')
    expect(frameRequests).toBe(0)
  })

  describe('on a 2D canvas', () => {
    const with2d = () => {
      const fake = fake2d()
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(
        ((type: string) => (type === '2d' ? fake.context : null)) as typeof HTMLCanvasElement.prototype.getContext,
      )
      return fake
    }

    it('paints the gradient small, for the browser to scale up, and keeps it moving', () => {
      const { painted } = with2d()
      mount(<MeshGradient colors={['#ff0000', '#0000ff']} data-testid="mesh" />)
      const mesh = screen.getByTestId('mesh')
      expect(mesh.dataset.meshMode).toBe('canvas')
      expect(mesh.querySelector('canvas')?.style.visibility).toBe('visible')
      const first = painted.at(-1)
      expect(first).toBeDefined()
      // Every pixel is covered, in the two colours and blends of them.
      for (let index = 3; index < (first?.data.length ?? 0); index += 4) expect(first?.data[index]).toBe(255)
      const count = painted.length
      play(3)
      expect(painted.length).toBe(count + 3)
    })

    it('holds still with motion off', () => {
      const { painted } = with2d()
      mount(<MeshGradient colors={['#ff0000', '#0000ff']} />, false)
      expect(painted.length).toBeGreaterThan(0)
      expect(frameRequests).toBe(0)
    })

    it('holds still at speed 0', () => {
      with2d()
      mount(<MeshGradient colors={['#ff0000', '#0000ff']} speed={0} />)
      expect(frameRequests).toBe(0)
    })

    it('stops asking for frames while the tab is hidden', () => {
      with2d()
      mount(<MeshGradient colors={['#ff0000', '#0000ff']} />)
      play(1)
      expect(queue.size).toBe(1)
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(queue.size).toBe(0)
    })
  })

  describe('on a GPU', () => {
    const withWebGL = () => {
      const made: ReturnType<typeof fakeWebGL2>[] = []
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function (this: HTMLCanvasElement, type: string) {
        if (type !== 'webgl2') return null
        const fake = fakeWebGL2(this)
        made.push(fake)
        return fake.gl
      } as typeof HTMLCanvasElement.prototype.getContext)
      return made
    }

    /** The vertex positions last handed to the GPU. */
    const uploaded = (fake: ReturnType<typeof fakeWebGL2>) =>
      vi.mocked(fake.gl.bufferSubData).mock.calls.at(-1)?.[2] as unknown as Float32Array

    it('draws the mesh in one call a frame', () => {
      const made = withWebGL()
      mount(<MeshGradient colors={['#ff0000', '#0000ff']} columns={4} data-testid="mesh" rows={3} />)
      expect(screen.getByTestId('mesh').dataset.meshMode).toBe('webgl')
      const fake = made.at(-1)
      fake?.reset()
      play(2)
      expect(fake?.count('drawElements')).toBe(2)
      expect(fake?.count('bufferSubData')).toBe(2)
    })

    it('keeps its context when the grid changes, and lays the new grid over the whole rectangle', () => {
      const made = withWebGL()
      const view = (columns: number) => (
        <LiquefyProvider theme="dark">
          <MeshGradient colors={['#ff0000', '#0000ff']} columns={columns} data-testid="mesh" rows={columns} />
        </LiquefyProvider>
      )
      const { rerender } = render(view(3))
      rerender(view(6))
      play(1)
      expect(made).toHaveLength(1)
      const fake = made[0] as ReturnType<typeof fakeWebGL2>
      expect(fake.count('deleteProgram')).toBe(0)
      const positions = uploaded(fake)
      const xs = positions.filter((_, index) => index % 2 === 0)
      const ys = positions.filter((_, index) => index % 2 === 1)
      expect(Math.min(...xs)).toBeCloseTo(0, 5)
      expect(Math.max(...xs)).toBeCloseTo(1, 5)
      expect(Math.min(...ys)).toBeCloseTo(0, 5)
      expect(Math.max(...ys)).toBeCloseTo(1, 5)
    })
  })
})
