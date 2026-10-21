/**
 * The motions behind the icon effects, as plain functions of time with no DOM.
 *
 * Every effect is a spring or a curve worked out in closed form and sampled into
 * keyframes for the Web Animations API. The browser then plays them on its own
 * clock, off the main thread for transforms, so a busy frame elsewhere on the
 * page — a large glass mounting, a list re-rendering — cannot stall the bounce
 * it set off.
 */

/** A spring the way SwiftUI describes one: seconds per swing, and how much of each swing it loses. */
export type Spring = {
  /** Damping ratio: below 1 it overshoots and rings, 1 settles as fast as it can without. */
  damping: number
  /** The period of one swing when undamped, in seconds. */
  response: number
}

/**
 * Where a spring is, and how fast it is going, `seconds` after being let go at
 * `from` with `velocity` (units a second), heading for 0.
 */
export const springAt = (
  { damping, response }: Spring,
  from: number,
  velocity: number,
  seconds: number,
): { velocity: number; value: number } => {
  const natural = (2 * Math.PI) / response
  if (damping < 1) {
    const decay = damping * natural
    const ringing = natural * Math.sqrt(1 - damping * damping)
    const a = from
    const b = (velocity + decay * from) / ringing
    const envelope = Math.exp(-decay * seconds)
    const cos = Math.cos(ringing * seconds)
    const sin = Math.sin(ringing * seconds)
    return {
      value: envelope * (a * cos + b * sin),
      velocity: envelope * ((b * ringing - decay * a) * cos - (a * ringing + decay * b) * sin),
    }
  }
  const envelope = Math.exp(-natural * seconds)
  const b = velocity + natural * from
  return {
    value: envelope * (from + b * seconds),
    velocity: envelope * (b - natural * (from + b * seconds)),
  }
}

/**
 * Seconds until the spring stays within `tolerance` of 0, moving slower than
 * ten tolerances a second: when the rest of it would not move a pixel.
 */
export const settleTime = (spring: Spring, from: number, velocity: number, tolerance: number): number => {
  const step = 1 / 120
  let quiet = 0
  for (let seconds = 0; seconds < 4; seconds += step) {
    const state = springAt(spring, from, velocity, seconds)
    if (Math.abs(state.value) < tolerance && Math.abs(state.velocity) < tolerance * 10) {
      quiet += step
      // A spring that rings passes through 0 at speed, so it has to stay quiet a while.
      if (quiet >= 0.1) return Math.max(0, seconds - quiet + step)
    } else {
      quiet = 0
    }
  }
  return 4
}

/**
 * A spring kicked from rest, scaled so its first swing peaks at 1, and the
 * milliseconds until its swings are a hundredth of that. The shape of a shake:
 * straight out, back past the start, smaller each time.
 */
const kick = (spring: Spring): { at: (seconds: number) => number; duration: number } => {
  const natural = (2 * Math.PI) / spring.response
  const decay = spring.damping * natural
  const ringing = natural * Math.sqrt(1 - spring.damping * spring.damping)
  const peakAt = Math.atan2(ringing, decay) / ringing
  const velocity = 1 / springAt(spring, 0, 1, peakAt).value
  return {
    at: (seconds) => springAt(spring, 0, velocity, seconds).value,
    duration: settleTime(spring, 0, velocity, 0.01) * 1000,
  }
}

/** How the icon sits at one moment. Travel is a share of the icon's own size, so it reads the same at 16px and 64px. */
export type Pose = {
  /**
   * Where scaling pulls toward, from the centre: 0.5 is the bottom edge, which
   * is what something standing on a floor squashes against.
   */
  anchor: number
  /** Degrees clockwise about the centre. */
  rotate: number
  scaleX: number
  scaleY: number
  /** Travel to the right, as a share of the icon's width. */
  x: number
  /** Travel downward, as a share of the icon's height. */
  y: number
}

export const REST: Pose = { anchor: 0, rotate: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }

