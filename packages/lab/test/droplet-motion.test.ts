import { describe, expect, it } from 'vitest'
import { DropletChoreography, dropletAngles, dropletOffsets, dropletRadius, type DropletPoint } from '../src/droplet-motion'

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

/** A choreography with every droplet out and at rest, at 46px droplets 100px from the trigger. */
const landed = (places: DropletPoint[] = offsets, options = {}): DropletChoreography => {
  const choreography = new DropletChoreography(places.length, { stagger: 0, ...options })
  choreography.open(places)
  play(choreography, 0, 2000)
  return choreography
}

const SIZE = 46

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

describe('droplets in a line', () => {
  it('stacks a column above the trigger reading top to bottom, a radius apart', () => {
    expect(dropletOffsets(3, 'top', 60, 'line')).toEqual([
      { x: 0, y: -180 },
      { x: 0, y: -120 },
      { x: 0, y: -60 },
    ])
  })

  it('stacks a column below the trigger from the trigger down', () => {
    expect(dropletOffsets(3, 'bottom', 60, 'line')).toEqual([
      { x: 0, y: 60 },
      { x: 0, y: 120 },
      { x: 0, y: 180 },
    ])
  })

  it('lines a row up left to right on either side', () => {
    expect(dropletOffsets(3, 'right', 60, 'line')).toEqual([
      { x: 60, y: 0 },
      { x: 120, y: 0 },
      { x: 180, y: 0 },
    ])
    expect(dropletOffsets(3, 'left', 60, 'line')).toEqual([
      { x: -180, y: 0 },
      { x: -120, y: 0 },
      { x: -60, y: 0 },
    ])
  })

  it('runs a corner’s line out diagonally, and treats around as top', () => {
    const [far, near] = dropletOffsets(2, 'top-left', 60, 'line')
    expect(near!.x).toBeCloseTo(-42.43, 2)
    expect(near!.y).toBeCloseTo(-42.43, 2)
    expect(Math.hypot(far!.x, far!.y)).toBeCloseTo(120, 1)
    expect(dropletOffsets(2, 'around', 60, 'line')).toEqual(dropletOffsets(2, 'top', 60, 'line'))
  })

  it('spaces a line to clear the trigger and each neighbour, whatever the count', () => {
    for (const count of [1, 3, 8]) {
      const radius = dropletRadius(count, 'top', SIZE, 56, 'line')
      expect(radius).toBeGreaterThanOrEqual(56 / 2 + SIZE / 2 + 14)
      expect(radius).toBeGreaterThanOrEqual(SIZE + 14)
    }
  })

  // Every droplet leaves from the trigger, so on a line one leaving after
  // another would have to pass through it. The far end leaves first instead,
  // and each one after pushes those already out one place along.
  it('pushes the droplets out far end first, with none passing another', () => {
    const places = dropletOffsets(4, 'top', 65, 'line')
    const choreography = new DropletChoreography(4, { stagger: 120 })
    choreography.open(places, 'line')

    choreography.step(1 / 60)
    expect(choreography.droplet(0).scale).toBeGreaterThan(0)
    expect(choreography.droplet(3).scale).toBe(0)

    const along = (index: number) => -choreography.droplet(index).y
    for (let frame = 0; frame < 120; frame += 1) {
      choreography.step(1 / 60)
      for (let index = 1; index < 4; index += 1) {
        if (choreography.droplet(index).scale === 0) continue
        // Whatever is out stays in order up the column and never overlaps.
        expect(along(index - 1) - along(index)).toBeGreaterThan(SIZE * 0.75)
      }
    }
    places.forEach((place, index) => expect(choreography.droplet(index).y).toBeCloseTo(place.y, 0))
  })

  it('takes the nearest home first and closes the rest up behind it', () => {
    const places = dropletOffsets(3, 'top', 65, 'line')
    const choreography = new DropletChoreography(3, { stagger: 150 })
    choreography.open(places, 'line')
    let now = play(choreography, 0, 2000)
    choreography.close()
    now = play(choreography, now, 100)

    // The nearest is on its way in; the others have started down after it.
    expect(-choreography.droplet(2).y).toBeLessThan(40)
    expect(-choreography.droplet(1).y).toBeLessThan(125)
    expect(-choreography.droplet(0).y).toBeLessThan(190)
    play(choreography, now, 2000)
    expect(choreography.absorbed).toBe(true)
  })
})

