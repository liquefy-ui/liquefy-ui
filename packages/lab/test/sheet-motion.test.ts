import { describe, expect, it } from 'vitest'
import {
  chooseStop,
  coastDistance,
  rubberBand,
  SheetMotion,
  sheetBox,
  sheetStops,
  snapHeight,
  VelocityTracker,
  type SheetFrame,
  type SheetLimits,
  type SheetRoom,
} from '../src/sheet-motion'

const FRAME = 1 / 60

/** Steps the motion at 60 fps for `ms` milliseconds, handing each frame to `each`. */
const play = (motion: SheetMotion, ms: number, each?: (frame: SheetFrame) => void): void => {
  for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) {
    motion.step(FRAME)
    each?.(motion.frame())
  }
}

const limits: SheetLimits = { ceiling: 600, elasticFloor: false, floor: -40, reach: 120 }
const stops = [150, 300, 600]

describe('snap points', () => {
  it('reads shares, percentages and pixels', () => {
    expect(snapHeight('50%', 640)).toBe(320)
    expect(snapHeight(0.25, 640)).toBe(160)
    expect(snapHeight(1, 640)).toBe(640)
    expect(snapHeight('180px', 640)).toBe(180)
    expect(snapHeight(180, 640)).toBe(180)
    expect(snapHeight('12rem' as never, 640)).toBeNaN()
  })

  it('sorts them shortest first, keeps them in the room and drops what comes to nothing', () => {
    expect(sheetStops(['100%', '180px', 0.5, '0%', '900px', '12rem' as never], 640)).toEqual([
      { height: 180, point: '180px' },
      { height: 320, point: 0.5 },
      { height: 640, point: '100%' },
    ])
  })

  it('counts two points that land on the same pixel once', () => {
    expect(sheetStops(['50%', '320px', 0.5], 640)).toEqual([{ height: 320, point: '50%' }])
  })

  it('has no stops in a room with no height', () => {
    expect(sheetStops(['50%', '100%'], 0)).toEqual([])
  })
})

describe('the rubber band', () => {
  it('gives about half the pull at first', () => {
    expect(rubberBand(2, 120) / 2).toBeCloseTo(0.55, 1)
  })

  it('gives ever less, and never more than its reach', () => {
    const steps = [20, 60, 200, 600, 5000].map((pull) => rubberBand(pull, 120))
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index]!).toBeGreaterThan(steps[index - 1]!)
      expect(steps[index]! - steps[index - 1]!).toBeLessThan(steps[index]!)
    }
    expect(steps.at(-1)!).toBeLessThan(120)
  })

  it('gives nothing for a push the other way', () => {
    expect(rubberBand(-30, 120)).toBe(0)
  })
})

describe('where a released sheet rests', () => {
  it('coasts half a pixel for every pixel a second, as a UIKit scroll view does', () => {
    expect(coastDistance(1000)).toBeCloseTo(499, 0)
    expect(coastDistance(-1000)).toBeCloseTo(-499, 0)
  })

  it('settles a slow release on the nearest stop', () => {
    expect(chooseStop(380, 0, stops, true)).toBe(1)
    expect(chooseStop(470, 0, stops, true)).toBe(2)
    expect(chooseStop(220, 40, stops, true)).toBe(1)
  })

  it('carries a gentle flick to the next stop', () => {
    expect(chooseStop(300, 500, stops, true)).toBe(2)
    expect(chooseStop(300, -400, stops, true)).toBe(0)
  })

  it('runs a hard flick up all the way to the top', () => {
    expect(chooseStop(160, 1500, stops, true)).toBe(2)
  })

  it('puts the sheet away on a hard flick down from the top', () => {
    expect(chooseStop(600, -1500, stops, true)).toBe(-1)
  })

  it('puts it away when dragged under half the lowest stop and let go', () => {
    expect(chooseStop(70, 0, stops, true)).toBe(-1)
    expect(chooseStop(80, 0, stops, true)).toBe(0)
  })

  it('never puts away a sheet that is not dismissible', () => {
    expect(chooseStop(600, -4000, stops, false)).toBe(0)
    expect(chooseStop(10, 0, stops, false)).toBe(0)
  })
})

