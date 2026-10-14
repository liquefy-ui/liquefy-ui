import { describe, expect, it } from 'vitest'
import { LiquidLevelSimulation } from '../src/liquid-level-motion'

/** Steps the simulation at 60 fps for `ms` milliseconds and calls `each` after every frame. */
const play = (simulation: LiquidLevelSimulation, ms: number, each?: () => void): boolean => {
  let busy = true
  for (let frame = 0; frame < Math.round((ms * 60) / 1000); frame += 1) {
    busy = simulation.step(1 / 60)
    each?.()
  }
  return busy
}

/** The surface across every column. */
const surface = (simulation: LiquidLevelSimulation): number[] =>
  Array.from({ length: simulation.columns }, (_, index) => simulation.front(index))

describe('liquid level simulation', () => {
  it('starts on its level with a flat, still surface', () => {
    const simulation = new LiquidLevelSimulation(0.4)
    expect(simulation.current).toBe(0.4)
    expect(surface(simulation).every((height) => height === 0.4)).toBe(true)
    expect(simulation.step(1 / 60)).toBe(false)
  })

  it('swings past a new level before it settles on it', () => {
    const simulation = new LiquidLevelSimulation(0.2)
    simulation.setLevel(0.8)
    let highest = 0
    play(simulation, 2000, () => {
      highest = Math.max(highest, simulation.current)
    })
    // About an eighth of the jump past the mark, not a token wobble.
    expect(highest).toBeGreaterThan(0.85)
    expect(highest).toBeLessThan(0.95)
    expect(simulation.current).toBeCloseTo(0.8, 3)
  })

  it('swings past on the way down as well', () => {
    const simulation = new LiquidLevelSimulation(0.9)
    simulation.setLevel(0.3)
    let lowest = 1
    play(simulation, 2000, () => {
      lowest = Math.min(lowest, simulation.current)
    })
    expect(lowest).toBeLessThan(0.25)
  })

  it('sloshes when the level jumps, and the slosh dies away', () => {
    const simulation = new LiquidLevelSimulation(0.2)
    simulation.setLevel(0.8)
    let early = 0
    play(simulation, 500, () => {
      early = Math.max(early, simulation.slosh)
    })
    // A wave a few percent of the vessel tall: visible, and nowhere near the brim.
    expect(early).toBeGreaterThan(0.02)
    expect(early).toBeLessThan(0.1)
    // Lopsided, so the surface rocks rather than only bowing.
    const shape = surface(simulation)
    expect(Math.abs((shape[0] ?? 0) - (shape.at(-1) ?? 0))).toBeGreaterThan(0.001)

    let later = 0
    play(simulation, 2500)
    play(simulation, 500, () => {
      later = Math.max(later, simulation.slosh)
    })
    expect(later).toBeLessThan(early / 4)
  })

  it('comes to rest exactly on its level and reports it', () => {
    const simulation = new LiquidLevelSimulation(0.2)
    simulation.setLevel(0.8)
    expect(play(simulation, 100)).toBe(true)
    expect(play(simulation, 10_000)).toBe(false)
    expect(simulation.settled).toBe(true)
    expect(simulation.current).toBe(0.8)
    expect(simulation.slosh).toBe(0)
    expect(surface(simulation).every((height) => height === 0.8)).toBe(true)
  })

  it('ripples on a small change too', () => {
    const simulation = new LiquidLevelSimulation(0.5)
    simulation.setLevel(0.53)
    let tallest = 0
    play(simulation, 500, () => {
      tallest = Math.max(tallest, simulation.slosh)
    })
    expect(tallest).toBeGreaterThan(0.005)
  })

  it('does not move liquid in or out while it sloshes', () => {
    const simulation = new LiquidLevelSimulation(0.2)
    simulation.setLevel(0.7)
    simulation.setLean(0.6)
    play(simulation, 700)
    const mean = surface(simulation).reduce((sum, height) => sum + height, 0) / simulation.columns
    expect(mean).toBeCloseTo(simulation.current, 3)
  })

  it('leans toward a side and sloshes on the way there', () => {
    const simulation = new LiquidLevelSimulation(0.5, { aspect: 1 })
    simulation.setLean(1)
    let deepest = 0
    play(simulation, 3000, () => {
      deepest = Math.max(deepest, (simulation.front(simulation.columns - 1) ?? 0) - 0.5)
    })
    play(simulation, 10_000)
    const rest = (simulation.front(simulation.columns - 1) ?? 0) - 0.5
    // Higher on the side it leans to, by the slope of a tipped glass…
    expect(rest).toBeGreaterThan(0.08)
    expect(simulation.front(0)).toBeCloseTo(1 - (simulation.front(simulation.columns - 1) ?? 0), 6)
    // …and it climbed past that before it fell back.
    expect(deepest).toBeGreaterThan(rest * 1.1)
  })

  it('keeps a lean in proportion to the vessel’s shape', () => {
    const wide = new LiquidLevelSimulation(0.5, { aspect: 2 })
    const tall = new LiquidLevelSimulation(0.5, { aspect: 0.5 })
    for (const simulation of [wide, tall]) {
      simulation.setLean(1)
      play(simulation, 10_000)
    }
    const rise = (simulation: LiquidLevelSimulation) => (simulation.front(simulation.columns - 1) ?? 0) - 0.5
    expect(rise(wide)).toBeCloseTo(rise(tall) * 4, 3)
  })

  it('carries no wave on an empty vessel', () => {
    const simulation = new LiquidLevelSimulation(0.6)
    simulation.setLevel(0)
    play(simulation, 3000)
    expect(Math.max(...surface(simulation))).toBeLessThan(0.01)
  })

  // The same stall the droplet timeline guards against: a frame that took half
  // a second is counted as a short one rather than integrated in one leap.
  it('counts a stalled frame as a short one', () => {
    const stalled = new LiquidLevelSimulation(0.2)
    const smooth = new LiquidLevelSimulation(0.2)
    stalled.setLevel(0.8)
    smooth.setLevel(0.8)
    stalled.step(0.5)
    smooth.step(1 / 30)
    expect(stalled.current).toBe(smooth.current)
    expect(Number.isFinite(stalled.slosh)).toBe(true)
  })

  it('jumps straight to its level when settled, for reduced motion', () => {
    const simulation = new LiquidLevelSimulation(0.2)
    simulation.setLevel(0.8)
    simulation.setLean(1)
    simulation.settle()
    expect(simulation.current).toBe(0.8)
    expect(simulation.slosh).toBe(0)
    expect(simulation.settled).toBe(true)
    expect(simulation.step(1 / 60)).toBe(false)
  })

  it('clamps the level to the vessel', () => {
    const simulation = new LiquidLevelSimulation(2)
    expect(simulation.current).toBe(1)
    simulation.setLevel(-1)
    expect(simulation.target).toBe(0)
    simulation.setLevel(Number.NaN)
    expect(simulation.target).toBe(0)
  })

  it('rocks longer the wobblier the provider', () => {
    const tallestAfter = (wobbliness: number) => {
      const simulation = new LiquidLevelSimulation(0.2, { wobbliness })
      simulation.setLevel(0.8)
      play(simulation, 2000)
      let tallest = 0
      play(simulation, 500, () => {
        tallest = Math.max(tallest, simulation.slosh)
      })
      return tallest
    }
    expect(tallestAfter(1)).toBeGreaterThan(tallestAfter(0) * 2)
  })
})
