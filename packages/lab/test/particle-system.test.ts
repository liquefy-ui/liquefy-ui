import { describe, expect, it } from 'vitest'
import {
  createRandom,
  MAX_PARTICLES,
  PARTICLE_DEFAULTS,
  PARTICLE_PRESETS,
  particleConfig,
  ParticleSystem,
  type ParticleConfig,
  type ParticleFrame,
  type ParticlePreset,
} from '../src/particle-system'

/** Steps the system at 60 fps for `ms` milliseconds. */
const play = (system: ParticleSystem, ms: number): void => {
  for (let frame = Math.round((ms * 60) / 1000); frame > 0; frame -= 1) system.step(1 / 60)
}

/** Every particle as drawn now, copied out of the reused frame. */
const frames = (system: ParticleSystem): ParticleFrame[] => {
  const out: ParticleFrame[] = []
  system.each((frame) => out.push({ ...frame }))
  return out
}

/** A config that only does what a test sets: no emission, no fading, no variation. */
const still = (overrides: Partial<ParticleConfig> = {}): ParticleConfig => ({
  ...PARTICLE_DEFAULTS,
  emitter: 'center',
  fadeOut: 0,
  lifetime: 100,
  rate: 0,
  speed: 0,
  ...overrides,
})

const field = (config: ParticleConfig, seed = 1): ParticleSystem => {
  const system = new ParticleSystem(config, { seed })
  system.resize(400, 300)
  return system
}

