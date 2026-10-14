import { describe, expect, it } from 'vitest'
import { DropletChoreography, dropletAngles, dropletOffsets, dropletRadius } from '../src/droplet-motion'

/** Steps the timeline at 60 fps from `from` for `ms` milliseconds and returns the clock. */
const play = (choreography: DropletChoreography, from: number, ms: number): number => {
  let now = from
  for (const end = from + ms; now < end;) {
    now += 1000 / 60
    choreography.step(1 / 60)
  }
  return now
}

const offsets = dropletOffsets(4, 'around', 100)

describe('droplet layout', () => {
  it('rings the trigger from twelve o’clock without doubling up the last droplet', () => {
    expect(dropletAngles(4, 'around')).toEqual([-90, 0, 90, 180])
  })

  it('lays an arc out clockwise from one end to the other', () => {
    expect(dropletAngles(3, 'top')).toEqual([180, 270, 360])
    expect(dropletAngles(3, 'top-left')).toEqual([180, 225, 270])
  })

  it('puts a single droplet in the middle of its arc', () => {
    expect(dropletAngles(1, 'top')).toEqual([270])
  })

  it('places droplets on whole hundredths of a pixel', () => {
    expect(dropletOffsets(4, 'around', 100)).toEqual([
      { x: 0, y: -100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: -100, y: 0 },
    ])
  })

  it('keeps neighbours and the trigger apart at the default radius', () => {
    const size = 46
    const trigger = 56
    for (const placement of ['around', 'top', 'top-left'] as const) {
      for (const count of [1, 3, 6, 10]) {
        const radius = dropletRadius(count, placement, size, trigger)
        const points = dropletOffsets(count, placement, radius)
        expect(radius).toBeGreaterThanOrEqual(trigger / 2 + size / 2)
        for (let index = 1; index < points.length; index += 1) {
          const a = points[index - 1]!
          const b = points[index]!
          expect(Math.hypot(a.x - b.x, a.y - b.y), `${placement} × ${count}`).toBeGreaterThanOrEqual(size)
        }
      }
    }
  })
})

