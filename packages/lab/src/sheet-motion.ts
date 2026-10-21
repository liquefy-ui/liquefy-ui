import { clamp, SpringValue } from '@liquefy-ui/core'

/**
 * A height the sheet rests at. A percentage, or a number up to 1, is a share
 * of the room the sheet has to grow into; pixels, or a number above 1, are
 * exact.
 */
export type ElasticSheetSnapPoint = number | `${number}%` | `${number}px`

/** A snap point as the pixel height it resolves to, with the point it came from. */
export type SheetStop = {
  height: number
  point: ElasticSheetSnapPoint
}

/** The pixel height `point` asks for in a room `room` pixels tall; NaN for a point it cannot read. */
export const snapHeight = (point: ElasticSheetSnapPoint, room: number): number => {
  if (typeof point === 'number') return point <= 1 ? point * room : point
  const value = Number.parseFloat(point)
  if (point.endsWith('%')) return (value / 100) * room
  if (point.endsWith('px')) return value
  return Number.NaN
}

/**
 * The snap points as whole-pixel heights, shortest first, none taller than the
 * room. A point that comes to nothing — unreadable, or no taller than zero — is
 * dropped, and two that land on the same pixel count once, the first kept.
 */
export const sheetStops = (points: readonly ElasticSheetSnapPoint[], room: number): SheetStop[] => {
  const stops: SheetStop[] = []
  for (const point of points) {
    const height = Math.round(Math.min(snapHeight(point, room), room))
    if (!(height > 0) || stops.some((stop) => stop.height === height)) continue
    stops.push({ height, point })
  }
  return stops.sort((a, b) => a.height - b.height)
}

/** How hard the band resists from the first pixel: a little over half the finger's travel. */
const BAND = 0.55

/**
 * How far an elastic edge gives when pulled `distance` past it: about half the
 * pull at first, then ever less, never more than `reach`. The curve a UIKit
 * scroll view stretches along past its end.
 */
export const rubberBand = (distance: number, reach: number): number => {
  if (distance <= 0 || reach <= 0) return 0
  return reach * (1 - 1 / ((distance * BAND) / reach + 1))
}

/** The share of its speed a flicked scroll view keeps each millisecond: UIKit's normal deceleration. */
const DECELERATION = 0.998

/** How far something let go at `velocity` pixels a second would coast before friction stopped it. */
export const coastDistance = (velocity: number): number => ((velocity / 1000) * DECELERATION) / (1 - DECELERATION)

/**
 * Where a sheet let go at `height` with `velocity` (pixels a second, positive
 * upward) comes to rest, as an index into `stops` (heights, shortest first):
 * the stop nearest to where it would coast to. A slow release settles on the
 * closest stop, a flick carries it on past the next, and a hard one runs to the
 * end. -1 puts it away. That is a stop at zero, only there when `dismissible`,
 * so a flick down from anywhere closes the sheet, as does a slow drag to under
 * half the lowest stop.
 */
export const chooseStop = (
  height: number,
  velocity: number,
  stops: readonly number[],
  dismissible: boolean,
): number => {
  const landing = height + coastDistance(velocity)
  let best = dismissible ? -1 : 0
  let distance = dismissible ? Math.abs(landing) : Number.POSITIVE_INFINITY
  stops.forEach((stop, index) => {
    const away = Math.abs(landing - stop)
    if (away < distance) {
      best = index
      distance = away
    }
  })
  return best
}

/** How far back, in milliseconds, the finger's last moves still say how it left. */
const VELOCITY_WINDOW = 100

/**
 * The speed of a finger at the moment it lifts, from the moves just before.
 * A least-squares slope over the last tenth of a second, so one late or
 * doubled event does not swing it, and a finger that stopped before lifting
 * reads as still. Times are in milliseconds, as events carry them.
 */
export class VelocityTracker {
  private samples: { time: number; value: number }[] = []

  public reset(time: number, value: number): void {
    this.samples = [{ time, value }]
  }

