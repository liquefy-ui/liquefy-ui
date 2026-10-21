import { describe, expect, it } from 'vitest'
import {
  atSpeed,
  bounceTrack,
  breatheTrack,
  dashFor,
  landingTrack,
  planDraw,
  poseTransform,
  progressAt,
  pulseTrack,
  REST,
  settleTime,
  springAt,
  springProgress,
  trackKeyframes,
  turnTrack,
  wiggleTrack,
  withRest,
  type Track,
} from '../src/effects/motion'

/** The pose every `step` milliseconds over the whole track. */
const samples = (track: Track, step = 5) =>
  Array.from({ length: Math.floor(track.duration / step) + 1 }, (_, index) => track.at(index * step))

const nearRest = (track: Track) => {
  const end = track.at(track.duration)
  expect(end.x).toBeCloseTo(0, 2)
  expect(end.y).toBeCloseTo(0, 2)
  expect(end.scaleX).toBeCloseTo(1, 2)
  expect(end.scaleY).toBeCloseTo(1, 2)
}

describe('the spring', () => {
  it('rings past its rest and settles there', () => {
    const spring = { damping: 0.4, response: 0.4 }
    const values = Array.from({ length: 80 }, (_, index) => springAt(spring, 1, 0, index / 60).value)
    expect(Math.min(...values)).toBeLessThan(-0.1)
    expect(Math.abs(values.at(-1)!)).toBeLessThan(0.01)
  })

  it('settles without overshooting when critically damped', () => {
    const values = Array.from({ length: 80 }, (_, index) => springAt({ damping: 1, response: 0.4 }, 1, 0, index / 60).value)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
  })

  it('reports its velocity as the slope of its position', () => {
    const spring = { damping: 0.5, response: 0.3 }
    const at = 0.12
    const slope = (springAt(spring, 1, 2, at + 1e-6).value - springAt(spring, 1, 2, at - 1e-6).value) / 2e-6
    expect(springAt(spring, 1, 2, at).velocity).toBeCloseTo(slope, 3)
  })

  it('settles sooner the more damped it is', () => {
    expect(settleTime({ damping: 0.8, response: 0.4 }, 1, 0, 0.001)).toBeLessThan(settleTime({ damping: 0.2, response: 0.4 }, 1, 0, 0.001))
  })
})

describe('bounce', () => {
  it('crouches into the floor before it hops, then lands back at rest', () => {
    const track = bounceTrack('up')
    const poses = samples(track)
    const crouch = poses.findIndex((pose) => pose.scaleY < 0.95)
    const air = poses.findIndex((pose) => pose.y < -0.05)
    expect(crouch).toBeGreaterThan(-1)
    expect(air).toBeGreaterThan(crouch)
    // Squashing is against the bottom edge, as on a floor.
    expect(poses[crouch]!.anchor).toBe(0.5)
    nearRest(track)
  })

  it('is pressed down first when bouncing down, and springs up past its place', () => {
    const poses = samples(bounceTrack('down'))
    const pressed = poses.findIndex((pose) => pose.scaleY < 0.95)
    const rebound = poses.findIndex((pose) => pose.y < -0.005)
    expect(pressed).toBeGreaterThan(-1)
    expect(rebound).toBeGreaterThan(pressed)
  })

  it('overshoots more than once before it is still', () => {
    const lifts = samples(bounceTrack('up')).map((pose) => -pose.y)
    let crossings = 0
    for (let index = 1; index < lifts.length; index += 1) {
      if ((lifts[index - 1]! > 0.002) !== (lifts[index]! > 0.002)) crossings += 1
    }
    expect(crossings).toBeGreaterThanOrEqual(2)
  })
})

