// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createRef, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticleField, type ParticleFieldHandle } from '../src/particle-field'
import { fakeCanvas, frames } from './canvas-fakes'

const inProvider = (node: ReactNode, motion = true) => (
  <LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>
)

const mount = (node: ReactNode, motion = true) => render(inProvider(node, motion))

/** The callbacks of every IntersectionObserver made, to say whether the field is on screen. */
const observers: IntersectionObserverCallback[] = []
const setOnScreen = (isIntersecting: boolean) => act(() => {
  for (const callback of observers) callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
})

const setTabHidden = (hidden: boolean) => act(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' })
  document.dispatchEvent(new Event('visibilitychange'))
})

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal('IntersectionObserver', class {
    public constructor(callback: IntersectionObserverCallback) {
      observers.push(callback)
    }

    public disconnect() {}
    public observe() {}
  })
  // jsdom lays nothing out; the field measures its host to know its size.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})

describe('ParticleField', () => {
  it('fills its positioned parent with a canvas that is hidden from assistive technology and the pointer', () => {
    fakeCanvas()
    const { container } = mount(<ParticleField preset="snow" />)
    const host = container.querySelector<HTMLElement>('[data-particle-field="snow"]')!
    expect(host.getAttribute('aria-hidden')).toBe('true')
    expect(host.style.position).toBe('absolute')
    expect(host.style.pointerEvents).toBe('none')
    expect(host.querySelector('canvas')).not.toBeNull()
  })

  it('wraps children and draws over them, or behind them', () => {
    fakeCanvas()
    const over = mount(<ParticleField bleed={20} preset="magic"><button type="button">Upgrade</button></ParticleField>)
    const host = over.container.querySelector<HTMLElement>('[data-particle-field]')!
    expect(host.previousElementSibling?.textContent).toBe('Upgrade')
    expect(host.style.zIndex).toBe('1')
    expect(host.style.inset).toBe('-20px')
    cleanup()

    const behind = mount(<ParticleField layer="behind" preset="bubbles"><button type="button">Dive</button></ParticleField>)
    const under = behind.container.querySelector<HTMLElement>('[data-particle-field]')!
    expect(under.nextElementSibling?.textContent).toBe('Dive')
    expect(under.style.zIndex).toBe('-1')
    expect(screen.getByRole('button', { name: 'Dive' })).not.toBeNull()
  })

  it('draws nothing at all under a provider with motion off', () => {
    const clock = frames()
    fakeCanvas()
    const bare = mount(<ParticleField preset="rain" />, false)
    expect(bare.container.querySelector('canvas')).toBeNull()
    cleanup()
    const wrapped = mount(<ParticleField preset="rain"><button type="button">Umbrella</button></ParticleField>, false)
    expect(wrapped.container.querySelector('canvas')).toBeNull()
    expect(screen.getByRole('button', { name: 'Umbrella' })).not.toBeNull()
    expect(clock.pending).toBe(0)
  })

  it('opens full and keeps drawing, frame after frame', () => {
    const clock = frames()
    const drawn = fakeCanvas()
    mount(<ParticleField preset="snow" seed={3} />)
    // Warmed before the first frame: the snow is already falling everywhere.
    expect(drawn.drawImage).toBeGreaterThan(100)
    const before = drawn.drawImage
    clock.play(5)
    expect(drawn.drawImage).toBeGreaterThan(before + 500)
    expect(clock.pending).toBe(1)
  })

  it('stops drawing off screen and comes back on it', () => {
    const clock = frames()
    const drawn = fakeCanvas()
    mount(<ParticleField preset="snow" />)
    clock.play(1)
    setOnScreen(false)
    expect(clock.pending).toBe(0)
    const stopped = drawn.drawImage
    clock.play(5)
    expect(drawn.drawImage).toBe(stopped)
    setOnScreen(true)
    expect(clock.pending).toBe(1)
    clock.play(1)
    expect(drawn.drawImage).toBeGreaterThan(stopped)
  })

  it('stops drawing while its tab is in the background', () => {
    const clock = frames()
    fakeCanvas()
    mount(<ParticleField preset="rain" />)
    clock.play(1)
    setTabHidden(true)
    expect(clock.pending).toBe(0)
    setTabHidden(false)
    expect(clock.pending).toBe(1)
  })

  it('lets what is in the air land when paused, and then stops', () => {
    const clock = frames()
    fakeCanvas()
    const element = (paused: boolean) => (
      <ParticleField config={{ emitter: 'area', lifetime: 0.3, prewarm: 0, rate: 40 }} paused={paused} preset="magic" />
    )
    const { rerender } = mount(element(false))
    clock.play(10)
    rerender(inProvider(element(true)))
    clock.play(30)
    expect(clock.pending).toBe(0)
    rerender(inProvider(element(false)))
    expect(clock.pending).toBe(1)
  })

  it('bursts through its handle, with nothing born in between', () => {
    const clock = frames()
    const drawn = fakeCanvas()
    const handle = createRef<ParticleFieldHandle>()
    mount(<ParticleField config={{ emitter: 'center', prewarm: 0, rate: 0 }} preset="bubbles" ref={handle} />)
    clock.play(3)
    expect(drawn.drawImage).toBe(0)
    expect(clock.pending).toBe(0)
    act(() => handle.current!.burst(12))
    clock.play(1)
    expect(drawn.drawImage).toBe(12)
  })

  it('does nothing without a 2D canvas', () => {
    const clock = frames()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const handle = createRef<ParticleFieldHandle>()
    mount(<ParticleField preset="confetti" ref={handle} />)
    handle.current!.burst()
    expect(clock.pending).toBe(0)
  })

  it('renders on the server as an empty canvas, and children as they are', () => {
    expect(renderToStaticMarkup(inProvider(<ParticleField preset="snow" />))).toMatch(/aria-hidden="true"[^>]*><canvas/)
    const wrapped = renderToStaticMarkup(inProvider(<ParticleField preset="magic"><button type="button">Upgrade</button></ParticleField>))
    expect(wrapped).toContain('<button type="button">Upgrade</button>')
  })
})