describe('droplet choreography', () => {
  it('starts with every droplet inside the trigger', () => {
    const choreography = new DropletChoreography(3)
    for (let index = 0; index < 3; index += 1) expect(choreography.droplet(index).scale).toBe(0)
    expect(choreography.absorbed).toBe(true)
  })

  it('sends droplets out one at a time rather than all at once', () => {
    const choreography = new DropletChoreography(4, { stagger: 100 })
    choreography.open(offsets)
    play(choreography, 0, 50)

    // Halfway to the second droplet's turn, only the first has left.
    expect(choreography.droplet(0).scale).toBeGreaterThan(0)
    expect(choreography.droplet(1).scale).toBe(0)
    expect(choreography.droplet(3).scale).toBe(0)

    play(choreography, 50, 170)
    expect(choreography.droplet(1).scale).toBeGreaterThan(0)
    expect(choreography.droplet(2).scale).toBeGreaterThan(0)
    expect(choreography.droplet(3).scale).toBe(0)
  })

  // Mounting the glass can hold the main thread for half a second. On a wall
  // clock every droplet would be overdue after that and leave together.
  it('keeps them one at a time through a stalled frame', () => {
    const choreography = new DropletChoreography(4, { stagger: 100 })
    choreography.open(offsets)
    choreography.step(0.5)
    expect(choreography.droplet(0).scale).toBeGreaterThan(0)
    expect(choreography.droplet(1).scale).toBe(0)
  })

  it('buds a droplet off at a visible size instead of growing it from nothing', () => {
    const choreography = new DropletChoreography(1)
    choreography.open(offsets)
    choreography.step(1 / 240)
    expect(choreography.droplet(0).scale).toBeGreaterThan(0.25)
  })

  it('swings past its place before it settles there', () => {
    const choreography = new DropletChoreography(1, { wobbliness: 0.1 })
    choreography.open([{ x: 100, y: 0 }])
    let furthest = 0
    let now = 0
    for (let frame = 0; frame < 120; frame += 1) {
      now += 1000 / 60
      choreography.step(1 / 60)
      furthest = Math.max(furthest, choreography.droplet(0).x)
    }
    expect(furthest).toBeGreaterThan(104)
    expect(choreography.droplet(0).x).toBeCloseTo(100, 0)
  })

  it('stretches along the way it is travelling and is round at rest', () => {
    const choreography = new DropletChoreography(1)
    choreography.open([{ x: 0, y: -120 }])
    play(choreography, 0, 60)
    const flying = choreography.droplet(0)
    expect(flying.stretch).toBeGreaterThan(1.1)
    expect(flying.angle).toBeCloseTo(-90, 0)

    play(choreography, 60, 3000)
    expect(choreography.droplet(0).stretch).toBeCloseTo(1, 2)
  })

  it('squashes the trigger as each droplet leaves', () => {
    const choreography = new DropletChoreography(2, { stagger: 200 })
    choreography.open(offsets)
    play(choreography, 0, 50)
    expect(choreography.trigger().scaleY).toBeLessThan(0.99)
    expect(choreography.trigger().scaleX).toBeGreaterThan(1.01)
  })

  it('calls droplets home last first and reports when all of them are in', () => {
    const choreography = new DropletChoreography(3, { stagger: 100 })
    choreography.open(offsets)
    let now = play(choreography, 0, 2000)
    expect(choreography.absorbed).toBe(false)

    choreography.close()
    now = play(choreography, now, 60)
    const out = (index: number) => Math.hypot(choreography.droplet(index).x, choreography.droplet(index).y)
    // The last droplet has started home; the first is still where it landed.
    expect(out(2)).toBeLessThan(out(0))
    expect(out(0)).toBeCloseTo(100, 0)

    play(choreography, now, 2000)
    expect(choreography.absorbed).toBe(true)
    for (let index = 0; index < 3; index += 1) expect(choreography.droplet(index).scale).toBe(0)
  })

  it('stays a visible bud until it is nearly home', () => {
    const choreography = new DropletChoreography(1)
    choreography.open([{ x: 100, y: 0 }])
    let now = play(choreography, 0, 2000)
    choreography.close()
    while (choreography.droplet(0).x > 40) {
      now += 1000 / 60
      choreography.step(1 / 60)
    }
    expect(choreography.droplet(0).scale).toBeGreaterThan(0.3)
  })

  it('turns a droplet round mid-flight when the menu reopens', () => {
    const choreography = new DropletChoreography(1)
    choreography.open([{ x: 100, y: 0 }])
    let now = play(choreography, 0, 2000)
    choreography.close()
    now = play(choreography, now, 80)
    const partway = choreography.droplet(0).x
    expect(partway).toBeLessThan(100)
    expect(partway).toBeGreaterThan(0)

    choreography.open([{ x: 100, y: 0 }])
    play(choreography, now, 2000)
    expect(choreography.droplet(0).x).toBeCloseTo(100, 0)
    expect(choreography.droplet(0).scale).toBeCloseTo(1, 2)
  })

  it('lands everything at once when settled, for reduced motion', () => {
    const choreography = new DropletChoreography(4)
    choreography.open(offsets)
    choreography.settle()
    expect(choreography.droplet(3)).toEqual({ angle: 0, scale: 1, stretch: 1, x: -100, y: 0 })

    choreography.close()
    choreography.settle()
    expect(choreography.absorbed).toBe(true)
  })

  it('moves landed droplets when retargeted without launching them again', () => {
    const choreography = new DropletChoreography(1)
    choreography.open([{ x: 100, y: 0 }])
    const now = play(choreography, 0, 2000)
    const squash = choreography.trigger().scaleY
    choreography.retarget([{ x: 0, y: 140 }])
    play(choreography, now, 2000)
    expect(choreography.droplet(0).y).toBeCloseTo(140, 0)
    expect(choreography.trigger().scaleY).toBeCloseTo(squash, 3)
  })
})
