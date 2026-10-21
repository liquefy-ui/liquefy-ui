import { describe, expect, it } from 'vitest'
import {
  MAGNETIC_DEFAULTS,
  magneticLayout,
  MagneticMotion,
  magneticPull,
  type MagneticPoint,
  type MagneticRest,
} from '../src/magnetic-motion'

const SIZE = 46
const GAP = 14
/** Three 46px buttons 14px apart: centres at 23, 83 and 143, all on y = 23. */
const row = magneticLayout(3, SIZE, GAP)

/** Steps the motion at 60 fps for `ms` milliseconds. */
const play = (motion: MagneticMotion, ms: number): void => {
  for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) motion.step(1 / 60)
}

const length = ({ x, y }: MagneticPoint): number => Math.hypot(x, y)

/** Clear space between two buttons as drawn, edge to edge along the row. */
const gapBetween = (motion: MagneticMotion, left: number, right: number): number => {
  const a = motion.shape(left)
  const b = motion.shape(right)
  return b.x - b.width / 2 - (a.x + a.width / 2)
}

describe('magnetic layout', () => {
  it('lays a row out as a flex row with that gap would, from its top-left corner', () => {
    expect(row.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 23, y: 23 },
      { x: 83, y: 23 },
      { x: 143, y: 23 },
    ])
    expect(row.every((rest) => rest.width === SIZE && rest.height === SIZE)).toBe(true)
  })

  it('stacks a column the same way down', () => {
    expect(magneticLayout(3, 36, 10, 'vertical').map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 18, y: 18 },
      { x: 18, y: 64 },
      { x: 18, y: 110 },
    ])
  })
})

describe('magneticPull', () => {
  // 30px above the middle button's top edge.
  const above: MagneticPoint = { x: 83, y: -30 }

  it('draws the nearest button hardest, its neighbours less, toward the pointer', () => {
    const [first, middle, last] = magneticPull(row, above)
    expect(length(middle!)).toBeGreaterThan(4)
    expect(length(first!)).toBeGreaterThan(0.5)
    expect(length(first!)).toBeLessThan(length(middle!) * 0.75)
    expect(length(last!)).toBeCloseTo(length(first!), 6)
    // Each toward the pointer: the middle straight up, the ends up and inward.
    expect(middle!.x).toBeCloseTo(0, 6)
    expect(middle!.y).toBeLessThan(0)
    expect(first!.x).toBeGreaterThan(0)
    expect(last!.x).toBeLessThan(0)
  })

  it('draws a button further from the pointer less than one nearer, down the row', () => {
    const five = magneticLayout(5, SIZE, GAP)
    const pulls = magneticPull(five, { x: 23, y: -20 }).map(length)
    expect(pulls[1]!).toBeLessThan(pulls[0]!)
    expect(pulls[2]!).toBeLessThan(pulls[1]!)
    expect(pulls[2]!).toBeGreaterThan(0)
    // Past reach of the pointer, the far end does not stir at all.
    expect(pulls.slice(3)).toEqual([0, 0])
  })

  it('closes the neighbours in on the button under the pointer', () => {
    const [first, middle, last] = magneticPull(row, { x: 83, y: 23 })
    // On its centre, the nearest has nowhere to go; the others lean in on it.
    expect(length(middle!)).toBeCloseTo(0, 6)
    expect(first!.x).toBeGreaterThan(1)
    expect(last!.x).toBeLessThan(-1)
  })

  it('draws two buttons the pointer is between nearly together', () => {
    const [, middle, last] = magneticPull(row, { x: 113, y: 23 })
    expect(middle!.x).toBeGreaterThan(4)
    expect(last!.x).toBeLessThan(-4)
    expect(GAP - middle!.x + last!.x).toBeLessThan(4)
  })

  it('moves nothing beyond reach of the nearest button', () => {
    const reach = MAGNETIC_DEFAULTS.reach
    const pulls = magneticPull(row, { x: 83, y: -reach - 1 })
    expect(pulls.every(({ x, y }) => x === 0 && y === 0)).toBe(true)
    const shorter = magneticPull(row, { x: 83, y: -40 }, { reach: 30 })
    expect(shorter.every(({ x, y }) => x === 0 && y === 0)).toBe(true)
    expect(magneticPull(row, null).every(({ x, y }) => x === 0 && y === 0)).toBe(true)
  })

  it('grows with strength, and holds still at none', () => {
    const weak = length(magneticPull(row, above, { strength: 0.3 })[1]!)
    const strong = length(magneticPull(row, above, { strength: 0.9 })[1]!)
    expect(strong).toBeGreaterThan(weak * 2)
    expect(magneticPull(row, above, { strength: 0 }).every(({ x, y }) => x === 0 && y === 0)).toBe(true)
  })

  it('eases into a third of a button’s size, however strong and far-reaching', () => {
    const pulls = magneticPull(row, { x: 83, y: -200 }, { reach: 600, strength: 1 })
    expect(length(pulls[1]!)).toBeGreaterThan(SIZE * 0.25)
    expect(length(pulls[1]!)).toBeLessThan(SIZE * 0.32)
  })

  it('leaves out buttons it is told to, and finds the nearest among the rest', () => {
    const pulls = magneticPull(row, above, {}, (index) => index !== 1)
    expect(pulls[1]).toEqual({ x: 0, y: 0 })
    // With the middle left out the ends are the nearest, and both reach for it.
    expect(length(pulls[0]!)).toBeGreaterThan(2)
    expect(length(pulls[0]!)).toBeCloseTo(length(pulls[2]!), 6)
  })

  it('takes buttons of different sizes, measuring from their edges', () => {
    const rests: MagneticRest[] = [
      { height: 40, width: 120, x: 60, y: 20 },
      { height: 40, width: 40, x: 154, y: 20 },
    ]
    // Over the wide one's right end, nearer the small one's centre than its own.
    const [wide, small] = magneticPull(rests, { x: 115, y: 20 })
    expect(length(wide!)).toBeGreaterThan(length(small!))
  })
})

