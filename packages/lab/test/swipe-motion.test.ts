import { describe, expect, it } from 'vitest'
import {
  chooseSwipe,
  FLICK_SPEED,
  handleSize,
  SWIPE_THRESHOLD,
  SwipeDeck,
  WaveMotion,
  wavePath,
  waveShape,
  type SwipeSize,
  type WaveFrame,
} from '../src/swipe-motion'

const FRAME = 1 / 60
const size: SwipeSize = { height: 560, width: 390 }

/** Steps `stepper` at 60 fps for `ms` milliseconds, handing each frame to `each`. */
const play = (stepper: { step: (delta: number) => boolean }, ms: number, each?: () => void): void => {
  for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) {
    stepper.step(FRAME)
    each?.()
  }
}

/** The points a path passes through, its control points left out. */
const vertices = (path: string): [number, number][] => {
  const points: [number, number][] = []
  for (const [, command, args] of path.matchAll(/([MLC])([^MLCZ]*)/g)) {
    const numbers = args!.trim().split(/\s+/).map(Number)
    const pairs = command === 'C' ? numbers.slice(4) : numbers
    points.push([pairs[0]!, pairs[1]!])
  }
  return points
}

/** Twice the signed area the points enclose: the sign is the way round they go. */
const winding = (points: [number, number][]): number =>
  points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]!
    return sum + x * nextY - nextX * y
  }, 0)

describe('the wave’s shape', () => {
  const handle = handleSize(size)

  it('is the page’s handle at rest: a small bulge on the edge, where it was asked for', () => {
    expect(waveShape(0, size, { centerY: 280 })).toEqual({ centerY: 280, edge: 0, horRadius: handle.reach, vertRadius: handle.half })
    expect(handle.reach).toBeGreaterThan(30)
    expect(handle.reach).toBeLessThanOrEqual(52)
  })

  it('scales the handle by how much of it is showing', () => {
    const half = waveShape(0, size, { centerY: 280, presence: 0.5 })
    expect(half.horRadius).toBeCloseTo(handle.reach / 2)
    expect(half.vertRadius).toBeCloseTo(handle.half / 2)
    expect(wavePath(waveShape(0, size, { centerY: 280, presence: 0 }), size, 'right')).toBe('')
  })

  it('swells taller and wider as it is pulled in, and follows the finger’s height', () => {
    const shapes = [0, 0.1, 0.2, 0.3, 0.42].map((progress) => waveShape(progress, size, { centerY: 120 }))
    for (let index = 1; index < shapes.length; index += 1) {
      expect(shapes[index]!.horRadius).toBeGreaterThan(shapes[index - 1]!.horRadius)
      expect(shapes[index]!.vertRadius).toBeGreaterThan(shapes[index - 1]!.vertRadius)
      expect(shapes[index]!.centerY).toBe(120)
    }
    // At its widest its flanks run off the top and the bottom.
    expect(shapes.at(-1)!.vertRadius * 2).toBeGreaterThan(size.height)
  })

  it('runs its tip ahead and brings the straight part after it, until the page covers the room', () => {
    let tip = 0
    for (let progress = 0; progress <= 1.0001; progress += 0.05) {
      const shape = waveShape(progress, size, { centerY: 280 })
      expect(shape.edge + shape.horRadius).toBeGreaterThanOrEqual(tip - 1e-9)
      tip = shape.edge + shape.horRadius
      if (progress <= 0.2) expect(shape.edge).toBe(0)
    }
    expect(waveShape(0.6, size, { centerY: 280 }).edge + waveShape(0.6, size, { centerY: 280 }).horRadius).toBeGreaterThan(size.width * 0.8)
    expect(waveShape(1, size, { centerY: 280 })).toMatchObject({ edge: size.width, horRadius: 0 })
  })

  it('dents back in past full, and squeezes small under rest, within bounds', () => {
    expect(waveShape(1.05, size, { centerY: 280 }).horRadius).toBeLessThan(0)
    expect(waveShape(5, size, { centerY: 280 }).horRadius).toBeCloseTo(-size.width * 0.3)
    const squeezed = waveShape(-0.1, size, { centerY: 280 })
    expect(squeezed.horRadius).toBeLessThan(handle.reach)
    expect(squeezed.horRadius).toBeGreaterThan(0)
    expect(waveShape(-2, size, { centerY: 280 }).horRadius).toBe(0)
  })

  it('adds the jelly’s wobble to the bulge, as a share of the width', () => {
    const still = waveShape(0.5, size, { centerY: 280 })
    expect(waveShape(0.5, size, { bulge: 0.02, centerY: 280 }).horRadius).toBeCloseTo(still.horRadius + 0.02 * size.width)
  })
})

