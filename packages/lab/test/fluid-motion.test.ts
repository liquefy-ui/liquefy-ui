import { describe, expect, it } from 'vitest'
import { FrameClock } from '../src/backdrop-loop'
import {
  dyeGrid,
  FLUID_DEFAULTS,
  fluidGrid,
  fluidSplash,
  FluidStirrer,
  MAX_VORTICES,
  paletteAt,
  PointerStroke,
  resolveFluidOptions,
  seededRandom,
  VortexField,
  type FluidSplat,
} from '../src/fluid-motion'

const PALETTE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const

describe('FrameClock', () => {
  it('counts the time between frames, and nothing before the first', () => {
    const clock = new FrameClock()
    expect(clock.tick(1000)).toBe(0)
    expect(clock.tick(1016)).toBeCloseTo(0.016, 6)
    expect(clock.tick(1032)).toBeCloseTo(0.016, 6)
    expect(clock.time).toBeCloseTo(0.032, 6)
  })

  it('counts a long frame as the longest it allows', () => {
    const clock = new FrameClock(1 / 30)
    clock.tick(0)
    expect(clock.tick(5000)).toBeCloseTo(1 / 30, 6)
    expect(clock.time).toBeCloseTo(1 / 30, 6)
  })

  it('does not count the gap across a pause', () => {
    const clock = new FrameClock()
    clock.tick(0)
    clock.tick(16)
    clock.pause()
    expect(clock.tick(60_000)).toBe(0)
    expect(clock.tick(60_016)).toBeCloseTo(0.016, 6)
    expect(clock.time).toBeCloseTo(0.032, 6)
  })

  it('never runs backwards or on a broken timestamp', () => {
    const clock = new FrameClock()
    clock.tick(100)
    expect(clock.tick(50)).toBe(0)
    expect(clock.tick(Number.NaN)).toBe(0)
    expect(clock.time).toBe(0)
  })
})

describe('resolveFluidOptions', () => {
  it('fills in the defaults', () => {
    expect(resolveFluidOptions()).toEqual(FLUID_DEFAULTS)
  })

  it('clamps to the ranges the simulation is stable in, and rounds counts', () => {
    const options = resolveFluidOptions({
      dyeResolution: 10_000,
      fade: -1,
      maxPixelRatio: 9,
      pressureIterations: 12.6,
      resolution: 3,
      speed: 99,
      stir: 2,
      vorticity: -5,
    })
    expect(options).toEqual({
      dyeResolution: 2048,
      fade: 0,
      maxPixelRatio: 3,
      pressureIterations: 13,
      resolution: 16,
      speed: 4,
      stir: 1,
      vorticity: 0,
    })
  })

  it('ignores values that are not numbers', () => {
    const options = resolveFluidOptions({ pressureIterations: Number.NaN, speed: Number.POSITIVE_INFINITY })
    expect(options.pressureIterations).toBe(FLUID_DEFAULTS.pressureIterations)
    expect(options.speed).toBe(FLUID_DEFAULTS.speed)
  })
})

describe('grids', () => {
  it('puts the resolution across the short side and the long side in proportion', () => {
    expect(fluidGrid(1600, 900, 128)).toEqual({ height: 128, width: 228 })
    expect(fluidGrid(900, 1600, 128)).toEqual({ height: 228, width: 128 })
    expect(fluidGrid(500, 500, 64)).toEqual({ height: 64, width: 64 })
  })

  it('holds a strip to four times as long as it is wide', () => {
    expect(fluidGrid(4000, 100, 32)).toEqual({ height: 32, width: 128 })
  })

  it('never makes the colour finer than the canvas', () => {
    expect(dyeGrid(300, 200, 512)).toEqual({ height: 200, width: 300 })
    expect(dyeGrid(1600, 900, 512)).toEqual({ height: 512, width: 910 })
  })
})

describe('seededRandom', () => {
  it('repeats for a seed and stays in [0, 1)', () => {
    const a = seededRandom(3)
    const b = seededRandom(3)
    const values = Array.from({ length: 200 }, () => a())
    expect(values).toEqual(Array.from({ length: 200 }, () => b()))
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
    expect(seededRandom(4)()).not.toBe(values[0])
  })
})

