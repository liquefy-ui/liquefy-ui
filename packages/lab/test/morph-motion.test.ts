import { describe, expect, it } from 'vitest'
import { GlassMorph, type MorphBox, type MorphFrame } from '../src/morph-motion'

const BUTTON: MorphBox = { height: 46, radius: 23, width: 46 }
const BAR: MorphBox = { height: 48, radius: 24, width: 300 }
const PANEL: MorphBox = { height: 320, radius: 24, width: 300 }

/** Steps the morph at 60 fps for `ms` milliseconds and hands back every frame. */
const play = (morph: GlassMorph, ms: number): MorphFrame[] => {
  const frames: MorphFrame[] = []
  for (let elapsed = 0; elapsed < ms; elapsed += 1000 / 60) {
    morph.step(1 / 60)
    frames.push(morph.frame())
  }
  return frames
}

/** Steps until nothing is moving, failing rather than spinning forever. */
const settleByStepping = (morph: GlassMorph): MorphFrame[] => {
  const frames: MorphFrame[] = []
  for (let frame = 0; frame < 600; frame += 1) {
    const busy = morph.step(1 / 60)
    frames.push(morph.frame())
    if (!busy) return frames
  }
  throw new Error('the morph never came to rest')
}

describe('GlassMorph', () => {
  it('starts at rest in the shape it is given, its content showing', () => {
    const morph = new GlassMorph(BUTTON)
    expect(morph.settled).toBe(true)
    expect(morph.frame()).toMatchObject({ bounce: 1, conceal: 0, height: 46, radius: 23, reveal: 1, width: 46 })
  })

  it('swings past a bigger shape and settles back onto it', () => {
    const morph = new GlassMorph(BUTTON, { wobbliness: 0.1 })
    morph.morphTo(PANEL)
    const frames = settleByStepping(morph)
    const widest = Math.max(...frames.map((frame) => frame.width))
    const tallest = Math.max(...frames.map((frame) => frame.height))
    expect(widest).toBeGreaterThan(PANEL.width * 1.03)
    expect(tallest).toBeGreaterThan(PANEL.height * 1.03)
    // Past it, not wildly past it.
    expect(widest).toBeLessThan(PANEL.width * 1.2)
    expect(morph.frame()).toMatchObject({ height: 320, radius: 24, width: 300 })
    expect(morph.settled).toBe(true)
  })

  it('rings for longer the wobblier the provider asks it to be', () => {
    const overshoot = (wobbliness: number) => {
      const morph = new GlassMorph(BUTTON, { wobbliness })
      morph.morphTo(BAR)
      return Math.max(...settleByStepping(morph).map((frame) => frame.width)) - BAR.width
    }
    expect(overshoot(1)).toBeGreaterThan(overshoot(0.1) * 2)
  })

  it('spreads sideways before it drops when it grows', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(PANEL)
    const early = play(morph, 50).at(-1)!
    expect(early.width).toBeGreaterThan(80)
    // The height has not been told to move yet.
    expect(early.height).toBeLessThanOrEqual(46)

    const later = play(morph, 150).at(-1)!
    expect(later.height).toBeGreaterThan(80)
  })

  it('pulls its height in before its width when it shrinks', () => {
    const morph = new GlassMorph(PANEL)
    morph.morphTo(BUTTON)
    const early = play(morph, 50).at(-1)!
    expect(early.height).toBeLessThan(260)
    expect(early.width).toBeGreaterThanOrEqual(299)

    play(morph, 150)
    expect(morph.frame().width).toBeLessThan(260)
  })

  // Mounting glass can hold the main thread for half a second. On the wall
  // clock the second axis would be overdue and start alongside the first.
  it('keeps one axis behind the other through a stalled frame', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(PANEL)
    morph.step(0.5)
    expect(morph.frame().width).toBeGreaterThan(46)
    expect(morph.frame().height).toBeLessThanOrEqual(46)
  })

  it('keeps the origin point where it is on every frame', () => {
    const corner = new GlassMorph(BUTTON, { origin: 'top-left' })
    corner.morphTo(PANEL)
    for (const frame of settleByStepping(corner)) {
      expect(frame.x - frame.width / 2).toBeCloseTo(0, 6)
      expect(frame.y - frame.height / 2).toBeCloseTo(0, 6)
    }

    const top = new GlassMorph(BUTTON, { origin: 'top' })
    top.morphTo(PANEL)
    for (const frame of settleByStepping(top)) {
      expect(frame.x).toBe(0)
      expect(frame.y - frame.height / 2).toBeCloseTo(0, 6)
    }

    const opposite = new GlassMorph(BUTTON, { origin: 'bottom-right' })
    opposite.morphTo(PANEL)
    for (const frame of settleByStepping(opposite)) {
      expect(frame.x + frame.width / 2).toBeCloseTo(0, 6)
      expect(frame.y + frame.height / 2).toBeCloseTo(0, 6)
    }
  })

  it('fades the old content out at once and the new in once the glass has made room', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(PANEL)
    expect(morph.frame()).toMatchObject({ conceal: 1, reveal: 0 })

    const frames = play(morph, 160)
    // Gone within a few frames…
    expect(frames.at(-1)!.conceal).toBe(0)
    // …while the new content waited for the glass to grow under it.
    const firstShown = frames.findIndex((frame) => frame.reveal > 0)
    expect(firstShown).toBeGreaterThan(3)
    expect(frames[firstShown]!.width * frames[firstShown]!.height).toBeGreaterThan(PANEL.width * PANEL.height * 0.2)

    settleByStepping(morph)
    expect(morph.frame()).toMatchObject({ conceal: 0, reveal: 1 })
  })

  it('crosses content over in place when the shape does not change', () => {
    const morph = new GlassMorph(BAR)
    morph.morphTo(BAR)
    const frames = settleByStepping(morph)
    expect(frames.some((frame) => frame.reveal > 0 && frame.reveal < 1)).toBe(true)
    expect(morph.frame().reveal).toBe(1)
  })

  it('leaves the content alone when asked only to move the glass', () => {
    const morph = new GlassMorph(BAR)
    morph.morphTo(PANEL, { swap: false })
    for (const frame of settleByStepping(morph)) expect(frame).toMatchObject({ conceal: 0, reveal: 1 })
  })

  it('lands with a pop when asked to, and only then', () => {
    const bouncing = new GlassMorph({ height: 36, radius: 18, width: 240 })
    bouncing.morphTo({ height: 36, radius: 18, width: 36 }, { bounce: true })
    const frames = settleByStepping(bouncing)
    expect(Math.max(...frames.map((frame) => frame.bounce))).toBeGreaterThan(1.06)
    expect(bouncing.frame().bounce).toBe(1)

    const plain = new GlassMorph({ height: 36, radius: 18, width: 240 })
    plain.morphTo({ height: 36, radius: 18, width: 36 })
    expect(Math.max(...settleByStepping(plain).map((frame) => frame.bounce))).toBe(1)
  })

  it('pops new content in place, but not a shape it is already in', () => {
    const swapped = new GlassMorph(BUTTON)
    swapped.morphTo(BUTTON, { bounce: true })
    expect(Math.max(...settleByStepping(swapped).map((frame) => frame.bounce))).toBeGreaterThan(1.06)

    const unchanged = new GlassMorph(BUTTON)
    unchanged.morphTo(BUTTON, { bounce: true, swap: false })
    expect(Math.max(...settleByStepping(unchanged).map((frame) => frame.bounce))).toBe(1)
  })

  it('rounds its corners off while it moves and tightens them at rest', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(PANEL)
    const frames = play(morph, 300)
    const roundest = Math.max(...frames.filter((frame) => frame.height > 100).map((frame) => frame.radius))
    expect(roundest).toBeGreaterThan(PANEL.radius + 8)
    settleByStepping(morph)
    expect(morph.frame().radius).toBe(PANEL.radius)
  })

  it('thins as it spreads, the way a drop pulled sideways does', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(BAR)
    const thinnest = Math.min(...play(morph, 120).map((frame) => frame.height))
    expect(thinnest).toBeLessThan(BUTTON.height - 2)
  })

  it('turns round mid-morph from where it is, with the speed it has', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(PANEL)
    play(morph, 120)
    const turned = morph.frame().width
    morph.morphTo(BUTTON)
    morph.step(1 / 60)
    // Still carried a little further out before it heads home.
    expect(morph.frame().width).toBeGreaterThan(turned - 1)
    settleByStepping(morph)
    expect(morph.frame()).toMatchObject({ height: 46, width: 46 })
  })

  it('resizes for content that changes size, without replaying a morph', () => {
    const morph = new GlassMorph(PANEL)
    morph.resize({ ...PANEL, height: 200 })
    const frames = settleByStepping(morph)
    expect(frames.every((frame) => frame.reveal === 1 && frame.conceal === 0)).toBe(true)
    expect(morph.frame().height).toBe(200)
  })

  it('jumps straight to its shape when settled, for motion off', () => {
    const morph = new GlassMorph(BUTTON)
    morph.morphTo(PANEL, { bounce: true })
    morph.step(1 / 60)
    morph.settle()
    expect(morph.settled).toBe(true)
    expect(morph.frame()).toMatchObject({ bounce: 1, conceal: 0, height: 320, radius: 24, reveal: 1, width: 300 })
    expect(morph.step(1 / 60)).toBe(false)
  })
})