  public add(time: number, value: number): void {
    const last = this.samples.at(-1)
    // An event stamped earlier than the one before it is out of order; it adds nothing true.
    if (last && time < last.time) return
    this.samples.push({ time, value })
    const cutoff = time - VELOCITY_WINDOW
    while (this.samples.length > 2 && this.samples[0]!.time < cutoff) this.samples.shift()
  }

  /** Units a second at `time` (the last sample's time when left out). */
  public velocity(time = this.samples.at(-1)?.time ?? 0): number {
    const recent = this.samples.filter((sample) => sample.time >= time - VELOCITY_WINDOW && sample.time <= time)
    if (recent.length < 2) return 0
    const meanTime = recent.reduce((sum, sample) => sum + sample.time, 0) / recent.length
    const meanValue = recent.reduce((sum, sample) => sum + sample.value, 0) / recent.length
    let covariance = 0
    let variance = 0
    for (const sample of recent) {
      covariance += (sample.time - meanTime) * (sample.value - meanValue)
      variance += (sample.time - meanTime) ** 2
    }
    return variance === 0 ? 0 : (covariance / variance) * 1000
  }
}

export type SheetLimits = {
  /** The tallest stop. Past it the sheet stretches against a rubber band. */
  ceiling: number
  /** The lowest the sheet goes freely. */
  floor: number
  /**
   * Whether the floor gives the way the ceiling does — a sheet that cannot be
   * put away, held at its lowest stop — or is a hard stop, as it is for one on
   * its way out of view.
   */
  elasticFloor: boolean
  /** The most either band gives, in pixels. */
  reach: number
}

export type SheetFrame = {
  /** The top edge's height above the bottom of the room, rubber band applied. */
  height: number
  /** How far the band has let the top edge past the ceiling. */
  stretch: number
  /** How far the band has let it under an elastic floor. */
  squash: number
  /** How far a tongue of glass reaches up from the top edge toward a finger pulling past the ceiling. */
  tongue: number
  /** The jelly's sideways give, in pixels: positive draws the sides in, negative lets them out. */
  wobble: number
}

export type SheetMotionOptions = {
  /**
   * False keeps the jelly and the tongue still — the provider's `motion` off.
   * The edge still follows a finger and gives against the bands, which is the
   * person's own hand moving it rather than an animation.
   */
  liquid?: boolean
  /** 0 to 1, the provider's `wobbliness`: how far the sheet swings past a stop, and how long its sides keep quivering. */
  wobbliness?: number
}

/** The longest frame the motion will count, in seconds. */
const MAX_FRAME = 1 / 30
/** How much of each frame's measured speed the jelly hears: enough to follow a drag, little enough to ignore the jitter of events landing between frames. */
const SMOOTHING = 0.35
/** Sideways give per pixel a second of vertical speed: a hard flick draws the sides in by about seven pixels. */
const JELLY_GAIN = 0.0035
const JELLY_MAX = 9
/** The tongue rises by this share of the distance between the top edge and the finger above it… */
const TONGUE_SHARE = 0.4
/** …up to this many pixels. */
const TONGUE_MAX = 36

/** Puts a spring that has stopped visibly — under a hundredth of a pixel away and slower than a pixel a second — at rest. Returns whether it is. */
const settle = (spring: SpringValue): boolean => {
  if (Math.abs(spring.current - spring.target) > 0.01 || Math.abs(spring.velocity) > 1) return false
  if (spring.current !== spring.target || spring.velocity !== 0) spring.set(spring.target)
  return true
}

/** A damping that gives `ratio` of critical damping on a spring of `stiffness` and unit mass. */
const damped = (ratio: number, stiffness: number): number => 2 * ratio * Math.sqrt(stiffness)

/**
 * The motion behind an elastic sheet, with no DOM attached. The top edge is a
 * spring heading for a stop; while a finger holds it, it is wherever the finger
 * puts it, and on release it carries the finger's speed into the spring. Past
 * the tallest stop, and under the lowest when the sheet cannot be put away, the
 * edge gives against a rubber band.
 *
 * Two more springs make it liquid. The jelly hears how fast the edge moves and
 * draws the sides in while it races and lets them quiver once it stops; the
 * tongue reaches up toward a finger pulling past the top and drops back when
 * let go.
 *
 * Heights are measured up from the bottom of the room. The spring runs on the
 * raw height the finger and the stops speak in; `frame` reads it back out
 * through the bands. Like the other lab timelines, `step` counts at most a
 * thirtieth of a second however long the frame took, so a stall slows the
 * motion down instead of jumping it.
 */