describe('paletteAt', () => {
  it('holds each colour at its turn and blends to the next', () => {
    expect(paletteAt(PALETTE, 0, 2)).toEqual([1, 0, 0])
    expect(paletteAt(PALETTE, 2, 2)).toEqual([0, 1, 0])
    expect(paletteAt(PALETTE, 6, 2)).toEqual([1, 0, 0])
    const middle = paletteAt(PALETTE, 1, 2)
    expect(middle[0]).toBeCloseTo(0.5, 6)
    expect(middle[1]).toBeCloseTo(0.5, 6)
  })

  it('works for negative times and an empty palette', () => {
    expect(paletteAt(PALETTE, -2, 2)).toEqual([0, 0, 1])
    expect(paletteAt([], 3)).toEqual([1, 1, 1])
  })
})

describe('FluidStirrer', () => {
  it('stays inside the backdrop', () => {
    const stirrer = new FluidStirrer(4, 7)
    for (let time = 0; time < 600; time += 0.37) {
      for (let index = 0; index < stirrer.count; index += 1) {
        const { x, y } = stirrer.position(index, time)
        expect(x).toBeGreaterThan(0.02)
        expect(x).toBeLessThan(0.98)
        expect(y).toBeGreaterThan(0.02)
        expect(y).toBeLessThan(0.98)
      }
    }
  })

  it('reports the velocity of its own path', () => {
    const stirrer = new FluidStirrer(3, 2)
    const h = 1e-4
    for (const time of [0, 1.3, 17, 240]) {
      const before = stirrer.position(1, time - h)
      const after = stirrer.position(1, time + h)
      const velocity = stirrer.velocity(1, time)
      expect(velocity.x).toBeCloseTo((after.x - before.x) / (2 * h), 4)
      expect(velocity.y).toBeCloseTo((after.y - before.y) / (2 * h), 4)
    }
  })

  it('moves slowly: a loop takes seconds, not a frame', () => {
    const stirrer = new FluidStirrer(3, 1)
    for (let time = 0; time < 120; time += 0.5) {
      const { x, y } = stirrer.velocity(0, time)
      expect(Math.hypot(x, y)).toBeLessThan(0.3)
    }
  })

  it('makes one splat per stirrer, with colour in proportion to the frame', () => {
    const stirrer = new FluidStirrer(3, 1)
    const short = stirrer.splats(5, 1 / 120, PALETTE, 1)
    const long = stirrer.splats(5, 1 / 60, PALETTE, 1)
    expect(short).toHaveLength(3)
    short.forEach((splat, index) => {
      const sum = (s: FluidSplat) => s.color[0] + s.color[1] + s.color[2]
      expect(sum(long[index] as FluidSplat)).toBeCloseTo(sum(splat) * 2, 6)
      expect(splat.x).toBe(stirrer.position(index, 5).x)
    })
  })

  it('makes nothing on a still frame, at no strength, or with no colours', () => {
    const stirrer = new FluidStirrer()
    expect(stirrer.splats(1, 0, PALETTE, 1)).toEqual([])
    expect(stirrer.splats(1, 1 / 60, PALETTE, 0)).toEqual([])
    expect(stirrer.splats(1, 1 / 60, [], 1)).toEqual([])
  })

  it('walks every stirrer through the whole palette', () => {
    const stirrer = new FluidStirrer(2, 1)
    const seen = new Set<string>()
    for (let time = 0; time < 120; time += 1) {
      for (const splat of stirrer.splats(time, 1, PALETTE, 1)) {
        const [r, g, b] = splat.color
        seen.add([r, g, b].map((channel) => (channel > 0.9 * Math.max(r, g, b) ? 1 : 0)).join(''))
      }
    }
    expect(seen).toContain('100')
    expect(seen).toContain('010')
    expect(seen).toContain('001')
  })
})