describe('MagneticMotion', () => {
  const above: MagneticPoint = { x: 83, y: -30 }

  it('rests where it was placed until a pointer comes near', () => {
    const motion = new MagneticMotion(row)
    expect(motion.step(1 / 60)).toBe(false)
    expect(motion.shape(1)).toEqual({ angle: 0, height: SIZE, radius: SIZE / 2, stretch: 1, width: SIZE, x: 83, y: 23 })
  })

  it('follows the pull with a spring, swinging past it before it settles', () => {
    const motion = new MagneticMotion(row)
    motion.attract(above)
    const target = magneticPull(row, above)[1]!.y
    let furthest = 0
    for (let frame = 0; frame < 60; frame += 1) {
      motion.step(1 / 60)
      furthest = Math.min(furthest, motion.frame(1).y)
    }
    expect(furthest).toBeLessThan(target * 1.1)
    play(motion, 1500)
    expect(motion.frame(1).y).toBeCloseTo(target, 2)
  })

  it('springs back past its place when the pointer goes, then rests there', () => {
    const motion = new MagneticMotion(row)
    motion.attract(above)
    play(motion, 1500)
    const leaning = motion.frame(1).y
    motion.attract(null)
    let overshoot = 0
    for (let frame = 0; frame < 60; frame += 1) {
      motion.step(1 / 60)
      overshoot = Math.max(overshoot, motion.frame(1).y)
    }
    expect(overshoot).toBeGreaterThan(-leaning * 0.1)
    play(motion, 2000)
    expect(motion.step(1 / 60)).toBe(false)
    expect(motion.shape(1)).toMatchObject({ stretch: 1, x: 83, y: 23 })
  })

  it('swings more freely the wobblier the provider', () => {
    const swing = (wobbliness: number) => {
      const motion = new MagneticMotion(row, { wobbliness })
      motion.attract(above)
      play(motion, 1500)
      motion.attract(null)
      let overshoot = 0
      for (let frame = 0; frame < 60; frame += 1) {
        motion.step(1 / 60)
        overshoot = Math.max(overshoot, motion.frame(1).y)
      }
      return overshoot
    }
    expect(swing(1)).toBeGreaterThan(swing(0) * 1.5)
  })

  it('melts two buttons together when the pointer draws them close', () => {
    const motion = new MagneticMotion(row)
    expect(gapBetween(motion, 1, 2)).toBe(GAP)
    motion.attract({ x: 113, y: 23 })
    play(motion, 1500)
    // Well inside the 12px the glass bridges by default, and short of touching.
    expect(gapBetween(motion, 1, 2)).toBeLessThan(6)
    expect(gapBetween(motion, 1, 2)).toBeGreaterThan(-6)
  })

  it('stretches a leaning button along its pull, and is round at rest', () => {
    const motion = new MagneticMotion(row)
    motion.attract(above)
    play(motion, 1500)
    const frame = motion.frame(1)
    expect(frame.stretch).toBeGreaterThan(1.03)
    expect(Math.abs(Math.abs(frame.angle) - 90)).toBeLessThan(1)
    motion.attract(null)
    play(motion, 2500)
    expect(motion.frame(1).stretch).toBe(1)
  })

  it('squashes a pressed button wider and flatter, and lets it back up to round', () => {
    const motion = new MagneticMotion(row)
    motion.press(2)
    play(motion, 400)
    const held = motion.frame(2)
    expect(held.scaleX).toBeGreaterThan(1.03)
    expect(held.scaleY).toBeLessThan(0.93)
    expect(motion.frame(1)).toMatchObject({ scaleX: 1, scaleY: 1 })

    motion.release(2)
    play(motion, 1500)
    expect(motion.frame(2)).toMatchObject({ scaleX: 1, scaleY: 1 })
  })

  it('kicks a press let go back up past round, which a cancelled press is not', () => {
    // At full wobbliness, where the jelly is loose enough to see.
    const tallest = (kick: boolean) => {
      const motion = new MagneticMotion(row, { wobbliness: 1 })
      motion.press(0)
      play(motion, 400)
      motion.release(0, kick)
      let peak = 0
      for (let frame = 0; frame < 60; frame += 1) {
        motion.step(1 / 60)
        peak = Math.max(peak, motion.frame(0).scaleY)
      }
      return peak
    }
    expect(tallest(true)).toBeGreaterThan(1.04)
    expect(tallest(true)).toBeGreaterThan(tallest(false) + 0.01)
  })

  it('has nothing to let go of without a press', () => {
    const motion = new MagneticMotion(row)
    motion.release(0)
    expect(motion.step(1 / 60)).toBe(false)
    expect(motion.frame(0)).toMatchObject({ scaleX: 1, scaleY: 1 })
  })

  it('draws the press into the glass: the shape is squashed as the button is', () => {
    const motion = new MagneticMotion(row)
    motion.press(0)
    motion.settle()
    const shape = motion.shape(0)
    expect(shape.width).toBeGreaterThan(SIZE)
    expect(shape.height).toBeLessThan(SIZE)
    expect(shape.radius).toBe(shape.height / 2)
  })

  it('counts a stalled frame as a short one', () => {
    const smooth = new MagneticMotion(row)
    const stalled = new MagneticMotion(row)
    smooth.attract(above)
    stalled.attract(above)
    smooth.step(1 / 30)
    stalled.step(0.5)
    expect(stalled.frame(1).y).toBeCloseTo(smooth.frame(1).y, 6)
  })

  it('lands everything at once when settled, for motion off', () => {
    const motion = new MagneticMotion(row)
    motion.attract(above)
    motion.settle()
    expect(motion.frame(1).y).toBeCloseTo(magneticPull(row, above)[1]!.y, 6)
    expect(motion.step(1 / 60)).toBe(false)
  })

  it('keeps the buttons it has when placed again, and takes new ones at rest', () => {
    const motion = new MagneticMotion(row)
    motion.attract(above)
    play(motion, 1500)
    const leaning = motion.frame(1).y
    motion.place(magneticLayout(4, SIZE, GAP))
    expect(motion.count).toBe(4)
    expect(motion.frame(1).y).toBe(leaning)
    expect(motion.shape(3)).toMatchObject({ x: 203, y: 23 })
    motion.place(magneticLayout(2, SIZE, GAP))
    expect(motion.count).toBe(2)
  })
})
