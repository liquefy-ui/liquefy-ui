import { describe, expect, it } from 'vitest'
import {
  blendPath,
  parsePath,
  pathDistance,
  pathLength,
  pathSignature,
  serializePath,
  shapeCommands,
  splitSubpaths,
} from '../src/effects/path'

const d = (source: string) => serializePath(parsePath(source))

describe('reading a path', () => {
  it('resolves relative commands and spells H and V as lines', () => {
    expect(d('m6.5 9.5 5.5 5 5.5-5')).toBe('M6.5 9.5L12 14.5L17.5 9.5')
    expect(d('M12 5.5v13M5.5 12h13')).toBe('M12 5.5L12 18.5M5.5 12L18.5 12')
    expect(d('M9 7v10M15 7v10')).toBe('M9 7L9 17M15 7L15 17')
  })

  it('writes smooth curves out in full, reflecting the last control point', () => {
    expect(d('M0 0C0 10 10 10 10 0S20-10 20 0')).toBe('M0 0C0 10 10 10 10 0C10 -10 20 -10 20 0')
    expect(d('M0 0Q5 10 10 0T20 0')).toBe('M0 0Q5 10 10 0Q15 -10 20 0')
    // With no curve before it, the reflected point is the current point.
    expect(d('M0 0S10 10 20 0')).toBe('M0 0C0 0 10 10 20 0')
  })

  it('reads arc flags packed against the numbers after them', () => {
    expect(d('M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5')).toBe('M8.2 10.5L8.2 8A3.8 3.8 0 0 1 15.8 8L15.8 10.5')
    expect(d('M0 0a5 5 0 017 0')).toBe('M0 0A5 5 0 0 1 7 0')
  })

  it('starts a subpath after Z where the last one started', () => {
    expect(d('M2 2h4v4zl3 0')).toBe('M2 2L6 2L6 6ZM2 2L5 2')
  })

  it('keeps what it read before anything that is not path data', () => {
    expect(d('M0 0L10 0 oops L20 0')).toBe('M0 0L10 0')
  })
})

describe('cutting a path into strokes', () => {
  it('cuts at every moveto and drops a moveto that draws nothing', () => {
    const subpaths = splitSubpaths(parsePath('M5 12h14M13.5 6.5 19 12l-5.5 5.5M1 1'))
    expect(subpaths.map(serializePath)).toEqual(['M5 12L19 12', 'M13.5 6.5L19 12L13.5 17.5'])
  })
})

describe('shapes as paths', () => {
  it('starts a circle at three o’clock and runs clockwise, as a browser dashes it', () => {
    const circle = shapeCommands('circle', { cx: '12', cy: '12', r: '8.5' })
    expect(circle[0]).toEqual({ type: 'M', values: [20.5, 12] })
    expect(circle[1]).toEqual({ type: 'A', values: [8.5, 8.5, 0, 0, 1, 12, 20.5] })
  })

  it('starts a rounded rectangle at the end of its top-left corner', () => {
    const rect = shapeCommands('rect', { height: '9.5', rx: '2.5', width: '14', x: '5', y: '10.5' })
    expect(rect[0]).toEqual({ type: 'M', values: [7.5, 10.5] })
    expect(rect.filter((command) => command.type === 'A')).toHaveLength(4)
  })

  it('reads lines and point lists, and closes a polygon', () => {
    expect(serializePath(shapeCommands('line', { x1: '1', x2: '4', y1: '2', y2: '6' }))).toBe('M1 2L4 6')
    expect(serializePath(shapeCommands('polygon', { points: '0,0 4,0 4,3' }))).toBe('M0 0L4 0L4 3Z')
  })

  it('draws nothing for a shape with no size', () => {
    expect(shapeCommands('circle', { cx: '1', cy: '1', r: '0' })).toEqual([])
    expect(shapeCommands('rect', { height: '0', width: '4' })).toEqual([])
    expect(shapeCommands('g', {})).toEqual([])
  })
})

describe('measuring a stroke', () => {
  it('measures lines and closing segments exactly', () => {
    expect(pathLength(parsePath('M0 0h3v4z'))).toBeCloseTo(12, 6)
  })

  it('measures a circle as its circumference', () => {
    expect(pathLength(shapeCommands('circle', { cx: '12', cy: '12', r: '8.5' }))).toBeCloseTo(2 * Math.PI * 8.5, 6)
  })

  it('measures a rounded rectangle as its sides less what the corners cut off', () => {
    const length = pathLength(shapeCommands('rect', { height: '9.5', rx: '2.5', width: '14', x: '5', y: '10.5' }))
    expect(length).toBeCloseTo(2 * (14 + 9.5) - 8 * 2.5 + 2 * Math.PI * 2.5, 6)
  })

  it('grows an arc too small for its chord until it spans it', () => {
    // A radius of 1 cannot reach 10 units: it is scaled up to a half circle.
    expect(pathLength(parsePath('M0 0A1 1 0 0 1 10 0'))).toBeCloseTo(Math.PI * 5, 6)
  })

  it('measures curves closely', () => {
    // A cubic that is a straight line in disguise.
    expect(pathLength(parsePath('M0 0C3 0 6 0 9 0'))).toBeCloseTo(9, 3)
    // A quarter of an ellipse 10 by 5, about 12.11 by Ramanujan.
    expect(pathLength(parsePath('M10 0A10 5 0 0 1 0 5'))).toBeCloseTo(12.11, 1)
  })
})

describe('blending one stroke into another', () => {
  const down = parsePath('m6.5 9.5 5.5 5 5.5-5')
  const up = parsePath('m6.5 14.5 5.5-5 5.5 5')

  it('matches strokes written with the same commands', () => {
    expect(pathSignature(down)).toBe(pathSignature(up))
    expect(pathSignature(parsePath('M0 0A1 1 0 0 1 2 0'))).not.toBe(pathSignature(parsePath('M0 0A1 1 0 1 1 2 0')))
  })

  it('goes from one to the other, and past it when the spring overshoots', () => {
    expect(serializePath(blendPath(down, up, 0))).toBe(serializePath(down))
    expect(serializePath(blendPath(down, up, 1))).toBe(serializePath(up))
    expect(serializePath(blendPath(down, up, 0.5))).toBe('M6.5 12L12 12L17.5 12')
    expect(serializePath(blendPath(down, up, 1.1))).toBe('M6.5 15L12 9L17.5 15')
  })

  it('keeps arc flags and never blends a radius below zero', () => {
    const from = parsePath('M0 0A1 1 0 0 1 2 0')
    const to = parsePath('M0 0A4 4 0 0 1 2 0')
    expect(blendPath(from, to, -1)[1]).toEqual({ type: 'A', values: [0, 0, 0, 0, 1, 2, 0] })
  })

  it('says how far apart two strokes are', () => {
    expect(pathDistance(down, up)).toBe(15)
    expect(pathDistance(down, down)).toBe(0)
  })
})