describe('the magnet', () => {
  const pullOn = (choreography: DropletChoreography, index: number, place: DropletPoint) => {
    const frame = choreography.droplet(index)
    return { x: frame.x - place.x, y: frame.y - place.y }
  }

  it('draws a droplet toward a pointer near it, most strongly at its rim', () => {
    const place = { x: 0, y: -100 }
    const pulls = [0, 10, 23, 60, 100].map((distance) => {
      const choreography = landed([place])
      choreography.attract({ x: 0, y: -100 - distance }, SIZE)
      play(choreography, 0, 2000)
      return -pullOn(choreography, 0, place).y
    })
    const [centre, inside, rim, near, far] = pulls
    expect(centre).toBeCloseTo(0, 3)
    expect(inside).toBeGreaterThan(2)
    expect(rim).toBeGreaterThan(inside!)
    expect(rim).toBeGreaterThan(6)
    expect(rim).toBeLessThan(SIZE / 4)
    expect(near).toBeLessThan(rim!)
    expect(near).toBeGreaterThan(1)
    expect(far).toBeCloseTo(0, 3)
  })

  it('draws only the droplet nearest the pointer, so two never reach for it at once', () => {
    const places = dropletOffsets(3, 'top', 65, 'line')
    const choreography = new DropletChoreography(3, { stagger: 0 })
    choreography.open(places, 'line')
    play(choreography, 0, 2000)
    // Between the two upper droplets, a little nearer the top one.
    choreography.attract({ x: 0, y: -165 }, SIZE)
    play(choreography, 0, 2000)
    expect(choreography.droplet(0).y).toBeGreaterThan(places[0]!.y + 3)
    expect(choreography.droplet(1).y).toBeCloseTo(places[1]!.y, 3)
    // The gap the glass would bridge at 10px stays open.
    expect(choreography.droplet(1).y - choreography.droplet(0).y - SIZE).toBeGreaterThan(10)
  })

  it('leans a droplet toward the pointer as well as moving it', () => {
    const choreography = landed([{ x: 100, y: 0 }])
    choreography.attract({ x: 140, y: 0 }, SIZE)
    play(choreography, 0, 2000)
    const frame = choreography.droplet(0)
    expect(frame.stretch).toBeGreaterThan(1.05)
    expect(Math.abs(frame.angle)).toBeLessThan(1)
  })

  it('springs back past its place when the pointer goes, then rests there', () => {
    const place = { x: 0, y: -100 }
    const choreography = landed([place])
    choreography.attract({ x: 0, y: -130 }, SIZE)
    play(choreography, 0, 2000)
    choreography.attract(null)
    let past = 0
    for (let frame = 0; frame < 120; frame += 1) {
      choreography.step(1 / 60)
      past = Math.max(past, pullOn(choreography, 0, place).y)
    }
    expect(past).toBeGreaterThan(1)
    expect(pullOn(choreography, 0, place).y).toBeCloseTo(0, 2)
  })

  it('leaves alone droplets that are not out, and any it is told to', () => {
    const choreography = new DropletChoreography(2, { stagger: 1000 })
    choreography.open([{ x: 0, y: -100 }, { x: 100, y: 0 }])
    choreography.step(1 / 60)
    choreography.attract({ x: 0, y: 0 }, SIZE)
    play(choreography, 0, 500)
    expect(choreography.droplet(1).scale).toBe(0)
    expect(choreography.droplet(1).x).toBe(0)

    const settled = landed()
    settled.attract({ x: 0, y: -130 }, SIZE, (index) => index !== 0)
    play(settled, 0, 2000)
    expect(settled.droplet(0).y).toBeCloseTo(-100, 2)
  })
})

describe('highlighting and choosing', () => {
  it('swells the highlighted droplet a little and lets it go back down', () => {
    const choreography = landed()
    choreography.highlight(1)
    play(choreography, 0, 1000)
    expect(choreography.droplet(1).scale).toBeGreaterThan(1.05)
    expect(choreography.droplet(1).scale).toBeLessThan(1.2)
    expect(choreography.droplet(0).scale).toBeCloseTo(1, 3)

    choreography.highlight(-1)
    play(choreography, 0, 1000)
    expect(choreography.droplet(1).scale).toBeCloseTo(1, 3)
  })

  it('bounces the chosen droplet big and hands the choice back once it has', () => {
    const choreography = landed()
    expect(choreography.choose(2)).toBe(true)
    expect(choreography.choosing).toBe(true)

    let peak = 0
    let handedBack = -1
    let at = 0
    for (let frame = 1; handedBack < 0 && frame < 120; frame += 1) {
      choreography.step(1 / 60)
      peak = Math.max(peak, choreography.droplet(2).scale)
      handedBack = choreography.takeChoice()
      at = (frame * 1000) / 60
    }
    expect(peak).toBeGreaterThan(1.25)
    expect(handedBack).toBe(2)
    // Not before the bounce has come back down.
    expect(at).toBeGreaterThanOrEqual(200)
    expect(at).toBeLessThan(400)
    expect(choreography.choosing).toBe(false)
    expect(choreography.takeChoice()).toBe(-1)
  })

  it('refuses a second choice while one is bouncing', () => {
    const choreography = landed()
    choreography.choose(0)
    expect(choreography.choose(1)).toBe(false)
    play(choreography, 0, 1000)
    expect(choreography.takeChoice()).toBe(0)
    expect(choreography.takeChoice()).toBe(-1)
  })

  it('times the bounce on its own clock, so a stalled frame cannot cut it short', () => {
    const choreography = landed()
    choreography.choose(0)
    choreography.step(0.5)
    expect(choreography.takeChoice()).toBe(-1)
  })

  it('will not choose a droplet that is not out', () => {
    const choreography = new DropletChoreography(2)
    expect(choreography.choose(0)).toBe(false)
  })

  it('hands a choice back at once when settled, for motion off', () => {
    const choreography = landed()
    choreography.choose(1)
    choreography.settle()
    expect(choreography.takeChoice()).toBe(1)
  })
})

describe('finding the droplet under a point', () => {
  it('finds the one drawn there, with a little slop at its rim', () => {
    const choreography = landed()
    expect(choreography.dropletAt({ x: 0, y: -100 }, SIZE)).toBe(0)
    expect(choreography.dropletAt({ x: 100 + SIZE / 2 + 2, y: 0 }, SIZE)).toBe(1)
    expect(choreography.dropletAt({ x: 50, y: -50 }, SIZE)).toBe(-1)
    expect(choreography.dropletAt({ x: 0, y: 0 }, SIZE)).toBe(-1)
  })

  it('ignores a droplet still budding off the trigger', () => {
    const choreography = new DropletChoreography(1)
    choreography.open([{ x: 0, y: -100 }])
    choreography.step(1 / 60)
    const { x, y } = choreography.droplet(0)
    expect(choreography.dropletAt({ x, y }, SIZE)).toBe(-1)
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