describe('wiggle', () => {
  it('sets off the way it is pointed, swings back past the start and stops', () => {
    for (const [direction, axis, sign] of [['left', 'x', -1], ['right', 'x', 1], ['up', 'y', -1], ['down', 'y', 1]] as const) {
      const track = wiggleTrack(direction)
      const poses = samples(track, 2)
      const first = poses.find((pose) => Math.abs(pose[axis]) > 0.01)!
      expect(Math.sign(first[axis]), direction).toBe(sign)
      expect(poses.some((pose) => Math.sign(pose[axis]) === -sign && Math.abs(pose[axis]) > 0.01), direction).toBe(true)
      nearRest(track)
    }
  })

  it('rocks about its centre by the angle asked for', () => {
    const poses = samples(wiggleTrack('counterClockwise', 20), 1)
    const peak = Math.min(...poses.map((pose) => pose.rotate))
    expect(peak).toBeCloseTo(-20, 0)
    expect(poses.every((pose) => pose.x === 0 && pose.y === 0)).toBe(true)
  })

  it('takes any heading in degrees', () => {
    const first = samples(wiggleTrack(90), 2).find((pose) => Math.abs(pose.y) > 0.01)!
    expect(first.y).toBeGreaterThan(0)
    expect(Math.abs(first.x)).toBeLessThan(1e-9)
  })
})

describe('breathe', () => {
  it('swells to a tenth larger half way through and is back by the end', () => {
    const track = breatheTrack()
    expect(track.at(track.duration / 2).scaleX).toBeCloseTo(1.1, 6)
    nearRest(track)
  })
})

describe('rotate', () => {
  it('turns once on a spring, swinging past upright before it settles on it', () => {
    const track = turnTrack('clockwise')
    const angles = samples(track).map((pose) => pose.rotate)
    expect(angles[0]).toBeCloseTo(-360, 6)
    expect(Math.max(...angles)).toBeGreaterThan(5)
    expect(track.at(track.duration).rotate).toBeCloseTo(0, 0)
  })

  it('finishes the turn it is on at its speed, then overshoots upright and comes back', () => {
    const track = landingTrack(270)
    // A quarter turn left at 360° a second takes 250ms.
    expect(track.at(125).rotate).toBeCloseTo(315, 6)
    const angles = samples(track).map((pose) => pose.rotate)
    expect(Math.max(...angles)).toBeGreaterThan(370)
    expect(track.at(track.duration).rotate).toBeCloseTo(360, 0)
  })

  it('lands the other way round for counterClockwise', () => {
    const track = landingTrack(90, 'counterClockwise')
    expect(track.at(0).rotate).toBeCloseTo(-90, 6)
    expect(track.at(track.duration).rotate).toBeCloseTo(-360, 0)
  })
})

describe('playing a track', () => {
  it('plays faster or slower at a speed', () => {
    const track = bounceTrack()
    const fast = atSpeed(track, 2)
    expect(fast.duration).toBeCloseTo(track.duration / 2, 6)
    expect(fast.at(100)).toEqual(track.at(200))
    expect(atSpeed(track, 0).duration).toBe(track.duration)
  })

  it('rests at the end of a cycle that repeats', () => {
    const track = withRest(bounceTrack(), 700)
    expect(track.duration).toBeCloseTo(bounceTrack().duration + 700, 6)
    expect(track.at(track.duration - 1)).toEqual(REST)
  })

  it('samples one keyframe a frame, from the first moment to the last', () => {
    const track = pulseTrack()
    const keyframes = trackKeyframes(track)
    expect(keyframes).toHaveLength(Math.ceil((track.duration / 1000) * 60) + 1)
    expect(keyframes[0]!.offset).toBe(0)
    expect(keyframes.at(-1)!.offset).toBe(1)
  })

  it('writes every pose with the same functions, so keyframes blend function by function', () => {
    const shape = (transform: string) => transform.replace(/-?[\d.]+/g, '#')
    expect(shape(poseTransform(REST))).toBe(shape(poseTransform({ anchor: 0.5, rotate: 400, scaleX: 0.8, scaleY: 1.2, x: -0.1, y: 0.2 })))
    expect(poseTransform(REST)).toBe('translate(0%, 0%) rotate(0deg) translate(0%, 0%) scale(1, 1) translate(0%, 0%)')
  })

  it('springs from 0 to exactly 1, passing it on the way', () => {
    const { samples: progress } = springProgress({ damping: 0.6, response: 0.42 })
    expect(progress[0]).toBe(0)
    expect(progress.at(-1)).toBe(1)
    expect(Math.max(...progress)).toBeGreaterThan(1)
  })
})

