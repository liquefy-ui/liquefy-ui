import { describe, expect, it } from 'vitest'
import {
  blendPose,
  glowAt,
  GLOW_MS,
  jumpHeight,
  jumpPose,
  JUMP_MS,
  shakeDistance,
  shakePose,
  SHAKE_MS,
  shineAt,
  SHINE_MS,
  SPRAY,
  SPRAY_BLEED,
  SPRAY_COUNT,
  STILL,
  type EffectPose,
} from '../src/change-effect-motion'
import { ParticleSystem, type ParticleFrame } from '../src/particle-system'

/** The pose every millisecond from 0 to `until`. */
const sample = (pose: (ms: number) => EffectPose, until: number): EffectPose[] =>
  Array.from({ length: Math.ceil(until) + 1 }, (_, ms) => pose(ms))

/** The biggest change in any part of the pose from one millisecond to the next. */
const largestStep = (poses: EffectPose[]): number => {
  let largest = 0
  for (let index = 1; index < poses.length; index += 1) {
    const a = poses[index - 1]!
    const b = poses[index]!
    largest = Math.max(largest, Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.scaleX - b.scaleX) * 100, Math.abs(a.scaleY - b.scaleY) * 100)
  }
  return largest
}

/** Turning points of `values`: where it stops rising and starts falling, or the other way. */
const peaks = (values: number[]): number[] => values.filter((value, index) => {
  const before = values[index - 1]
  const after = values[index + 1]
  return before !== undefined && after !== undefined && ((value > before && value >= after) || (value < before && value <= after))
})

describe('jump', () => {
  const HEIGHT = 24
  const poses = sample((ms) => jumpPose(ms, HEIGHT), JUMP_MS)

  it('starts and ends where it rests', () => {
    expect(jumpPose(0, HEIGHT)).toEqual(STILL)
    expect(jumpPose(JUMP_MS, HEIGHT)).toEqual(STILL)
    expect(jumpPose(-10, HEIGHT)).toEqual(STILL)
  })

  it('crouches, leaves the floor stretched, and reaches its height', () => {
    // Crouching: squat and wide, still on the floor.
    const crouched = jumpPose(85, HEIGHT)
    expect(crouched.y).toBe(0)
    expect(crouched.scaleY).toBeLessThan(0.9)
    expect(crouched.scaleX).toBeGreaterThan(1.05)
    // In the air it is stretched thin at some point, and tops out at its height.
    const flying = poses.filter((pose) => pose.y < 0)
    expect(Math.min(...flying.map((pose) => pose.y))).toBeCloseTo(-HEIGHT, 0)
    expect(Math.max(...flying.map((pose) => pose.scaleY))).toBeGreaterThan(1.03)
  })

  it('lands with a squash it wobbles out of: ぷるん', () => {
    const landed = poses.slice(poses.findLastIndex((pose) => pose.y < 0) + 1)
    const heights = landed.map((pose) => pose.scaleY)
    expect(Math.min(...heights)).toBeLessThan(0.93)
    // Squashed, then past round into a stretch, and back again: a wobble, not a settle.
    const turns = peaks(heights)
    expect(turns.length).toBeGreaterThanOrEqual(3)
    expect(turns[0]).toBeLessThan(1)
    expect(turns[1]).toBeGreaterThan(1)
    expect(landed.every((pose) => pose.y === 0)).toBe(true)
  })

  it('never jumps between phases', () => {
    expect(largestStep(poses)).toBeLessThan(0.6)
  })

  it('jumps half its height, kept between 10 and 28 pixels', () => {
    expect(jumpHeight(40)).toBe(20)
    expect(jumpHeight(8)).toBe(10)
    expect(jumpHeight(200)).toBe(28)
  })
})

describe('shake', () => {
  const DISTANCE = 10
  const xs = sample((ms) => shakePose(ms, DISTANCE), SHAKE_MS).map((pose) => pose.x)

  it('sets off to the left, by exactly its distance', () => {
    expect(shakePose(10, DISTANCE).x).toBeLessThan(0)
    expect(Math.min(...xs)).toBeCloseTo(-DISTANCE, 1)
  })

  it('swings back past the start, smaller each time', () => {
    const swings = peaks(xs)
    expect(swings.length).toBeGreaterThanOrEqual(6)
    for (let index = 1; index < swings.length; index += 1) {
      expect(Math.sign(swings[index]!)).toBe(-Math.sign(swings[index - 1]!))
      expect(Math.abs(swings[index]!)).toBeLessThan(Math.abs(swings[index - 1]!))
    }
  })

  it('moves only sideways, and comes to rest', () => {
    expect(sample((ms) => shakePose(ms, DISTANCE), SHAKE_MS).every((pose) => pose.y === 0 && pose.scaleX === 1)).toBe(true)
    expect(shakePose(SHAKE_MS, DISTANCE)).toEqual(STILL)
    expect(SHAKE_MS).toBeLessThan(1000)
  })

  it('shakes a sixteenth of its width, kept between 6 and 12 pixels', () => {
    expect(shakeDistance(160)).toBe(10)
    expect(shakeDistance(40)).toBe(6)
    expect(shakeDistance(600)).toBe(12)
  })
})

