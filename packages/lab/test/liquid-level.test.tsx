// @vitest-environment jsdom
import { LiquefyProvider } from '@liquefy-ui/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiquidLevel } from '../src/liquid-level'

/** A requestAnimationFrame that only runs when told to, on a clock of the test's own. */
const frames = () => {
  let now = 0
  let id = 0
  const queue = new Map<number, FrameRequestCallback>()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    id += 1
    queue.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle))
  return {
    get pending() {
      return queue.size
    },
    play(count: number) {
      act(() => {
        for (let frame = 0; frame < count; frame += 1) {
          now += 1000 / 60
          const callbacks = [...queue.values()]
          queue.clear()
          callbacks.forEach((callback) => callback(now))
        }
      })
    },
  }
}

const mount = (node: ReactNode, motion = false) =>
  render(<LiquefyProvider motion={motion} theme="dark" webgl={false}>{node}</LiquefyProvider>)

/** The surface's height in pixels down from the top at each column, read off the submerged reading's clip. */
const surface = (meter: HTMLElement): number[] => {
  const wet = meter.querySelectorAll<HTMLElement>('.lq-surface__content > span[aria-hidden="true"]')
  const clip = [...wet].at(-1)?.style.clipPath ?? ''
  const points = /^polygon\((.*)\)$/.exec(clip)?.[1]?.split(', ') ?? []
  // The last two points are the bottom corners.
  return points.slice(0, -2).map((point) => Number.parseFloat(point.split(' ')[1] ?? ''))
}