describe('the outline', () => {
  const shape = waveShape(0.3, size, { centerY: 200 })

  it('cuts a strip in from the right edge with the bulge’s tip at the finger’s height', () => {
    const points = vertices(wavePath(shape, size, 'right'))
    expect(points[0]![0]).toBeGreaterThan(size.width)
    const tip = points.find(([, y]) => y === 200)!
    expect(tip[0]).toBeCloseTo(size.width - shape.edge - shape.horRadius, 1)
    expect(Math.min(...points.map(([x]) => x))).toBeCloseTo(size.width - shape.edge - shape.horRadius, 1)
  })

  it('mirrors on the left, and winds the same way round so two outlines of one page add up', () => {
    const right = vertices(wavePath(shape, size, 'right'))
    const left = vertices(wavePath(shape, size, 'left'))
    expect(left[0]![0]).toBeLessThan(0)
    expect(left.find(([, y]) => y === 200)![0]).toBeCloseTo(shape.edge + shape.horRadius, 1)
    expect(Math.sign(winding(left))).toBe(Math.sign(winding(right)))
  })

  it('covers the whole room once the page is across', () => {
    const points = vertices(wavePath(waveShape(1, size, { centerY: 280 }), size, 'right'))
    expect(Math.min(...points.map(([x]) => x))).toBeCloseTo(0)
    expect(Math.min(...points.map(([, y]) => y))).toBeLessThan(0)
    expect(Math.max(...points.map(([, y]) => y))).toBeGreaterThan(size.height)
  })
})

describe('choosing whether a release turns the page', () => {
  it('turns it once the wave is past the threshold, let go slowly', () => {
    expect(chooseSwipe(SWIPE_THRESHOLD - 0.01, 0)).toBe(false)
    expect(chooseSwipe(SWIPE_THRESHOLD, 0)).toBe(true)
    expect(chooseSwipe(0.6, 200)).toBe(true)
  })

  it('turns it with a flick however little it has come, and keeps it with a flick back however far', () => {
    expect(chooseSwipe(0.03, FLICK_SPEED)).toBe(true)
    expect(chooseSwipe(0.03, FLICK_SPEED - 1)).toBe(false)
    expect(chooseSwipe(0.8, -FLICK_SPEED)).toBe(false)
  })
})

describe('a wave in motion', () => {
  it('stays wherever a finger holds it', () => {
    const motion = new WaveMotion(280)
    motion.hold(0.25, 280)
    play(motion, 200)
    expect(motion.current).toBe(0.25)
    expect(motion.held).toBe(true)
  })

  it('draws the bulge after the finger’s height a moment behind it', () => {
    const motion = new WaveMotion(280)
    motion.hold(0.2, 100)
    motion.step(FRAME)
    const after = motion.frame().centerY
    expect(after).toBeLessThan(280)
    expect(after).toBeGreaterThan(100)
    play(motion, 400)
    expect(motion.frame().centerY).toBeCloseTo(100, 1)
  })

  it('swings past full when let go across — a dent that closes — and settles there', () => {
    const motion = new WaveMotion(280)
    motion.hold(0.35, 280)
    motion.release(1, 1.5)
    let furthest = 0
    play(motion, 3000, () => {
      furthest = Math.max(furthest, motion.current)
    })
    expect(furthest).toBeGreaterThan(1.02)
    expect(furthest).toBeLessThan(1.3)
    expect(motion.current).toBe(1)
    expect(motion.settled).toBe(true)
  })

  it('springs back to a handle when let go short, squeezing it on the way', () => {
    const motion = new WaveMotion(280)
    motion.hold(0.2, 280)
    motion.release(0, -0.5)
    let lowest = 1
    play(motion, 3000, () => {
      lowest = Math.min(lowest, motion.current)
    })
    expect(lowest).toBeLessThan(0)
    expect(motion.current).toBe(0)
  })

  it('swings further the more wobbly the provider is', () => {
    const swing = (wobbliness: number) => {
      const motion = new WaveMotion(280, { wobbliness })
      motion.release(1, 0)
      let furthest = 0
      play(motion, 2000, () => {
        furthest = Math.max(furthest, motion.current)
      })
      return furthest
    }
    expect(swing(0.8)).toBeGreaterThan(swing(0))
  })

  it('leads with its tip as it races, and sloshes back once it stops', () => {
    const motion = new WaveMotion(280)
    motion.release(1, 0)
    const frames: WaveFrame[] = []
    play(motion, 2000, () => frames.push(motion.frame()))
    expect(Math.max(...frames.map((frame) => frame.bulge))).toBeGreaterThan(0.01)
    expect(Math.min(...frames.map((frame) => frame.bulge))).toBeLessThan(0)
    expect(frames.at(-1)!.bulge).toBe(0)
  })

  it('pops a handle in past its size when it first shows', () => {
    const motion = new WaveMotion(280)
    motion.show(false, true)
    expect(motion.frame().presence).toBe(0)
    motion.show(true)
    let largest = 0
    play(motion, 2000, () => {
      largest = Math.max(largest, motion.frame().presence)
    })
    expect(largest).toBeGreaterThan(1.05)
    expect(motion.frame().presence).toBe(1)
  })

  it('neither wobbles nor pops with motion off', () => {
    const motion = new WaveMotion(280, { liquid: false })
    motion.show(false)
    expect(motion.frame().presence).toBe(0)
    motion.show(true)
    expect(motion.frame().presence).toBe(1)
    motion.hold(0.3, 120)
    expect(motion.frame().centerY).toBe(120)
    motion.release(1, 0)
    play(motion, 1000, () => expect(motion.frame().bulge).toBe(0))
  })

  it('counts a stalled frame as at most a thirtieth of a second', () => {
    const stalled = new WaveMotion(280)
    const smooth = new WaveMotion(280)
    stalled.release(1, 0)
    smooth.release(1, 0)
    stalled.step(1)
    smooth.step(1 / 30)
    expect(stalled.current).toBe(smooth.current)
  })
})