describe('PointerStroke', () => {
  it('has nothing to give until the pointer has moved', () => {
    const stroke = new PointerStroke()
    expect(stroke.take([1, 1, 1])).toBeNull()
    stroke.move(0.5, 0.5)
    expect(stroke.take([1, 1, 1])).toBeNull()
  })

  it('gathers a frame of moves into one splat at the last position', () => {
    const stroke = new PointerStroke()
    stroke.move(0.1, 0.5)
    stroke.move(0.12, 0.5)
    stroke.move(0.15, 0.52)
    const splat = stroke.take([1, 0, 0])
    expect(splat?.x).toBe(0.15)
    expect(splat?.y).toBe(0.52)
    expect(splat?.dx).toBeGreaterThan(0)
    expect(splat?.dy).toBeGreaterThan(0)
    // Pushed along the whole movement, 0.05 across and 0.02 down.
    expect((splat?.dx ?? 0) / (splat?.dy ?? 1)).toBeCloseTo(2.5, 6)
    expect(splat?.color[1]).toBe(0)
    expect(stroke.take([1, 0, 0])).toBeNull()
  })

  it('pushes in proportion to how far it went, and caps the colour', () => {
    const near = new PointerStroke()
    near.move(0, 0)
    near.move(0.01, 0)
    const far = new PointerStroke()
    far.move(0, 0)
    far.move(0.5, 0)
    const small = near.take([1, 1, 1])
    const big = far.take([1, 1, 1])
    expect((big?.dx ?? 0) / (small?.dx ?? 1)).toBeCloseTo(50, 6)
    expect(big?.color[0]).toBeLessThanOrEqual(0.3)
  })

  it('starts a new stroke after a lift instead of jumping', () => {
    const stroke = new PointerStroke()
    stroke.move(0.1, 0.1)
    stroke.lift()
    stroke.move(0.9, 0.9)
    expect(stroke.take([1, 1, 1])).toBeNull()
  })
})

describe('fluidSplash', () => {
  it('scatters soft pools of every colour inside the backdrop, the same each time', () => {
    const splash = fluidSplash(PALETTE)
    expect(splash).toEqual(fluidSplash(PALETTE))
    expect(splash.length).toBeGreaterThanOrEqual(PALETTE.length)
    for (const splat of splash) {
      expect(splat.x).toBeGreaterThan(0.1)
      expect(splat.x).toBeLessThan(0.9)
      expect(splat.y).toBeGreaterThan(0.1)
      expect(splat.y).toBeLessThan(0.9)
    }
    expect(fluidSplash([])).toEqual([])
  })
})

describe('VortexField', () => {
  const splat: FluidSplat = { color: [1, 1, 1], dx: 1, dy: 0, radius: 0.05, x: 0.5, y: 0.5 }

  it('drops a pair of opposite vortices either side of a stroke', () => {
    const field = new VortexField()
    field.push(splat)
    const [a, b] = field.vortices(new FluidStirrer(0), 0, 1)
    expect(a?.strength).toBeCloseTo(-(b?.strength ?? 0), 9)
    expect(a?.x).toBeCloseTo(b?.x ?? Number.NaN, 9)
    expect(Math.abs((a?.y ?? 0) - 0.5)).toBeCloseTo(Math.abs((b?.y ?? 0) - 0.5), 9)
  })

  it('ignores a stroke that did not move', () => {
    const field = new VortexField()
    field.push({ ...splat, dx: 0 })
    expect(field.vortices(new FluidStirrer(0), 0, 1)).toEqual([])
  })

  it('spins the pointer’s vortices down by half each half-life and lets them go', () => {
    const field = new VortexField()
    field.push(splat)
    const before = field.vortices(new FluidStirrer(0), 0, 1)[0]?.strength ?? 0
    field.step(0.7)
    const after = field.vortices(new FluidStirrer(0), 0, 1)[0]?.strength ?? 0
    expect(after / before).toBeCloseTo(0.5, 6)
    for (let index = 0; index < 40; index += 1) field.step(0.7)
    expect(field.vortices(new FluidStirrer(0), 0, 1)).toEqual([])
  })

  it('carries the stirrers first and never more than the shader holds', () => {
    const field = new VortexField()
    for (let index = 0; index < 30; index += 1) field.push({ ...splat, x: index / 30 })
    const stirrer = new FluidStirrer(3)
    const vortices = field.vortices(stirrer, 2, 1)
    expect(vortices).toHaveLength(MAX_VORTICES)
    expect(vortices[0]?.x).toBe(stirrer.position(0, 2).x)
    // The newest stroke's pair survives; a stroke along x sets its pair either side in y.
    expect(vortices.at(-1)?.x).toBeCloseTo(29 / 30, 9)
  })
})