beforeEach(() => {
  // jsdom has no 2D canvas; the component falls back to a flat band.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('LiquidLevel', () => {
  it('renders a meter with a flat level on the server', () => {
    const markup = renderToStaticMarkup(
      <LiquefyProvider theme="dark">
        <LiquidLevel label="Water" value={40} />
      </LiquefyProvider>,
    )
    expect(markup).toContain('role="meter"')
    expect(markup).toContain('aria-label="Water"')
    expect(markup).toContain('aria-valuenow="40"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="100"')
    expect(markup).toContain('aria-valuetext="40%"')
    // The band that stands in for the liquid until the canvas draws, and the
    // reading clipped to it.
    expect(markup).toContain('height:40.00%')
    expect(markup).toContain('clip-path:inset(60.00% 0 0 0)')
    expect(markup.match(/>40<small/g)).toHaveLength(2)
  })

  it('names the meter and reports the clamped reading', () => {
    const { rerender } = mount(<LiquidLevel label="Tank" max={200} value={50} />)
    const meter = screen.getByRole('meter', { name: 'Tank' })
    expect(meter.getAttribute('aria-valuenow')).toBe('50')
    expect(meter.getAttribute('aria-valuemax')).toBe('200')
    expect(meter.getAttribute('aria-valuetext')).toBe('25%')

    rerender(
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <LiquidLevel label="Tank" max={200} value={500} />
      </LiquefyProvider>,
    )
    expect(meter.getAttribute('aria-valuenow')).toBe('200')
    expect(meter.getAttribute('aria-valuetext')).toBe('100%')
  })

  it('hides both copies of the reading from assistive technology', () => {
    mount(<LiquidLevel label="Temperature" value={30}>21°</LiquidLevel>)
    const meter = screen.getByRole('meter', { name: 'Temperature' })
    const copies = [...meter.querySelectorAll('span')].filter((span) => span.textContent === '21°')
    expect(copies).toHaveLength(2)
    for (const copy of copies) expect(copy.getAttribute('aria-hidden')).toBe('true')
    expect(meter.textContent).not.toContain('%')
  })

  it('sizes each vessel shape from its height', () => {
    mount(
      <>
        <LiquidLevel label="Circle" size={120} value={10} />
        <LiquidLevel label="Capsule" shape="capsule" size={120} value={10} />
        <LiquidLevel label="Rounded" shape="rounded" size={120} value={10} />
      </>,
    )
    const box = (name: string) => {
      const { height, width } = screen.getByRole('meter', { name }).style
      return [width, height]
    }
    expect(box('Circle')).toEqual(['120px', '120px'])
    expect(box('Capsule')).toEqual(['60px', '120px'])
    expect(box('Rounded')).toEqual(['94px', '120px'])
  })

  it('moves straight to the new level with a flat surface when motion is off', () => {
    const clock = frames()
    const { rerender } = mount(<LiquidLevel label="Water" size={100} value={20} />)
    const meter = screen.getByRole('meter', { name: 'Water' })
    expect(new Set(surface(meter))).toEqual(new Set([80]))

    rerender(
      <LiquefyProvider motion={false} theme="dark" webgl={false}>
        <LiquidLevel label="Water" size={100} value={70} />
      </LiquefyProvider>,
    )
    expect(new Set(surface(meter))).toEqual(new Set([30]))
    fireEvent.pointerMove(meter, { clientX: 100 })
    expect(new Set(surface(meter))).toEqual(new Set([30]))
    clock.play(5)
    expect(new Set(surface(meter))).toEqual(new Set([30]))
  })

  it('swings past the new level, sloshes, then settles and stops drawing', () => {
    const clock = frames()
    const level = (value: number) => (
      <LiquefyProvider theme="dark" webgl={false}>
        <LiquidLevel label="Water" size={100} value={value} />
      </LiquefyProvider>
    )
    const { rerender } = render(level(20))
    const meter = screen.getByRole('meter', { name: 'Water' })
    clock.play(2)

    rerender(level(80))
    let highest = 100
    let roughest = 0
    for (let frame = 0; frame < 60; frame += 1) {
      clock.play(1)
      const heights = surface(meter)
      const mean = heights.reduce((sum, height) => sum + height, 0) / heights.length
      highest = Math.min(highest, mean)
      roughest = Math.max(roughest, Math.max(...heights) - Math.min(...heights))
    }
    // 80% of a 100px vessel is 20px from the top; it went higher than that.
    expect(highest).toBeLessThan(17)
    expect(roughest).toBeGreaterThan(1)

    clock.play(600)
    expect(new Set(surface(meter))).toEqual(new Set([20]))
    // Nothing left to animate, so the loop has stopped asking for frames.
    const before = clock.pending
    clock.play(1)
    expect(clock.pending).toBeLessThanOrEqual(before)
    expect(new Set(surface(meter))).toEqual(new Set([20]))
  })

  it('leans toward a pointer over the vessel, and not when tilt is off', () => {
    const clock = frames()
    const { rerender } = mount(<LiquidLevel label="Water" size={100} value={50} />, true)
    const meter = screen.getByRole('meter', { name: 'Water' })
    vi.spyOn(meter, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ height: 100, width: 100, x: 0, y: 0 }))

    fireEvent.pointerMove(meter, { clientX: 100 })
    clock.play(600)
    const leaning = surface(meter)
    // Higher on the right, where the pointer is: nearer the top.
    expect((leaning.at(-1) ?? 0) - (leaning[0] ?? 0)).toBeLessThan(-10)

    fireEvent.pointerLeave(meter)
    clock.play(600)
    expect(new Set(surface(meter))).toEqual(new Set([50]))

    rerender(
      <LiquefyProvider theme="dark" webgl={false}>
        <LiquidLevel label="Water" size={100} tilt={false} value={50} />
      </LiquefyProvider>,
    )
    fireEvent.pointerMove(meter, { clientX: 100 })
    clock.play(60)
    expect(new Set(surface(meter))).toEqual(new Set([50]))
  })

  it('passes pointer handlers and the ref through', () => {
    const moved = vi.fn()
    let element: HTMLDivElement | null = null
    mount(<LiquidLevel label="Water" onPointerMove={moved} ref={(node) => { element = node }} value={10} />)
    const meter = screen.getByRole('meter', { name: 'Water' })
    fireEvent.pointerMove(meter, { clientX: 4 })
    expect(moved).toHaveBeenCalledTimes(1)
    expect(element).toBe(meter)
  })
})