export class SheetMotion {
  private readonly position: SpringValue
  private readonly jelly: SpringValue
  private readonly tongue: SpringValue
  private readonly liquid: boolean
  private limits: SheetLimits
  private holding = false
  private lastHeight: number
  /** The top edge's speed, smoothed over a few frames, in pixels a second. */
  private speed = 0

  public constructor(height: number, limits: SheetLimits, options: SheetMotionOptions = {}) {
    const wobbliness = clamp(options.wobbliness ?? 0.1, 0, 1)
    this.limits = limits
    this.liquid = options.liquid ?? true
    // At the provider's default the edge swings about 8% past a stop and back,
    // which reads as a weight on a spring rather than a panel on rails.
    this.position = new SpringValue(height, { damping: damped(0.64 - wobbliness * 0.34, 280), stiffness: 280 })
    this.jelly = new SpringValue(0, { damping: damped(0.28 - wobbliness * 0.14, 380), stiffness: 380 })
    this.tongue = new SpringValue(0, { damping: damped(0.34 - wobbliness * 0.16, 300), stiffness: 300 })
    this.lastHeight = this.heightAt(height)
  }

  /** The unbanded height: where the finger has put the edge, or where the spring has it. */
  public get raw(): number {
    return this.position.current
  }

  /** Where the spring is heading. */
  public get target(): number {
    return this.position.target
  }

  public get dragging(): boolean {
    return this.holding
  }

  public setLimits(limits: SheetLimits): void {
    this.limits = limits
  }

  /** The height `raw` is drawn at, through the bands. */
  public heightAt(raw: number): number {
    const { ceiling, elasticFloor, floor, reach } = this.limits
    if (raw > ceiling) return ceiling + rubberBand(raw - ceiling, reach)
    if (raw < floor) return elasticFloor ? floor - rubberBand(floor - raw, reach) : floor
    return raw
  }

  /** Holds the edge under a finger at `raw`: unbanded, one pixel for each the finger moves. */
  public hold(raw: number): void {
    this.holding = true
    this.position.set(raw)
  }

  /** Lets go with the finger's `velocity`, in raw pixels a second, heading for `target`. */
  public release(target: number, velocity: number): void {
    this.holding = false
    this.position.setTarget(target)
    this.position.velocity = velocity
  }

  /** Heads for `target` with whatever speed the edge already has. */
  public moveTo(target: number): void {
    this.holding = false
    this.position.setTarget(target)
  }

  /** Puts the edge at `target` and stills everything, for motion off. */
  public jumpTo(target: number): void {
    this.holding = false
    this.position.set(target)
    this.jelly.set(0)
    this.tongue.set(0)
    this.speed = 0
    this.lastHeight = this.heightAt(target)
  }

  /** Advances by one frame of `delta` seconds. Returns whether anything is still moving, or held. */
  public step(delta: number): boolean {
    const seconds = Math.min(Math.max(delta, 0), MAX_FRAME)
    if (seconds === 0) return this.holding || this.speed !== 0 || !this.atRest()

    if (!this.holding) this.position.step(seconds)

    const height = this.heightAt(this.position.current)
    this.speed += ((height - this.lastHeight) / seconds - this.speed) * SMOOTHING
    if (Math.abs(this.speed) < 0.5) this.speed = 0
    this.lastHeight = height

    // Racing upward stretches the sheet, so its sides draw in; when it stops,
    // the spring carries the jelly past straight and the sides quiver.
    this.jelly.setTarget(this.liquid ? clamp(this.speed * JELLY_GAIN, -JELLY_MAX, JELLY_MAX) : 0)
    this.jelly.step(seconds)
    this.tongue.setTarget(this.liquid && this.holding ? this.tongueFor(this.position.current) : 0)
    this.tongue.step(seconds)

    // A spring's tail takes a second or more to fall under a thousandth of a
    // pixel, and every frame of it redraws a sheet of glass. Anything that
    // has stopped visibly is stopped outright.
    if (!this.holding) settle(this.position)
    settle(this.jelly)
    settle(this.tongue)
    return this.holding || this.speed !== 0 || !this.atRest()
  }

