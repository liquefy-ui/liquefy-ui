// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { elasticPull, observeElasticPointer } from '../src/elastic'

/**
 * The lean toward an approaching pointer. What matters here is not the exact
 * numbers — those are a look, and looks get retuned — but the properties the
 * look is built on: it reaches past the element's own edge, it dies off before
 * the boundary rather than at it, and it conserves roughly as much as it adds.
 */

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  toJSON: () => ({}),
  top,
  width,
  x: left,
  y: top,
})

const box = rect(100, 100, 200, 60)
const release: Array<() => void> = []

afterEach(() => {
  for (const stop of release.splice(0)) stop()
})

describe('elasticPull', () => {
  it('rests when the pointer is beyond the reach', () => {
    const pull = elasticPull(box, 900, 130, { elasticity: 1, reach: 180 })
    expect(pull).toEqual({ offsetX: 0, offsetY: 0, stretchX: 0, stretchY: 0 })
  })

  it('rests when elasticity is zero, however close the pointer is', () => {
    const pull = elasticPull(box, 205, 130, { elasticity: 0 })
    expect(pull).toEqual({ offsetX: 0, offsetY: 0, stretchX: 0, stretchY: 0 })
  })

  it('leans toward the pointer', () => {
    const right = elasticPull(box, 380, 130, { elasticity: 0.5, reach: 200 })
    const left = elasticPull(box, 20, 130, { elasticity: 0.5, reach: 200 })
    expect(right.offsetX).toBeGreaterThan(0)
    expect(left.offsetX).toBeLessThan(0)
    expect(right.offsetX).toBeCloseTo(-left.offsetX, 5)
  })

  // Measured from the edge, not the centre: a pointer 40px past the short side
  // has to register more strongly than one 40px past the long side, or wide
  // elements would feel dead along their length.
  it('measures its reach from the element edge', () => {
    const pastShortSide = elasticPull(box, 340, 130, { elasticity: 0.5, reach: 200 })
    const pastLongSide = elasticPull(box, 200, 170, { elasticity: 0.5, reach: 200 })
    expect(Math.hypot(pastShortSide.offsetX, pastShortSide.offsetY))
      .toBeGreaterThan(Math.hypot(pastLongSide.offsetX, pastLongSide.offsetY))
  })

  it('fades in rather than switching on at the boundary', () => {
    const atBoundary = elasticPull(box, 300 + 199, 130, { elasticity: 1, reach: 200 })
    expect(Math.abs(atBoundary.offsetX)).toBeLessThan(0.5)
  })

  it('stretches along the pull and takes some back across it', () => {
    const sideways = elasticPull(box, 380, 130, { elasticity: 0.8, reach: 200 })
    expect(sideways.stretchX).toBeGreaterThan(0)
    expect(sideways.stretchY).toBeLessThan(0)

    const downward = elasticPull(rect(100, 100, 60, 60), 130, 220, { elasticity: 0.8, reach: 200 })
    expect(downward.stretchY).toBeGreaterThan(0)
    expect(downward.stretchX).toBeLessThan(0)
  })
})

describe('observeElasticPointer', () => {
  const mount = (): HTMLElement => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => box
    document.body.append(element)
    return element
  }

  const movePointer = (clientX: number, clientY: number): void => {
    window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }))
  }

  const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

  it('reports the page pointer to every subscriber', async () => {
    const seen: Array<[number, number]> = []
    release.push(observeElasticPointer(mount(), (_bounds, x, y) => seen.push([x, y])))
    release.push(observeElasticPointer(mount(), (_bounds, x, y) => seen.push([x, y])))

    movePointer(410, 220)
    await frame()

    expect(seen).toEqual([[410, 220], [410, 220]])
  })

  it('coalesces a burst of movement into one pass', async () => {
    let calls = 0
    release.push(observeElasticPointer(mount(), () => { calls += 1 }))

    for (let step = 0; step < 12; step += 1) movePointer(200 + step, 140)
    await frame()

    expect(calls).toBe(1)
  })

  it('stops reporting once released', async () => {
    let calls = 0
    const stop = observeElasticPointer(mount(), () => { calls += 1 })
    movePointer(300, 150)
    await frame()
    const before = calls

    stop()
    movePointer(320, 150)
    await frame()

    expect(calls).toBe(before)
  })
})