const round = (value: number, places = 4): number => {
  const factor = 10 ** places
  const rounded = Math.round(value * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

/**
 * A pose as a CSS transform. Every pose is written with the same five
 * functions, so the browser blends between keyframes function by function
 * rather than through a matrix, which would lose the turns of a spin.
 */
export const poseTransform = ({ anchor, rotate, scaleX, scaleY, x, y }: Pose): string => {
  const pivot = round(anchor * 100, 2)
  return `translate(${round(x * 100, 3)}%, ${round(y * 100, 3)}%) rotate(${round(rotate, 3)}deg) translate(0%, ${pivot}%) scale(${round(scaleX)}, ${round(scaleY)}) translate(0%, ${-pivot}%)`
}

/** A motion over time: the pose `ms` milliseconds in, for `duration` milliseconds. */
export type Track = {
  at: (ms: number) => Pose
  duration: number
}

/** The track played `speed` times as fast. */
export const atSpeed = (track: Track, speed: number): Track => {
  const rate = speed > 0 && Number.isFinite(speed) ? speed : 1
  return { at: (ms) => track.at(ms * rate), duration: track.duration / rate }
}

/** The track followed by `rest` milliseconds of stillness, the cycle a repeating effect loops. */
export const withRest = (track: Track, rest: number): Track => ({
  at: (ms) => (ms < track.duration ? track.at(ms) : REST),
  duration: track.duration + rest,
})

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)

export type BounceDirection = 'down' | 'up'

const BOUNCE_SPRING: Spring = { damping: 0.4, response: 0.34 }
const BOUNCE_CROUCH_MS = 80
const BOUNCE_CROUCH = 0.16
const BOUNCE_LAUNCH = 7.5

/**
 * A hop. `up` crouches into the floor, leaps, lands with a smaller squash and
 * wobbles still; `down` is pressed into the floor and springs back up past
 * where it started. One spring drives it: below zero the icon squashes against
 * its bottom edge and widens, above zero it travels and stretches thin.
 */
export const bounceTrack = (direction: BounceDirection = 'up'): Track => {
  const up = direction === 'up'
  const height = (ms: number): number => {
    if (ms < BOUNCE_CROUCH_MS) return (up ? -1 : 1) * BOUNCE_CROUCH * easeOut(ms / BOUNCE_CROUCH_MS)
    return springAt(
      BOUNCE_SPRING,
      (up ? -1 : 1) * BOUNCE_CROUCH,
      up ? BOUNCE_LAUNCH : -BOUNCE_LAUNCH * 0.35,
      (ms - BOUNCE_CROUCH_MS) / 1000,
    ).value
  }
  const settle = settleTime(BOUNCE_SPRING, BOUNCE_CROUCH, BOUNCE_LAUNCH, 0.002) * 1000

  return {
    at: (ms) => {
      const value = height(ms)
      // Positive is into the floor for `down`, off it for `up`; flip `down` so
      // the same two branches read "squashed" and "in the air" for both.
      const lift = up ? value : -value
      if (lift < 0) {
        return { ...REST, anchor: 0.5, scaleX: 1 - lift * 0.55, scaleY: 1 + lift, y: up ? 0 : -lift * 0.12 }
      }
      return { ...REST, anchor: 0.5, scaleX: 1 - lift * 0.16, scaleY: 1 + lift * 0.32, y: -lift * 0.85 }
    },
    duration: BOUNCE_CROUCH_MS + settle,
  }
}

export type WiggleDirection = 'clockwise' | 'counterClockwise' | 'down' | 'left' | 'right' | 'up' | number

const WIGGLE_SPRING: Spring = { damping: 0.18, response: 0.2 }
const WIGGLE_TRAVEL = 0.09
const WIGGLE_TILT = 5

/**
 * A shake that sets off toward `direction` and swings back past the start,
 * each swing smaller than the last. `left`, `right`, `up` and `down` slide the
 * icon (a number is any other heading, in degrees clockwise from right); the
 * two turning directions rock it about its centre by `angle` degrees.
 */
export const wiggleTrack = (direction: WiggleDirection = 'left', angle = 12): Track => {
  const { at: swing, duration } = kick(WIGGLE_SPRING)

  if (direction === 'clockwise' || direction === 'counterClockwise') {
    const sign = direction === 'clockwise' ? 1 : -1
    return { at: (ms) => ({ ...REST, rotate: sign * angle * swing(ms / 1000) }), duration }
  }

  const heading = typeof direction === 'number'
    ? (direction * Math.PI) / 180
    : { down: Math.PI / 2, left: Math.PI, right: 0, up: -Math.PI / 2 }[direction]
  const dx = Math.cos(heading)
  const dy = Math.sin(heading)
  return {
    at: (ms) => {
      const amount = swing(ms / 1000)
      // A sideways shake leans into it a little, the way a held thing would.
      return { ...REST, rotate: dx * WIGGLE_TILT * amount, x: dx * WIGGLE_TRAVEL * amount, y: dy * WIGGLE_TRAVEL * amount }
    },
    duration,
  }
}

const BREATH_MS = 2400
const BREATH_DEPTH = 0.1

/** One slow breath: swells to a tenth larger and back, easing in and out of both ends. */
export const breatheTrack = (): Track => ({
  at: (ms) => {
    const scale = 1 + (BREATH_DEPTH * (1 - Math.cos((2 * Math.PI * Math.min(ms, BREATH_MS)) / BREATH_MS))) / 2
    return { ...REST, scaleX: scale, scaleY: scale }
  },
  duration: BREATH_MS,
})

/** How fast a breath is changing at `ms` in, in scale a second: what a breath let go mid-way carries. */
export const breathVelocity = (ms: number): number =>
  ((BREATH_DEPTH * Math.PI) / (BREATH_MS / 1000)) * Math.sin((2 * Math.PI * ms) / BREATH_MS)

export type RotateDirection = 'clockwise' | 'counterClockwise'

/** Milliseconds a continuous spin takes for one turn. */
export const TURN_MS = 1000

const SPIN_SPRING: Spring = { damping: 0.6, response: 0.7 }
const LANDING_SPRING: Spring = { damping: 0.45, response: 0.5 }
const SETTLE_SPRING: Spring = { damping: 0.7, response: 0.5 }

/** One turn on a spring: it winds up, swings round past upright and settles back onto it. */
export const turnTrack = (direction: RotateDirection = 'clockwise'): Track => {
  const sign = direction === 'clockwise' ? 1 : -1
  return {
    at: (ms) => ({ ...REST, rotate: sign * springAt(SPIN_SPRING, -360, 0, ms / 1000).value }),
    duration: settleTime(SPIN_SPRING, -360, 0, 0.3) * 1000,
  }
}

/**
 * How a spin stops: it finishes the turn it is on at the speed it was going,
 * then carries on past upright and springs back — the same overshoot a press
 * gets, so stopping looks like something with weight coming to rest.
 *
 * `angle` is how far into its turn the spin is, in degrees.
 */
export const landingTrack = (angle: number, direction: RotateDirection = 'clockwise', speed = 1): Track => {
  const sign = direction === 'clockwise' ? 1 : -1
  const rate = (360 / TURN_MS) * (speed > 0 ? speed : 1)
  const from = ((angle % 360) + 360) % 360
  const remaining = (360 - from) / rate
  const velocity = rate * 1000
  const settle = settleTime(LANDING_SPRING, 0, velocity, 0.3) * 1000

  return {
    at: (ms) => {
      if (ms < remaining) return { ...REST, rotate: sign * (from + rate * ms) }
      const overshoot = springAt(LANDING_SPRING, 0, velocity, (ms - remaining) / 1000).value
      return { ...REST, rotate: sign * (360 + overshoot) }
    },
    duration: remaining + settle,
  }
}

/** A swelling let go at `scale`, changing by `velocity` a second, springing back to its size. */
export const settleTrack = (scale: number, velocity: number): Track => {
  const offset = scale - 1
  return {
    at: (ms) => {
      const value = 1 + springAt(SETTLE_SPRING, offset, velocity, ms / 1000).value
      return { ...REST, scaleX: value, scaleY: value }
    },
    duration: settleTime(SETTLE_SPRING, offset, velocity, 0.001) * 1000,
  }
}

const PULSE_SPRING: Spring = { damping: 0.42, response: 0.32 }

/** A quick give, as if tapped: the icon dips by `depth` of its size and springs back past it. */
export const pulseTrack = (depth = 0.08): Track => {
  const { at, duration } = kick(PULSE_SPRING)
  return {
    at: (ms) => {
      const scale = 1 - depth * at(ms / 1000)
      return { ...REST, scaleX: scale, scaleY: scale }
    },
    duration,
  }
}

/** The track as keyframes, one a frame at 60 fps, for `element.animate`. */
export const trackKeyframes = (track: Track): Keyframe[] => {
  const frames = Math.max(1, Math.ceil((track.duration / 1000) * 60))
  return Array.from({ length: frames + 1 }, (_, index) => ({
    offset: index / frames,
    transform: poseTransform(track.at((index / frames) * track.duration)),
  }))
}

/** A spring from 0 to 1 as samples, one a frame: what a morph eases along. Overshoots past 1 before it settles. */
export const springProgress = (spring: Spring): { duration: number; samples: number[] } => {
  const duration = settleTime(spring, -1, 0, 0.002) * 1000
  const frames = Math.max(1, Math.ceil((duration / 1000) * 60))
  const samples = Array.from({ length: frames + 1 }, (_, index) =>
    index === frames ? 1 : 1 + springAt(spring, -1, 0, (index / frames) * (duration / 1000)).value,
  )
  return { duration, samples }
}

/**
 * How far past each end the dash pattern keeps its pieces. A dash that ends
 * exactly where the stroke starts is a dash of no length, and with round caps
 * that still draws a dot.
 */
const DASH_MARGIN = 1

/**
 * The dash that shows the first `progress` of a stroke `length` units long:
 * all of it at 1, nothing at 0 — not even a cap. The gap is long enough that
 * the next dash never reaches the stroke.
 */
export const dashFor = (length: number, progress: number): { strokeDasharray: string; strokeDashoffset: string } => ({
  strokeDasharray: `${round(length, 3)} ${round(length + 2 * DASH_MARGIN, 3)}`,
  strokeDashoffset: `${round((1 - progress) * (length + DASH_MARGIN), 3)}`,
})

/** How much of a stroke `length` long a dash offset leaves showing, the inverse of `dashFor`. */
export const progressAt = (length: number, offset: number): number => {
  if (!Number.isFinite(offset)) return 1
  return Math.min(1, Math.max(0, 1 - offset / (length + DASH_MARGIN)))
}

/** One stroke to draw: how long it is, and how much of it shows before and after. */
export type DrawItem = { from: number; length: number; to: number }

export type DrawTiming = { delay: number; duration: number }

export type DrawOrder = 'sequential' | 'together'

/** Strokes shorter than this count as this long, so a dot is seen being drawn. */
const SHORTEST_STROKE = 3
/**
 * How far the next stroke starts before the last one ends, as a share of the
 * shorter of the two: the pen is already moving on as it finishes a line, but
 * never so early that a short stroke is done before the long one before it.
 */
const STROKE_OVERLAP = 0.25

/**
 * When each stroke starts and how long it takes, in milliseconds, at `speed`.
 *
 * Drawing on goes in the order the strokes were written; drawing off goes the
 * other way, last stroke first, so Draw Off is Draw On played back. One after
 * another, each stroke takes time in proportion to its length, the way a pen
 * moving at one speed would, with each starting a little before the last has
 * finished. Together, they all run the whole time. A stroke already where it is
 * going gets no time at all.
 *
 * The whole drawing takes longer the more line there is, from about a third of
 * a second for a tick to a second for a busy icon; taking strokes away is
 * quicker than putting them down.
 */
export const planDraw = (
  items: readonly DrawItem[],
  { order = 'sequential', speed = 1 }: { order?: DrawOrder; speed?: number } = {},
): { timings: DrawTiming[]; total: number } => {
  const weights = items.map(({ from, length, to }) => Math.abs(to - from) * Math.max(length, SHORTEST_STROKE))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const timings: DrawTiming[] = items.map(() => ({ delay: 0, duration: 0 }))
  if (totalWeight === 0) return { timings, total: 0 }

  const erasing = items.every(({ from, to }) => to <= from)
  const rate = speed > 0 && Number.isFinite(speed) ? speed : 1
  const span = (erasing
    ? Math.min(700, Math.max(260, 200 + totalWeight * 4.5))
    : Math.min(1100, Math.max(380, 260 + totalWeight * 6.5))) / rate

  if (order === 'together') {
    weights.forEach((weight, index) => {
      if (weight > 0) timings[index] = { delay: 0, duration: span * 0.8 }
    })
    return { timings, total: span * 0.8 }
  }

  const sequence = items.map((_, index) => index)
  if (erasing) sequence.reverse()
  let end = 0
  let previous = 0
  for (const index of sequence) {
    const weight = weights[index]!
    if (weight === 0) continue
    const duration = (span * weight) / totalWeight
    const delay = Math.max(0, end - Math.min(previous, duration) * STROKE_OVERLAP)
    timings[index] = { delay, duration }
    end = delay + duration
    previous = duration
  }

  // Overlapping finished the drawing early; stretch it back to its span.
  const stretch = end > 0 ? span / end : 1
  for (const timing of timings) {
    timing.delay *= stretch
    timing.duration *= stretch
  }
  return { timings, total: span }
}