  public frame(): SheetFrame {
    const { ceiling, elasticFloor, floor } = this.limits
    const height = this.heightAt(this.position.current)
    return {
      height,
      squash: elasticFloor ? Math.max(0, floor - height) : 0,
      stretch: Math.max(0, height - ceiling),
      tongue: Math.max(0, this.tongue.current),
      wobble: this.jelly.current,
    }
  }

  /**
   * How far the tongue reaches for a finger holding the edge at `raw`: a share
   * of the gap the band opens between the finger and the edge it is pulling.
   */
  private tongueFor(raw: number): number {
    const past = raw - this.limits.ceiling
    if (past <= 0) return 0
    return Math.min(TONGUE_MAX, (past - rubberBand(past, this.limits.reach)) * TONGUE_SHARE)
  }

  private atRest(): boolean {
    return this.position.current === this.position.target && this.position.velocity === 0
      && this.jelly.current === 0 && this.jelly.velocity === 0
      && this.tongue.current === 0 && this.tongue.velocity === 0
  }
}

/** The sheet's place in the room it moves in. */
export type SheetRoom = {
  /** The room's size, in pixels. */
  width: number
  height: number
  /** The widest the sheet gets; a wider room centres it. */
  maxWidth: number
  /** The shortest stop. Under it the sheet slides down whole instead of getting shorter. */
  lowest: number
  /** The tallest stop. */
  ceiling: number
}

/** Edges in the room's pixels. `bottom` can lie under the room, which tucks the lower corners out of sight. */
export type SheetBox = {
  bottom: number
  left: number
  radius: number
  top: number
  width: number
}

/** The gap the sheet floats in from the sides and the bottom while it is short. */
const FLOAT = 8
/** The corner radius at rest. */
const RADIUS = 28
/** The most a stretch draws each side in… */
const NARROW = 14
/** …reaching about two thirds of it this many pixels past the ceiling. */
const NARROW_SCALE = 50
/** The sheet goes from floating to anchored over the last this-many pixels under the ceiling. */
const ANCHOR_RAMP = 120

/**
 * Where the sheet is drawn for a frame. Short, it floats: inset from the sides
 * and the bottom with all four corners round, as iOS 26 draws a sheet at a
 * small detent. It anchors to the sides and the bottom as it reaches the
 * tallest stop. Under the lowest stop it keeps its size and slides out of the
 * room. Stretched past the top it draws its sides in and rounds its corners,
 * as a thick liquid does when pulled; squashed it lets them out; and the jelly
 * quivers them either way.
 */
export const sheetBox = (frame: SheetFrame, room: SheetRoom): SheetBox => {
  const full = Math.min(room.width, room.maxWidth)
  const resting = Math.max(frame.height, room.lowest)
  const ramp = Math.max(1, Math.min(ANCHOR_RAMP, room.ceiling * 0.3))
  const floating = clamp((room.ceiling - resting) / ramp, 0, 1)
  const inset = FLOAT * floating
  const narrow = NARROW * (1 - Math.exp(-frame.stretch / NARROW_SCALE))
  const spread = Math.min(FLOAT, frame.squash * 0.5)
  const side = Math.max(-FLOAT, inset + narrow + frame.wobble - spread)
  const width = Math.max(0, full - side * 2)
  const corner = RADIUS + narrow * 0.8
  const top = room.height - frame.height
  // The bottom edge while the top is at or over the lowest stop: inset from
  // the room's bottom while floating, tucked a corner's depth under it once
  // anchored. Under the lowest stop the whole body moves down with the top.
  const bottom = room.height - inset + corner * (1 - floating) + (resting - frame.height)
  const radius = Math.max(0, Math.min(corner, width / 2, (bottom - top) / 2))
  return { bottom, left: (room.width - full) / 2 + side, radius, top, width }
}
