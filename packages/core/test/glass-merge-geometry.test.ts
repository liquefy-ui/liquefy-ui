import { describe, expect, it } from 'vitest'
import {
  blurredDiscAt,
  contourPath,
  gooInflation,
  mergedField,
  prepareShape,
  quantiseStretch,
  roundRectDistance,
  shapeBounds,
  smoothMin,
  spriteFor,
  spriteKey,
  traceContours,
  type ContourBox,
} from '../src/glass-merge-geometry'
import type { GlassMergeShape } from '../src/types'

/**
 * The outline fallback is only as good as its contour, and the lens only keeps
 * a lone shape its true size if the sprite growth is right. Both are plain
 * arithmetic, so they are held here rather than in a browser.
 */

const circle = (x: number, y: number, radius: number, extra: Partial<GlassMergeShape> = {}): GlassMergeShape => ({
  height: radius * 2, radius, width: radius * 2, x, y, ...extra,
})

/** Even-odd point-in-polygon over every loop at once, the way `clip-path: path(evenodd, …)` fills. */
const insideEvenOdd = (loops: number[][], px: number, py: number): boolean => {
  let inside = false
  for (const loop of loops) {
    for (let i = 0, j = loop.length - 2; i < loop.length; j = i, i += 2) {
      const xi = loop[i]!
      const yi = loop[i + 1]!
      const xj = loop[j]!
      const yj = loop[j + 1]!
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

/** Every step of a traced loop, the closing one included, is at most one grid cell's diagonal. */
const expectClosed = (loop: number[], step: number) => {
  expect(loop.length).toBeGreaterThanOrEqual(6)
  for (let i = 0; i < loop.length; i += 2) {
    const next = (i + 2) % loop.length
    expect(Math.hypot(loop[next]! - loop[i]!, loop[next + 1]! - loop[i + 1]!)).toBeLessThanOrEqual(step * Math.SQRT2 + 1e-9)
  }
}

describe('smoothMin', () => {
  it('is the plain minimum once the two are k apart', () => {
    expect(smoothMin(3, 50, 24)).toBe(3)
    expect(smoothMin(50, -2, 24)).toBe(-2)
  })

  it('digs a quarter of k where the two are equal, and never rises above the minimum', () => {
    expect(smoothMin(10, 10, 24)).toBeCloseTo(4)
    for (let a = -30; a <= 30; a += 3) {
      for (let b = -30; b <= 30; b += 3.5) {
        expect(smoothMin(a, b, 24)).toBeLessThanOrEqual(Math.min(a, b))
        expect(smoothMin(a, b, 24)).toBeCloseTo(smoothMin(b, a, 24))
      }
    }
  })

  it('falls back to the minimum with no spacing', () => {
    expect(smoothMin(4, 4, 0)).toBe(4)
  })
})

describe('the merged field', () => {
  const pair = (gap: number) => [circle(100 - 32 - gap / 2, 100, 32), circle(100 + 32 + gap / 2, 100, 32)].map(prepareShape)

  it('bridges two shapes closer than spacing, and only those', () => {
    expect(mergedField(pair(20), 24)(100, 100)).toBeLessThan(0)
    expect(mergedField(pair(30), 24)(100, 100)).toBeGreaterThan(0)
  })

  it('is outside everywhere with no shapes', () => {
    expect(mergedField([], 24)(0, 0)).toBeGreaterThan(0)
  })

  it('measures a stretched circle as the ellipse it becomes', () => {
    const wide = prepareShape(circle(0, 0, 20, { stretch: 1.25 }))
    expect(roundRectDistance(25, 0, wide)).toBeCloseTo(0, 5)
    expect(roundRectDistance(0, 16, wide)).toBeCloseTo(0, 5)
    const turned = prepareShape(circle(0, 0, 20, { angle: 90, stretch: 1.25 }))
    expect(roundRectDistance(0, 25, turned)).toBeCloseTo(0, 5)
    expect(roundRectDistance(16, 0, turned)).toBeCloseTo(0, 5)
    expect(turned.extentY).toBeCloseTo(25)
  })

  it('clamps a radius larger than the shape allows', () => {
    expect(prepareShape({ height: 20, radius: 80, width: 60, x: 0, y: 0 }).radius).toBe(10)
  })

  it('bounds the shapes, padded', () => {
    expect(shapeBounds([prepareShape(circle(50, 40, 10))], 5)).toEqual({ height: 30, width: 30, x: 35, y: 25 })
    expect(shapeBounds([], 5)).toBeNull()
  })
})

describe('traceContours', () => {
  const box: ContourBox = { height: 200, width: 200, x: 0, y: 0 }

  it('closes a lone circle into one loop lying on its edge', () => {
    const shape = prepareShape(circle(100, 100, 40))
    const loops = traceContours(box, 4, (x, y) => roundRectDistance(x, y, shape))
    expect(loops).toHaveLength(1)
    expectClosed(loops[0]!, 4)
    for (let i = 0; i < loops[0]!.length; i += 2) {
      expect(Math.abs(Math.hypot(loops[0]![i]! - 100, loops[0]![i + 1]! - 100) - 40)).toBeLessThan(0.5)
    }
  })

  it('gives two loops for two shapes apart and one once they bridge', () => {
    const apart = [circle(60, 100, 30), circle(140, 100, 30)].map(prepareShape)
    expect(traceContours(box, 4, mergedField(apart, 8))).toHaveLength(2)
    expect(traceContours(box, 4, mergedField(apart, 24))).toHaveLength(1)
  })

  it('traces a hole as a loop of its own that evenodd leaves empty', () => {
    // A ring: within 10px of a circle of radius 50.
    const ring = (x: number, y: number) => Math.abs(Math.hypot(x - 100, y - 100) - 50) - 10
    const loops = traceContours(box, 4, ring)
    expect(loops).toHaveLength(2)
    loops.forEach((loop) => expectClosed(loop, 4))
    expect(insideEvenOdd(loops, 100, 100)).toBe(false)
    expect(insideEvenOdd(loops, 150, 100)).toBe(true)
    expect(insideEvenOdd(loops, 100, 45)).toBe(true)
    expect(insideEvenOdd(loops, 100, 5)).toBe(false)
  })

  it('closes a shape cut off by the edge of the box', () => {
    const shape = prepareShape(circle(0, 100, 40))
    const loops = traceContours(box, 4, (x, y) => roundRectDistance(x, y, shape))
    expect(loops).toHaveLength(1)
    expectClosed(loops[0]!, 4)
  })

  it('handles saddles without crossing loops', () => {
    // A checkerboard of cells alternates inside and outside at every vertex.
    const checker = (x: number, y: number) => ((Math.round(x / 4) + Math.round(y / 4)) % 2 === 0 ? -1 : 1)
    const loops = traceContours({ height: 16, width: 16, x: 0, y: 0 }, 4, checker)
    loops.forEach((loop) => expectClosed(loop, 4))
  })

  it('serialises loops as one subpath each', () => {
    const path = contourPath([[0, 0, 10, 0, 10, 10], [20, 20, 30, 20, 30, 30.25]])
    expect(path).toBe('M0.0 0.0L10.0 0.0L10.0 10.0ZM20.0 20.0L30.0 20.0L30.0 30.3Z')
  })
})

describe('gooInflation', () => {
  /** The same quantity the slow way: a grid sum of the blurred disc, as the spike first did it. */
  const bruteForce = (discRadius: number, distance: number, sigma: number) => {
    let sum = 0
    let total = 0
    const reach = discRadius + sigma * 4
    for (let y = -reach; y <= reach; y += 0.5) {
      for (let x = -reach; x <= reach; x += 0.5) {
        const g = Math.exp(-((x - distance) ** 2 + y ** 2) / (2 * sigma * sigma))
        total += g
        if (x * x + y * y <= discRadius * discRadius) sum += g
      }
    }
    return sum / total
  }

  it('integrates the blurred disc the same as a grid sum', () => {
    for (const [radius, distance, sigma] of [[23, 23, 12], [10, 0, 8], [40, 30, 18]] as const) {
      expect(blurredDiscAt(radius, distance, sigma)).toBeCloseTo(bruteForce(radius, distance, sigma), 2)
    }
  })

  it('grows a sprite just enough that a lone shape keeps its size after blur and threshold', () => {
    for (const [radius, sigma] of [[23, 11.85], [28, 17.8], [60, 12]] as const) {
      const growth = gooInflation(radius, sigma)
      expect(growth).toBeGreaterThan(0)
      expect(bruteForce(radius + growth, radius, sigma)).toBeCloseTo(0.5, 2)
    }
  })

  it('grows more for a wider blur and less for a larger radius', () => {
    expect(gooInflation(23, 18)).toBeGreaterThan(gooInflation(23, 12))
    expect(gooInflation(60, 12)).toBeLessThan(gooInflation(23, 12))
  })

  it('does not grow at all without a blur', () => {
    expect(gooInflation(23, 0)).toBe(0)
  })
})

describe('sprites', () => {
  const growth = 4

  it('keys a sprite by shape, not by where it is', () => {
    const a = prepareShape({ height: 48, radius: 24, width: 120, x: 10, y: 10 })
    const b = prepareShape({ height: 48, radius: 24, width: 120, x: 300, y: 90 })
    expect(spriteKey(a, growth)).toBe(spriteKey(b, growth))
  })

  it('shares one sprite between circles of every size', () => {
    expect(spriteKey(prepareShape(circle(0, 0, 23)), growth)).toBe(spriteKey(prepareShape(circle(0, 0, 3.7)), 9))
    const small = spriteFor(prepareShape(circle(0, 0, 10)), 2)
    const large = spriteFor(prepareShape(circle(0, 0, 40)), 5)
    expect(small.href).toBe(large.href)
    expect(large.scale / small.scale).toBeCloseTo(45 / 12)
  })

  it('keys other shapes by their grown size to the pixel', () => {
    const pill = (width: number) => prepareShape({ height: 48, radius: 24, width, x: 0, y: 0 })
    expect(spriteKey(pill(120), growth)).toBe(spriteKey(pill(120.3), growth))
    expect(spriteKey(pill(120), growth)).not.toBe(spriteKey(pill(122), growth))
  })

  it('quantises stretch and angle, and drops the angle when there is no stretch', () => {
    expect(quantiseStretch(1.004, 37)).toEqual([1, 0])
    expect(quantiseStretch(1.209, 31)).toEqual([1.2, 30])
    expect(quantiseStretch(1.2, 179.4)).toEqual([1.2, 0])
    const turned = (stretch: number, angle: number) => spriteKey(prepareShape(circle(0, 0, 20, { angle, stretch })), growth)
    expect(turned(1.2, 30)).toBe(turned(1.205, 31))
    expect(turned(1.2, 30)).toBe(turned(1.2, 210))
    expect(turned(1.2, 30)).not.toBe(turned(1.2, 60))
    expect(turned(1.2, 30)).not.toBe(turned(1, 30))
  })

  it('caches each sprite, and draws a stretched one big enough to hold it', () => {
    const shape = prepareShape(circle(0, 0, 20, { angle: 0, stretch: 1.3 }))
    const first = spriteFor(shape, growth)
    expect(spriteFor(shape, growth)).toEqual(first)
    const markup = decodeURIComponent(first.href.slice('data:image/svg+xml,'.length))
    expect(markup).toContain('transform="matrix(1.3 0 0 0.77 0 0)"')
    // Along the stretch the ellipse reaches 1.3 × the sprite's circle radius.
    expect(first.halfWidth).toBeGreaterThanOrEqual(32 * 1.3)
    expect(first.halfHeight).toBeLessThan(first.halfWidth)
  })
})