describe('the velocity tracker', () => {
  it('reads a steady drag', () => {
    const tracker = new VelocityTracker()
    tracker.reset(0, 100)
    for (let time = 8; time <= 80; time += 8) tracker.add(time, 100 + time * 2)
    expect(tracker.velocity()).toBeCloseTo(2000, 0)
  })

  it('forgets moves older than a tenth of a second', () => {
    const tracker = new VelocityTracker()
    tracker.reset(0, 0)
    // Fast early on, then a slow, steady crawl for the last 200ms.
    tracker.add(10, 300)
    for (let time = 20; time <= 220; time += 10) tracker.add(time, 300 + (time - 20) * 0.1)
    expect(tracker.velocity()).toBeCloseTo(100, 0)
  })

  it('reads a finger that stopped before lifting as still', () => {
    const tracker = new VelocityTracker()
    tracker.reset(0, 0)
    for (let time = 10; time <= 60; time += 10) tracker.add(time, time * 3)
    expect(tracker.velocity(300)).toBe(0)
  })

  it('ignores an event stamped out of order', () => {
    const tracker = new VelocityTracker()
    tracker.reset(0, 0)
    tracker.add(16, 16)
    tracker.add(8, 900)
    tracker.add(32, 32)
    expect(tracker.velocity()).toBeCloseTo(1000, 0)
  })
})

describe('SheetMotion', () => {
  it('opens to a stop, swings past it and settles there', () => {
    const motion = new SheetMotion(-40, limits)
    motion.moveTo(300)
    let peak = 0
    play(motion, 2000, (frame) => {
      peak = Math.max(peak, frame.height)
    })
    expect(peak).toBeGreaterThan(310)
    expect(peak).toBeLessThan(360)
    expect(motion.frame().height).toBeCloseTo(300, 2)
    expect(motion.step(FRAME)).toBe(false)
  })

  it('swings further the more wobbly the provider', () => {
    const overshoot = (wobbliness: number) => {
      const motion = new SheetMotion(0, limits, { wobbliness })
      motion.moveTo(300)
      let peak = 0
      play(motion, 1500, (frame) => {
        peak = Math.max(peak, frame.height)
      })
      return peak - 300
    }
    expect(overshoot(1)).toBeGreaterThan(overshoot(0.1) * 2)
    expect(overshoot(0)).toBeLessThan(overshoot(0.1))
  })

  it('follows a finger one to one inside the limits', () => {
    const motion = new SheetMotion(300, limits)
    motion.hold(420)
    motion.step(FRAME)
    expect(motion.frame().height).toBe(420)
    expect(motion.dragging).toBe(true)
  })

  it('stretches against the band past the ceiling, ever less for each pixel', () => {
    const motion = new SheetMotion(600, limits)
    const at = (raw: number) => {
      motion.hold(raw)
      motion.step(FRAME)
      return motion.frame()
    }
    const first = at(650)
    const second = at(700)
    expect(first.height - 600).toBeGreaterThan(15)
    expect(first.height - 600).toBeLessThan(50)
    expect(second.height - first.height).toBeLessThan(first.height - 600)
    expect(second.stretch).toBeCloseTo(second.height - 600, 6)
    expect(at(5000).height).toBeLessThan(600 + limits.reach)
  })

  it('reaches a tongue up toward a finger pulling past the top, and drops it on release', () => {
    const motion = new SheetMotion(600, limits)
    let tongue = 0
    for (let raw = 600; raw <= 900; raw += 10) {
      motion.hold(raw)
      motion.step(FRAME)
      tongue = Math.max(tongue, motion.frame().tongue)
    }
    expect(tongue).toBeGreaterThan(20)
    // The spring may swing a little past its 36px mark on the way.
    expect(tongue).toBeLessThan(46)
    motion.release(600, 0)
    play(motion, 1500)
    expect(motion.frame().tongue).toBe(0)
    expect(motion.frame().height).toBeCloseTo(600, 2)
  })

  it('gives no tongue to a finger inside the limits', () => {
    const motion = new SheetMotion(300, limits)
    for (let raw = 300; raw <= 500; raw += 10) {
      motion.hold(raw)
      motion.step(FRAME)
      expect(motion.frame().tongue).toBe(0)
    }
  })

  it('holds a sheet that cannot be put away at its lowest stop, giving like the ceiling', () => {
    const motion = new SheetMotion(150, { ...limits, elasticFloor: true, floor: 150 })
    motion.hold(60)
    motion.step(FRAME)
    const frame = motion.frame()
    expect(frame.height).toBeLessThan(150)
    expect(frame.height).toBeGreaterThan(90)
    expect(frame.squash).toBeCloseTo(150 - frame.height, 6)
  })

  it('stops hard at a floor that does not give, however hard it is flung', () => {
    const motion = new SheetMotion(300, limits)
    motion.release(-40, -4000)
    play(motion, 1500, (frame) => expect(frame.height).toBeGreaterThanOrEqual(-40))
  })

  it('carries the finger’s speed into the spring on release', () => {
    const still = new SheetMotion(300, limits)
    still.release(600, 0)
    const flung = new SheetMotion(300, limits)
    flung.release(600, 3000)
    still.step(FRAME)
    flung.step(FRAME)
    // 3000 px/s is 50px in a frame, less what the damping takes, on top of
    // what the spring alone covers.
    expect(flung.frame().height - still.frame().height).toBeGreaterThan(30)
  })

  it('draws the sides in while racing and quivers them once it stops', () => {
    const motion = new SheetMotion(150, limits)
    motion.release(600, 2400)
    const wobble: number[] = []
    play(motion, 2500, (frame) => wobble.push(frame.wobble))
    expect(Math.max(...wobble)).toBeGreaterThan(3)
    // Past straight the other way at least once: the quiver, not just a recovery.
    expect(Math.min(...wobble)).toBeLessThan(-0.5)
    expect(wobble.at(-1)).toBe(0)
  })

  it('keeps the jelly and the tongue still when not liquid, but still follows and stretches', () => {
    const motion = new SheetMotion(600, limits, { liquid: false })
    for (let raw = 600; raw <= 900; raw += 10) {
      motion.hold(raw)
      motion.step(FRAME)
      expect(motion.frame().tongue).toBe(0)
      expect(motion.frame().wobble).toBe(0)
    }
    expect(motion.frame().stretch).toBeGreaterThan(30)
  })

  it('jumps straight to a stop and stills everything with motion off', () => {
    const motion = new SheetMotion(150, limits)
    motion.release(600, 2400)
    motion.step(FRAME)
    motion.jumpTo(300)
    expect(motion.frame()).toEqual({ height: 300, squash: 0, stretch: 0, tongue: 0, wobble: 0 })
    expect(motion.step(FRAME)).toBe(false)
  })

  it('counts a long frame as a short one', () => {
    const stalled = new SheetMotion(0, limits)
    stalled.moveTo(300)
    stalled.step(0.5)
    const smooth = new SheetMotion(0, limits)
    smooth.moveTo(300)
    smooth.step(1 / 30)
    expect(stalled.frame().height).toBeCloseTo(smooth.frame().height, 6)
  })
})