describe('createRandom', () => {
  it('repeats itself for a seed, and differs between seeds', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    const c = createRandom(43)
    const first = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(first)
    expect(Array.from({ length: 5 }, c)).not.toEqual(first)
  })

  it('stays from 0 up to 1', () => {
    const random = createRandom(7)
    for (let index = 0; index < 2000; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('ParticleSystem', () => {
  it('draws the same particles for the same seed and the same steps', () => {
    const a = field(PARTICLE_PRESETS.confetti, 9)
    const b = field(PARTICLE_PRESETS.confetti, 9)
    play(a, 1500)
    play(b, 1500)
    expect(a.count).toBeGreaterThan(10)
    expect(frames(a)).toEqual(frames(b))
    const c = field(PARTICLE_PRESETS.confetti, 10)
    play(c, 1500)
    expect(frames(c)).not.toEqual(frames(a))
  })

  it('bears `rate` particles a second', () => {
    const system = field(still({ emitter: 'area', limit: 1000, rate: 60 }))
    play(system, 1000)
    expect(system.count).toBeGreaterThanOrEqual(59)
    expect(system.count).toBeLessThanOrEqual(61)
    play(system, 1000)
    expect(system.count).toBeGreaterThanOrEqual(119)
    expect(system.count).toBeLessThanOrEqual(121)
  })

  it('never keeps more alive than the config’s limit, or than MAX_PARTICLES in all', () => {
    const limited = field(still({ emitter: 'area', limit: 50, rate: 5000 }))
    for (let frame = 0; frame < 30; frame += 1) {
      limited.step(1 / 60)
      expect(limited.count).toBeLessThanOrEqual(50)
    }
    expect(limited.count).toBe(50)

    const flood = field(still({ emitter: 'area', limit: 100_000 }))
    flood.burst(MAX_PARTICLES * 2)
    expect(flood.count).toBe(MAX_PARTICLES)
  })

  it('does not save up what it could not bear while full', () => {
    const system = field(still({ emitter: 'area', lifetime: 0.5, limit: 10, rate: 200 }))
    play(system, 2000)
    expect(system.count).toBe(10)
  })

  it('counts at most a thirtieth of a second a step, however long the frame was', () => {
    const system = field(still({ angle: 0, speed: 300 }))
    system.burst(1)
    system.step(1)
    const [particle] = frames(system)
    expect(particle!.x).toBeCloseTo(200 + 300 / 30, 6)
    system.step(Number.NaN)
    system.step(-1)
    expect(frames(system)[0]!.x).toBeCloseTo(200 + 300 / 30, 6)
  })

  it('falls under gravity and slows in the air', () => {
    const falling = field(still({ gravity: 600 }))
    falling.burst(1)
    play(falling, 500)
    // Half of g t²: 75 pixels in half a second, give or take the integrator's step.
    expect(frames(falling)[0]!.y - 150).toBeCloseTo(75, -1)

    const coasting = field(still({ angle: 0, drag: 2, speed: 400 }))
    coasting.burst(1)
    play(coasting, 1000)
    // Without drag it would be 400 px on; with it, 400 (1 − e^−2) / 2.
    expect(frames(coasting)[0]!.x - 200).toBeCloseTo((400 * (1 - Math.exp(-2))) / 2, -1)
  })

  it('fades in as it is born, fades out at the end, and goes when its life is up', () => {
    const system = field(still({ fadeOut: 0.5, lifetime: 1 }))
    system.burst(1)
    expect(frames(system)[0]!.opacity).toBe(0)
    play(system, 200)
    expect(frames(system)[0]!.opacity).toBeCloseTo(1, 6)
    play(system, 550)
    const late = frames(system)[0]!.opacity
    expect(late).toBeGreaterThan(0)
    expect(late).toBeLessThan(0.6)
    play(system, 300)
    expect(system.count).toBe(0)
    expect(system.step(1 / 60)).toBe(false)
  })

  it('shrinks or grows toward sizeAtDeath over its life', () => {
    const system = field(still({ lifetime: 1, size: 10, sizeAtDeath: 0.5 }))
    system.burst(1)
    expect(frames(system)[0]!.size).toBeCloseTo(10, 6)
    play(system, 500)
    expect(frames(system)[0]!.size).toBeCloseTo(7.5, 0)
  })

  it('lets go of a particle past the field that will not come back, and keeps one that will', () => {
    const system = new ParticleSystem(still({ angle: -90, gravity: 0, speed: 600 }), { seed: 1 })
    system.resize(100, 100)
    system.burst(1)
    play(system, 400)
    expect(system.count).toBe(0)

    // Thrown up past the top, but gravity brings it back down.
    const thrown = new ParticleSystem(still({ angle: -90, gravity: 800, speed: 600 }), { seed: 1 })
    thrown.resize(100, 100)
    thrown.burst(1)
    play(thrown, 400)
    expect(frames(thrown)[0]!.y).toBeLessThan(0)
    expect(thrown.count).toBe(1)
  })

  it('draws in the bleed around the field before letting a particle go', () => {
    const system = new ParticleSystem(still({ angle: -90, speed: 300 }), { seed: 1 })
    system.resize(100, 100, { top: 200 })
    system.burst(1)
    play(system, 600)
    // 50 up from the middle to the top edge, then 130 into the 200 of bleed.
    expect(system.count).toBe(1)
    expect(frames(system)[0]!.y).toBeLessThan(0)
  })

  it('bears particles where the emitter says', () => {
    const at = (emitter: ParticleConfig['emitter'], overrides: Partial<ParticleConfig> = {}) => {
      const system = new ParticleSystem(still({ emitter, ...overrides }), { seed: 3 })
      system.resize(400, 300, { bottom: 10, left: 20, right: 20, top: 10 })
      system.burst(200)
      return frames(system)
    }

    expect(at('center').every(({ x, y }) => x === 200 && y === 150)).toBe(true)
    const box = at({ height: 0.5, width: 0.25, x: 0.5, y: 0.25 })
    expect(box.every(({ x, y }) => x >= 200 && x <= 300 && y >= 75 && y <= 225)).toBe(true)
    const area = at('area')
    expect(area.every(({ x, y }) => x >= -20 && x <= 420 && y >= -10 && y <= 310)).toBe(true)
    expect(Math.min(...area.map(({ x }) => x))).toBeLessThan(0)
    // The edges: just beyond them, so a particle slides in rather than appearing.
    expect(at('top', { size: 6 }).every(({ y }) => y < -10)).toBe(true)
    expect(at('bottom', { size: 6 }).every(({ y }) => y > 310)).toBe(true)
  })

  it('widens a line of slanting rain upwind, so the far corner is not dry', () => {
    // Falling down and to the left at 45 degrees across a field 300 high.
    const system = new ParticleSystem(still({ angle: 135, emitter: 'top', speed: 500 }), { seed: 5 })
    system.resize(400, 300)
    system.burst(300)
    const xs = frames(system).map(({ x }) => x)
    expect(Math.max(...xs)).toBeGreaterThan(600)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
  })

  it('bursts a particle whose life runs out into its explosion, in its colour, where it was', () => {
    const rocket = still({
      angle: -90,
      colors: ['#ff0000'],
      explode: { count: 12, lifetime: 1, shape: 'spark', speed: 100, spread: 360 },
      lifetime: 0.2,
      speed: 200,
    })
    const system = field(rocket)
    system.burst(1)
    play(system, 180)
    const [flying] = frames(system)
    play(system, 50)
    const sparks = frames(system)
    expect(sparks).toHaveLength(12)
    expect(sparks.every(({ color, shape }) => color === '#ff0000' && shape === 'spark')).toBe(true)
    // They leave from where the rocket was, which was still on its way up.
    const centre = sparks.reduce((sum, { y }) => sum + y, 0) / sparks.length
    expect(Math.abs(centre - flying!.y)).toBeLessThan(15)

    const recoloured = field({ ...rocket, explode: { ...rocket.explode!, colors: ['#00ff00'] } })
    recoloured.burst(1)
    play(recoloured, 250)
    expect(frames(recoloured).every(({ color }) => color === '#00ff00')).toBe(true)
  })

  it('keeps the particles alive in the config they were born with when it changes', () => {
    const system = field(still({ emitter: 'area', shape: 'streak' }))
    system.burst(5)
    system.setConfig(still({ emitter: 'area', shape: 'flake' }))
    system.burst(5)
    const shapes = frames(system).map(({ shape }) => shape).sort()
    expect(shapes).toEqual(['flake', 'flake', 'flake', 'flake', 'flake', 'streak', 'streak', 'streak', 'streak', 'streak'])
  })

  it('bears nothing while not emitting, but still bursts, and goes quiet once empty', () => {
    const system = field(still({ emitter: 'area', lifetime: 0.3, rate: 100 }))
    system.emitting = false
    expect(system.step(1 / 60)).toBe(false)
    expect(system.count).toBe(0)
    system.burst(4)
    expect(system.count).toBe(4)
    expect(system.step(1 / 60)).toBe(true)
    play(system, 400)
    expect(system.count).toBe(0)
    expect(system.step(1 / 60)).toBe(false)
  })

  it('opens full when warmed', () => {
    const system = field(PARTICLE_PRESETS.snow)
    system.warm()
    expect(system.count).toBeGreaterThan(150)
    // Spread down the field, not bunched at the top where they are born.
    const ys = frames(system).map(({ y }) => y)
    expect(Math.max(...ys)).toBeGreaterThan(250)
  })

  it('makes far particles smaller, slower and fainter', () => {
    const system = field(still({ depth: 1, emitter: 'area', limit: 400, size: 10, speed: 100, angle: 0 }))
    system.burst(300)
    play(system, 200)
    const drawn = frames(system)
    const sizes = drawn.map(({ size }) => size)
    expect(Math.min(...sizes)).toBeLessThan(5)
    expect(Math.max(...sizes)).toBeGreaterThan(9)
    // The smallest is also the faintest.
    const smallest = drawn.reduce((a, b) => (b.size < a.size ? b : a))
    const largest = drawn.reduce((a, b) => (b.size > a.size ? b : a))
    expect(smallest.opacity).toBeLessThan(largest.opacity)
  })

  it('draws a streak with its tail behind it and a confetti piece tumbling', () => {
    const rain = field(still({ angle: 90, shape: 'streak', speed: 500, stretch: 0.02 }))
    rain.burst(1)
    const [drop] = frames(rain)
    expect(drop!.tailX).toBeCloseTo(0, 6)
    expect(drop!.tailY).toBeCloseTo(-10, 6)

    const confetti = field(still({ emitter: 'area', shape: 'confetti' }))
    confetti.burst(40)
    play(confetti, 300)
    const flips = frames(confetti).map(({ flip }) => flip)
    expect(flips.every((flip) => flip >= -1 && flip <= 1)).toBe(true)
    expect(flips.some((flip) => flip < 0)).toBe(true)
  })

  it('swells a sparkle in and away again', () => {
    const system = field(still({ lifetime: 1, shape: 'sparkle', size: 10 }))
    system.burst(1)
    expect(frames(system)[0]!.size).toBe(0)
    play(system, 500)
    expect(frames(system)[0]!.size).toBeCloseTo(10, 0)
    play(system, 480)
    expect(frames(system)[0]!.size).toBeLessThan(2)
  })
})

describe('presets', () => {
  const names = Object.keys(PARTICLE_PRESETS) as ParticlePreset[]

  it('has the six', () => {
    expect(names.sort()).toEqual(['bubbles', 'confetti', 'fireworks', 'magic', 'rain', 'snow'])
  })

  it.each(names)('runs %s inside its limit, with every frame drawable', (name) => {
    const config = PARTICLE_PRESETS[name]
    const system = field(config, 4)
    system.warm()
    let seen = 0
    for (let frame = 0; frame < 180; frame += 1) {
      system.step(1 / 60)
      seen = Math.max(seen, system.count)
      expect(system.count).toBeLessThanOrEqual(MAX_PARTICLES)
    }
    expect(seen).toBeGreaterThan(0)
    for (const frame of frames(system)) {
      expect(Number.isFinite(frame.x + frame.y + frame.size + frame.opacity + frame.rotation)).toBe(true)
      expect(frame.opacity).toBeGreaterThanOrEqual(0)
      expect(frame.opacity).toBeLessThanOrEqual(1)
    }
  })

  it('goes the way each one should', () => {
    // How far twenty particles of each, born in the middle, have gone down a tenth of a second later, on average.
    const drift = (name: ParticlePreset) => {
      const system = field({ ...PARTICLE_PRESETS[name], depth: 0, emitter: 'center', explode: undefined, limit: 20, rate: 0 }, 2)
      system.burst(20)
      play(system, 100)
      const drawn = frames(system)
      expect(drawn).toHaveLength(20)
      return drawn.reduce((sum, { y }) => sum + y - 150, 0) / drawn.length
    }
    expect(drift('rain')).toBeGreaterThan(70)
    expect(drift('snow')).toBeGreaterThan(1)
    expect(drift('snow')).toBeLessThan(8)
    expect(drift('confetti')).toBeGreaterThan(4)
    expect(drift('bubbles')).toBeLessThan(-2)
    expect(drift('fireworks')).toBeLessThan(-25)
  })

  it('takes settings over a preset, or over the defaults without one', () => {
    expect(particleConfig('rain', { rate: 5 })).toEqual({ ...PARTICLE_PRESETS.rain, rate: 5 })
    expect(particleConfig(undefined, { shape: 'bead' })).toEqual({ ...PARTICLE_DEFAULTS, shape: 'bead' })
    expect(particleConfig()).toEqual(PARTICLE_DEFAULTS)
  })
})