describe('blendPose', () => {
  it('goes from one pose to the other', () => {
    const from: EffectPose = { rotate: 10, scaleX: 1.2, scaleY: 0.8, x: -8, y: -20 }
    expect(blendPose(from, STILL, 0)).toEqual(from)
    expect(blendPose(from, STILL, 1)).toEqual(STILL)
    expect(blendPose(from, STILL, 0.5)).toEqual({ rotate: 5, scaleX: 1.1, scaleY: 0.9, x: -4, y: -10 })
  })
})

describe('shine', () => {
  it('crosses once, slowly at the ends and quickly through the middle', () => {
    expect(shineAt(0)).toBe(0)
    expect(shineAt(SHINE_MS)).toBe(1)
    expect(shineAt(SHINE_MS / 2)).toBeCloseTo(0.5, 6)
    const across = Array.from({ length: 73 }, (_, index) => shineAt((index * SHINE_MS) / 72))
    for (let index = 1; index < across.length; index += 1) expect(across[index]!).toBeGreaterThanOrEqual(across[index - 1]!)
    // A tenth of the time at the start covers far less than a tenth in the middle.
    expect(shineAt(SHINE_MS * 0.1)).toBeLessThan(shineAt(SHINE_MS * 0.55) - shineAt(SHINE_MS * 0.45))
  })
})

describe('glow', () => {
  it('comes up quickly, swells past its reach, and fades out to nothing', () => {
    expect(glowAt(0).level).toBe(0)
    expect(glowAt(200).level).toBeCloseTo(1, 6)
    const levels = Array.from({ length: 101 }, (_, index) => glowAt(280 + (index * (GLOW_MS - 280)) / 100).level)
    for (let index = 1; index < levels.length; index += 1) expect(levels[index]!).toBeLessThanOrEqual(levels[index - 1]! + 1e-9)
    expect(glowAt(GLOW_MS).level).toBe(0)
    expect(glowAt(GLOW_MS - 1).level).toBeLessThan(0.01)
    const spreads = Array.from({ length: 60 }, (_, index) => glowAt(index * 10).spread)
    expect(Math.max(...spreads)).toBeGreaterThan(1.05)
  })
})

describe('spray', () => {
  /** One spray on a 160 by 44 button, stepped at 60 fps. */
  const spray = () => {
    const system = new ParticleSystem(SPRAY, { seed: 21 })
    system.resize(160, 44, SPRAY_BLEED)
    system.burst(SPRAY_COUNT)
    return system
  }
  const drawn = (system: ParticleSystem): ParticleFrame[] => {
    const out: ParticleFrame[] = []
    system.each((frame) => out.push({ ...frame }))
    return out
  }

  it('throws every droplet up out of the middle of the element', () => {
    const system = spray()
    const born = drawn(system)
    expect(born).toHaveLength(SPRAY_COUNT)
    expect(born.every(({ x, y }) => x > 40 && x < 120 && y > 10 && y < 30)).toBe(true)
    for (let frame = 0; frame < 6; frame += 1) system.step(1 / 60)
    expect(drawn(system).every(({ y }) => y < 13)).toBe(true)
  })

  it('throws glass droplets of every size', () => {
    const sizes = drawn(spray()).map(({ size }) => size)
    expect(drawn(spray()).every(({ shape }) => shape === 'bead')).toBe(true)
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(2)
  })

  it('lets them fall back, inside the room it is drawn in, and gone in about a second', () => {
    const system = spray()
    let highest = 0
    let frames = 0
    while (system.step(1 / 60)) {
      frames += 1
      for (const { y } of drawn(system)) highest = Math.min(highest, y)
    }
    expect(-highest).toBeGreaterThan(60)
    expect(-highest).toBeLessThan(SPRAY_BLEED.top)
    expect(frames / 60).toBeLessThan(1.3)
  })
})