describe('the sheet’s box', () => {
  const room: SheetRoom = { ceiling: 600, height: 640, lowest: 150, maxWidth: 640, width: 390 }
  const still = (height: number): SheetFrame => ({ height, squash: 0, stretch: 0, tongue: 0, wobble: 0 })

  it('floats in from the sides and the bottom while short, all four corners round', () => {
    const box = sheetBox(still(300), room)
    expect(box.left).toBe(8)
    expect(box.width).toBe(374)
    expect(box.top).toBe(340)
    expect(box.bottom).toBe(632)
    expect(box.radius).toBe(28)
  })

  it('anchors to the sides and tucks its lower corners under the room at the top stop', () => {
    const box = sheetBox(still(600), room)
    expect(box.left).toBe(0)
    expect(box.width).toBe(390)
    expect(box.top).toBe(40)
    expect(box.bottom).toBe(640 + 28)
  })

  it('anchors gradually over the last stretch under the top', () => {
    const halfway = sheetBox(still(540), room)
    expect(halfway.left).toBeCloseTo(4, 6)
    expect(halfway.bottom).toBeCloseTo(640 - 4 + 14, 6)
  })

  it('slides down whole under the lowest stop instead of getting shorter', () => {
    const atLowest = sheetBox(still(150), room)
    const below = sheetBox(still(40), room)
    expect(below.bottom - below.top).toBeCloseTo(atLowest.bottom - atLowest.top, 6)
    expect(below.top - atLowest.top).toBeCloseTo(110, 6)
    expect(below.width).toBe(atLowest.width)
  })

  it('draws its sides in and rounds its corners when stretched past the top', () => {
    const box = sheetBox({ ...still(640), stretch: 40 }, room)
    expect(box.left).toBeGreaterThan(5)
    expect(box.left).toBeLessThan(14)
    expect(box.radius).toBeGreaterThan(28)
    // The lower corners stay tucked away however round they get.
    expect(box.bottom).toBeGreaterThanOrEqual(640 + box.radius)
  })

  it('lets its sides out when squashed, but no further than the gap it floats in', () => {
    expect(sheetBox({ ...still(120), squash: 6 }, room).left).toBe(5)
    expect(sheetBox({ ...still(100), squash: 60 }, room).left).toBe(0)
  })

  it('quivers its sides with the jelly', () => {
    expect(sheetBox({ ...still(300), wobble: 3 }, room).left).toBe(11)
    expect(sheetBox({ ...still(300), wobble: -3 }, room).left).toBe(5)
  })

  it('stays no wider than its max width, centred in a wide room', () => {
    const box = sheetBox(still(600), { ...room, maxWidth: 560, width: 1200 })
    expect(box.width).toBe(560)
    expect(box.left).toBe(320)
  })
})