describe('drawing strokes', () => {
  it('shows all of a stroke at 1 and nothing at 0, round cap and all', () => {
    expect(dashFor(10, 1)).toEqual({ strokeDasharray: '10 12', strokeDashoffset: '0' })
    expect(dashFor(10, 0)).toEqual({ strokeDasharray: '10 12', strokeDashoffset: '11' })
    // The dash ends a unit before the stroke starts, and the next starts a unit after it ends.
    expect(10 - 11).toBeLessThan(0)
    expect(10 + 12 - 11).toBeGreaterThan(10)
  })

  it('reads how much shows back off the offset', () => {
    expect(progressAt(10, 0)).toBe(1)
    expect(progressAt(10, 11)).toBe(0)
    expect(progressAt(10, 5.5)).toBeCloseTo(0.5, 6)
    expect(progressAt(10, Number.NaN)).toBe(1)
  })

  it('draws on one stroke after another, each in proportion to its length', () => {
    const { timings, total } = planDraw([
      { from: 0, length: 53.4, to: 1 },
      { from: 0, length: 10.3, to: 1 },
    ])
    const [circle, tick] = timings as [{ delay: number; duration: number }, { delay: number; duration: number }]
    expect(circle.delay).toBe(0)
    expect(tick.delay).toBeGreaterThan(circle.delay + circle.duration * 0.8)
    expect(tick.delay).toBeLessThan(circle.delay + circle.duration)
    expect(tick.delay + tick.duration).toBeCloseTo(total, 6)
    expect(circle.duration / tick.duration).toBeCloseTo(53.4 / 10.3, 6)
  })

  it('never lets a short stroke finish before the long one before it', () => {
    const { timings } = planDraw([
      { from: 0, length: 80, to: 1 },
      { from: 0, length: 2, to: 1 },
      { from: 0, length: 40, to: 1 },
    ])
    for (let index = 1; index < timings.length; index += 1) {
      const previous = timings[index - 1]!
      const current = timings[index]!
      expect(current.delay + current.duration).toBeGreaterThan(previous.delay + previous.duration)
    }
  })

  it('draws off last stroke first, and quicker than drawing on', () => {
    const items = [
      { from: 1, length: 30, to: 0 },
      { from: 1, length: 30, to: 0 },
    ]
    const off = planDraw(items)
    expect(off.timings[1]!.delay).toBe(0)
    expect(off.timings[0]!.delay).toBeGreaterThan(0)
    expect(off.total).toBeLessThan(planDraw(items.map((item) => ({ ...item, from: 0, to: 1 }))).total)
  })

  it('spends no time on a stroke that is already there, and less on one half way', () => {
    const { timings } = planDraw([
      { from: 1, length: 30, to: 1 },
      { from: 0.5, length: 30, to: 1 },
      { from: 0, length: 30, to: 1 },
    ])
    expect(timings[0]).toEqual({ delay: 0, duration: 0 })
    expect(timings[1]!.duration).toBeCloseTo(timings[2]!.duration / 2, 6)
    expect(planDraw([{ from: 1, length: 30, to: 1 }]).total).toBe(0)
  })

  it('draws every stroke at once when together, and faster at a speed', () => {
    const items = [
      { from: 0, length: 50, to: 1 },
      { from: 0, length: 5, to: 1 },
    ]
    const { timings } = planDraw(items, { order: 'together' })
    expect(timings[0]).toEqual(timings[1])
    expect(timings[0]!.delay).toBe(0)
    expect(planDraw(items, { speed: 2 }).total).toBeCloseTo(planDraw(items).total / 2, 6)
  })

  it('takes longer for more line, within a third of a second and a second', () => {
    const tick = planDraw([{ from: 0, length: 10, to: 1 }]).total
    const busy = planDraw([{ from: 0, length: 400, to: 1 }]).total
    expect(tick).toBeGreaterThanOrEqual(380)
    expect(busy).toBe(1100)
  })
})