/** A deck of `count` pages on page `index`, with the handles resting at 280. */
const deckOf = (count: number, index = 0, loop = false) => new SwipeDeck(index, { centerY: 280, count, loop })
const pages = (deck: SwipeDeck) => ({ left: deck.waves.left.page, right: deck.waves.right.page })

describe('the deck', () => {
  it('shows the next page on the right and the previous on the left, round the ends when it loops', () => {
    expect(pages(deckOf(4, 0))).toEqual({ left: null, right: 1 })
    expect(pages(deckOf(4, 2))).toEqual({ left: 1, right: 3 })
    expect(pages(deckOf(4, 3))).toEqual({ left: 2, right: null })
    expect(pages(deckOf(4, 3, true))).toEqual({ left: 2, right: 0 })
    expect(pages(deckOf(2, 0, true))).toEqual({ left: 1, right: 1 })
    expect(pages(deckOf(1, 0, true))).toEqual({ left: null, right: null })
  })

  it('brings the next page across from the right, tucks the other handle away, and pops its neighbours’ in', () => {
    const deck = deckOf(4, 1)
    deck.goTo(2)
    expect(deck.waves.right.motion.target).toBe(1)
    play(deck, 120)
    expect(deck.waves.left.motion.frame().presence).toBeLessThan(1)
    let popped = 0
    let landed = Number.NaN
    play(deck, 4000, () => {
      if (deck.base === 2 && Number.isNaN(landed)) landed = deck.waves.right.motion.frame().presence
      if (deck.base === 2) popped = Math.max(popped, deck.waves.right.motion.frame().presence)
    })
    expect(deck.base).toBe(2)
    expect(landed).toBeLessThan(0.5)
    expect(popped).toBeGreaterThan(1)
    expect(pages(deck)).toEqual({ left: 1, right: 3 })
    expect(deck.waves.right.motion.frame().presence).toBe(1)
  })

  it('goes back from the left', () => {
    const deck = deckOf(4, 2)
    deck.goTo(1)
    expect(deck.waves.left.motion.target).toBe(1)
    play(deck, 4000)
    expect(deck.base).toBe(1)
  })

  it('brings a page further away in on one wave', () => {
    const deck = deckOf(5, 0)
    deck.goTo(3)
    expect(deck.waves.right.page).toBe(3)
    const bases = new Set<number>()
    play(deck, 4000, () => bases.add(deck.base))
    expect([...bases]).toEqual([0, 3])
  })

  it('finishes a page already on its way before going on past it', () => {
    const deck = deckOf(5, 0)
    deck.goTo(1)
    play(deck, 120)
    deck.goTo(2)
    expect(deck.waves.right.page).toBe(1)
    const bases: number[] = []
    play(deck, 5000, () => {
      if (bases.at(-1) !== deck.base) bases.push(deck.base)
    })
    expect(bases).toEqual([0, 1, 2])
  })

  it('sends a wave home when the page it brought is no longer wanted', () => {
    const deck = deckOf(4, 0)
    deck.goTo(1)
    play(deck, 120)
    deck.goTo(0)
    play(deck, 4000)
    expect(deck.base).toBe(0)
    expect(deck.waves.right.motion.current).toBe(0)
    expect(deck.waves.right.motion.frame().presence).toBe(1)
  })

  it('goes the way it was told round a loop', () => {
    const deck = deckOf(4, 3, true)
    deck.goTo(0, 'right')
    expect(deck.waves.right.motion.target).toBe(1)
    const back = deckOf(4, 3, true)
    back.goTo(0)
    expect(back.waves.right.motion.target).toBe(1)
    const far = deckOf(4, 0, true)
    far.goTo(3)
    expect(far.waves.left.motion.target).toBe(1)
  })

  it('turns the page when a finger lets go past the threshold, and not short of it', () => {
    const turned = deckOf(4, 1)
    expect(turned.grab()).toBe(0)
    turned.drag(0.4, 200)
    expect(turned.waves.right.motion.held).toBe(true)
    expect(turned.letGo(0, 390)).toBe(2)
    play(turned, 4000)
    expect(turned.base).toBe(2)

    const kept = deckOf(4, 1)
    kept.grab()
    kept.drag(0.1, 200)
    expect(kept.letGo(0, 390)).toBe(1)
    play(kept, 4000)
    expect(kept.base).toBe(1)
    expect(kept.waves.right.motion.frame().centerY).toBe(280)
  })

  it('turns on a flick, and keeps the page on a flick back', () => {
    const flicked = deckOf(4, 1)
    flicked.grab()
    flicked.drag(0.04, 280)
    expect(flicked.letGo(FLICK_SPEED + 100, 390)).toBe(2)
    expect(flicked.waves.right.motion.target).toBe(1)

    const back = deckOf(4, 1)
    back.grab()
    back.drag(0.6, 280)
    expect(back.letGo(-FLICK_SPEED - 100, 390)).toBe(1)
  })

  it('pulls the previous page in from the left, and the side follows which way the finger has gone', () => {
    const deck = deckOf(4, 1)
    deck.grab()
    deck.drag(0.2, 280)
    expect(deck.waves.right.motion.held).toBe(true)
    deck.drag(-0.35, 280)
    expect(deck.waves.right.motion.held).toBe(false)
    expect(deck.waves.left.motion.held).toBe(true)
    expect(deck.waves.left.motion.current).toBe(0.35)
    expect(deck.letGo(0, 390)).toBe(0)
  })

  it('holds nothing toward a side with no page', () => {
    const deck = deckOf(3, 0)
    deck.grab()
    deck.drag(-0.5, 280)
    expect(deck.waves.left.motion.held).toBe(false)
    expect(deck.letGo(0, 390)).toBe(0)
  })

  it('catches a wave on its way and lets one all but across in', () => {
    const caught = deckOf(4, 0)
    caught.goTo(1)
    play(caught, 50)
    const where = caught.waves.right.motion.current
    expect(where).toBeGreaterThan(0)
    expect(where).toBeLessThan(0.9)
    expect(caught.grab()).toBe(where)

    const across = deckOf(4, 0)
    across.goTo(1)
    while (across.waves.right.motion.current < 0.95) across.step(FRAME)
    expect(across.grab()).toBe(0)
    expect(across.base).toBe(1)
  })

  it('lands at once with motion off', () => {
    const deck = new SwipeDeck(0, { centerY: 280, count: 4, liquid: false })
    deck.goTo(2)
    deck.finish()
    expect(deck.base).toBe(2)
    expect(pages(deck)).toEqual({ left: 1, right: 3 })
    expect(deck.waves.left.motion.frame().presence).toBe(1)
    expect(deck.step(FRAME)).toBe(false)
  })

  it('pops in a handle that a new loop setting gives a page', () => {
    const deck = deckOf(3, 0)
    expect(deck.waves.left.motion.frame().presence).toBe(0)
    deck.configure(3, true)
    expect(deck.waves.left.page).toBe(2)
    play(deck, 2000)
    expect(deck.waves.left.motion.frame().presence).toBe(1)
  })
})
